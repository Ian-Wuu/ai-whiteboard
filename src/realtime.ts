import { useCallback, useEffect, useRef, useState } from "react";
import { boardSummary } from "./core";
import { validateToolArguments } from "./schemas";
import { useBoardStore } from "./store";
import type { BoardEvent, BoardOperation } from "./types";

type VoiceStatus = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToInt16(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new Int16Array(bytes.buffer);
}

function resampleTo16k(input: Float32Array, inputRate: number) {
  const ratio = inputRate / 16_000;
  const output = new Int16Array(Math.floor(input.length / ratio));
  for (let index = 0; index < output.length; index++) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.floor((index + 1) * ratio));
    let total = 0;
    for (let source = start; source < end; source++) total += input[source];
    const sample = Math.max(-1, Math.min(1, total / Math.max(1, end - start)));
    output[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

export function useRealtime() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState("");
  const [liveCaption, setLiveCaption] = useState("");
  const [model, setModel] = useState("");
  const [activity, setActivity] = useState("");
  const connectingRef = useRef(false);
  const generationRef = useRef(0);
  const playbackRef = useRef(0);
  const responseDoneRef = useRef(true);
  const socketRef = useRef<WebSocket | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextAudioAtRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const assistantTextRef = useRef("");

  const addTranscript = useBoardStore((state) => state.addTranscript);
  const applyAiOps = useBoardStore((state) => state.applyAiOps);
  const advanceBoard = useBoardStore((state) => state.advanceBoard);

  const clearPlayback = useCallback(() => {
    playbackRef.current += 1;
    for (const source of sourcesRef.current) {
      try { source.stop(); } catch { /* already stopped */ }
    }
    sourcesRef.current.clear();
    nextAudioAtRef.current = 0;
  }, []);

  const release = useCallback(() => {
    generationRef.current += 1;
    connectingRef.current = false;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket) { socket.onclose = null; socket.onerror = null; socket.onmessage = null; socket.close(); }
    if (processorRef.current) { processorRef.current.onaudioprocess = null; processorRef.current.disconnect(); processorRef.current = null; }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    clearPlayback();
    for (const context of [inputContextRef.current, outputContextRef.current]) {
      if (context && context.state !== "closed") void context.close().catch(() => {});
    }
    inputContextRef.current = outputContextRef.current = null;
    assistantTextRef.current = "";
    setLiveCaption("");
    setActivity("");
  }, [clearPlayback]);

  const send = useCallback((payload: unknown) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const playPcm = useCallback(async (encoded: string) => {
    const context = outputContextRef.current;
    if (!context || context.state === "closed") return;
    const epoch = playbackRef.current;
    await context.resume();
    if (epoch !== playbackRef.current) return;
    const samples = base64ToInt16(encoded);
    const buffer = context.createBuffer(1, samples.length, 24_000);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) channel[index] = samples[index] / 0x8000;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime + 0.02, nextAudioAtRef.current);
    nextAudioAtRef.current = startAt + buffer.duration;
    sourcesRef.current.add(source);
    source.onended = () => {
      sourcesRef.current.delete(source);
      if (epoch === playbackRef.current && sourcesRef.current.size === 0 && responseDoneRef.current) setStatus("listening");
    };
    source.start(startAt);
  }, []);

  const handleTool = useCallback((event: Record<string, unknown>) => {
    const name = String(event.name ?? "");
    const callId = String(event.call_id ?? "");
    let rawArgs: unknown;
    try {
      rawArgs = JSON.parse(String(event.arguments ?? "{}"));
    } catch {
      send({ type: "client.tool_result", callId, output: { ok: false, error: "invalid_arguments" } });
      return;
    }
    const validated = validateToolArguments(name, rawArgs);
    if (!validated.success) {
      send({ type: "client.tool_result", callId, output: { ok: false, error: validated.error } });
      return;
    }
    const args = validated.data as Record<string, unknown>;

    window.dispatchEvent(new Event("blackboard:flush"));
    const state = useBoardStore.getState();
    if (name === "get_board_state") {
      const boardId = String(args.boardId ?? state.session.liveBoardId);
      const board = state.session.boards[boardId];
      send({
        type: "client.tool_result",
        callId,
        output: board ? { ok: true, board: boardSummary(board) } : { ok: false, error: "board_not_found" },
      });
      return;
    }
    if (name === "apply_board_ops") {
      const boardId = String(args.boardId ?? state.session.liveBoardId);
      const result = applyAiOps(
        boardId,
        Number(args.expectedBoardRevision),
        args.ops as BoardOperation[],
      );
      send({
        type: "client.tool_result",
        callId,
        output: result.ok
          ? { ok: true, board: boardSummary(result.board) }
          : { ok: false, error: result.error, board: boardSummary(result.board) },
      });
      return;
    }
    if (name === "advance_board") {
      if (args.fromBoardId && args.fromBoardId !== state.session.liveBoardId) {
        send({ type: "client.tool_result", callId, output: { ok: false, error: "not_live_board" } });
        return;
      }
      const board = advanceBoard(String(args.fromBoardId ?? state.session.liveBoardId), String(args.title ?? "继续"));
      send({ type: "client.tool_result", callId, output: { ok: true, board: boardSummary(board) } });
      return;
    }
    send({ type: "client.tool_result", callId, output: { ok: false, error: "unknown_tool" } });
  }, [advanceBoard, applyAiOps, send]);

  const handleMessage = useCallback((message: MessageEvent<string>) => {
    const event = JSON.parse(message.data) as Record<string, unknown>;
    const type = String(event.type ?? "");
    if (type === "relay.connected") {
      connectingRef.current = false;
      setModel(String(event.model ?? ""));
      setStatus("listening");
    } else if (type === "relay.activity") {
      setActivity(String(event.message ?? ""));
    } else if (type === "relay.closed") {
      release();
      setError("语音连接已断开，黑板已保留。点击开始对话可重新连接。");
      setStatus("error");
    } else if (type === "relay.error" || type === "error") {
      const nested = event.error as Record<string, unknown> | undefined;
      release();
      setError(String(event.message ?? nested?.message ?? "实时语音发生错误"));
      setStatus("error");
    } else if (type === "input_audio_buffer.speech_started") {
      clearPlayback();
      setStatus("listening");
    } else if (type === "input_audio_buffer.speech_stopped" || type === "response.created") {
      responseDoneRef.current = false;
      setStatus("thinking");
    } else if (type === "conversation.item.input_audio_transcription.delta") {
      setLiveCaption(`${event.text ?? ""}${event.stash ?? ""}`);
    } else if (type === "conversation.item.input_audio_transcription.completed") {
      const text = String(event.transcript ?? "").trim();
      setLiveCaption("");
      if (text) {
        const session = useBoardStore.getState().session;
        addTranscript({
          role: "user",
          text,
          boardId: session.liveBoardId,
          turnId: String(event.item_id ?? crypto.randomUUID()),
        });
      }
    } else if (type === "response.audio_transcript.delta") {
      assistantTextRef.current += String(event.delta ?? "");
      setLiveCaption(assistantTextRef.current);
      setStatus("speaking");
    } else if (type === "response.audio.delta") {
      setStatus("speaking");
      void playPcm(String(event.delta ?? "")).catch(() => { setError("声音播放失败，请结束对话后重试。"); });
    } else if (type === "response.audio_transcript.done") {
      const text = String(event.transcript ?? assistantTextRef.current).trim();
      setLiveCaption("");
      assistantTextRef.current = "";
      if (text) {
        const session = useBoardStore.getState().session;
        addTranscript({
          role: "assistant",
          text,
          boardId: session.liveBoardId,
          turnId: String(event.item_id ?? crypto.randomUUID()),
        });
      }
    } else if (type === "response.function_call_arguments.done") {
      handleTool(event);
    } else if (type === "response.done") {
      responseDoneRef.current = true;
      if (!sourcesRef.current.size) setStatus("listening");
    }
  }, [addTranscript, clearPlayback, handleTool, playPcm, release]);

  const connect = useCallback(async () => {
    if (connectingRef.current || socketRef.current) return;
    connectingRef.current = true;
    const generation = ++generationRef.current;
    setError("");
    setStatus("connecting");
    try {
      const output = new AudioContext({ sampleRate: 24_000 });
      outputContextRef.current = output;
      void output.resume().catch(() => {});
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (generation !== generationRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const context = new AudioContext();
      inputContextRef.current = context;
      await context.resume();
      if (generation !== generationRef.current) return;
      const source = context.createMediaStreamSource(stream);
      // ponytail: ScriptProcessor keeps this POC small; switch to AudioWorklet if measured latency or browser support fails.
      const processor = context.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      const silent = context.createGain();
      silent.gain.value = 0;
      source.connect(processor);
      processor.connect(silent);
      silent.connect(context.destination);

      const protocol = location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${location.host}/api/realtime`);
      socketRef.current = socket;
      socket.onmessage = handleMessage;
      socket.onerror = () => {
        release();
        setError("无法连接本地语音服务，请确认后端正在运行。");
        setStatus("error");
      };
      socket.onclose = () => { release(); setError("语音连接已断开，点击开始对话重连。"); setStatus("error"); };
      processor.onaudioprocess = (audioEvent) => {
        if (socket.readyState !== WebSocket.OPEN || connectingRef.current) return;
        const pcm = resampleTo16k(audioEvent.inputBuffer.getChannelData(0), context.sampleRate);
        send({ type: "client.audio", audio: bytesToBase64(new Uint8Array(pcm.buffer)) });
      };
    } catch (reason) {
      if (generation !== generationRef.current) return;
      release();
      setError(reason instanceof Error ? reason.message : "无法取得麦克风权限");
      setStatus("error");
    }
  }, [handleMessage, send, release]);

  const disconnect = useCallback(() => {
    release();
    setError("");
    setStatus("idle");
  }, [release]);

  const cancel = useCallback(() => {
    clearPlayback();
    send({ type: "client.cancel" });
    setStatus("listening");
  }, [clearPlayback, send]);

  const sendBoardEvent = useCallback((event: BoardEvent, respond = false) => {
    const board = useBoardStore.getState().session.boards[event.boardId];
    if (!board) return;
    send({
      type: "client.context",
      respond,
      text: `用户刚刚完成黑板操作。事件：${JSON.stringify(event)}。最新黑板：${JSON.stringify(boardSummary(board))}`,
    });
  }, [send]);

  const injectLiveBoard = useCallback(() => {
    const session = useBoardStore.getState().session;
    send({
      type: "client.context",
      respond: false,
      text: `这是当前 LIVE 黑板的最新状态：${JSON.stringify(boardSummary(session.boards[session.liveBoardId]))}`,
    });
  }, [send]);

  useEffect(() => disconnect, [disconnect]);

  return { status, error, liveCaption, activity, model, connect, disconnect, cancel, sendBoardEvent, injectLiveBoard };
}
