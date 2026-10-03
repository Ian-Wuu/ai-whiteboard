import { execFileSync, spawn } from "node:child_process";
import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pidFile = resolve(root, ".ai-blackboard.pid");
const logFile = resolve(root, ".ai-blackboard.log");

function running(pid) {
  try { process.kill(pid, 0); return true; } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

function owned(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1 || !running(pid)) return false;
  const command = execFileSync("/bin/ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
  const cwd = execFileSync("/usr/sbin/lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], { encoding: "utf8" });
  const group = execFileSync("/bin/ps", ["-p", String(pid), "-o", "pgid="], { encoding: "utf8" });
  return command.includes("pnpm") && command.trim().endsWith("dev") && cwd.split("\n").includes(`n${root}`) && Number(group.trim()) === pid;
}

function savedPid() {
  if (!existsSync(pidFile)) return 0;
  return Number(readFileSync(pidFile, "utf8")) || 0;
}

async function stop() {
  const pid = savedPid();
  if (pid && running(pid)) {
    if (!owned(pid)) throw new Error("保存的进程不是本项目启动的，未关闭其他程序。");
    process.kill(-pid, "SIGTERM");
    for (let attempt = 0; attempt < 40 && running(pid); attempt++) await new Promise((done) => setTimeout(done, 100));
    if (running(pid)) throw new Error("服务尚未退出，请稍后再次双击关闭。");
  }
  rmSync(pidFile, { force: true });
  console.log("AI Blackboard 已关闭。");
}

async function start() {
  const previous = savedPid();
  if (previous && running(previous) && !owned(previous)) throw new Error("启动记录对应其他进程，已停止操作以免误关闭程序。");
  if (!previous || !running(previous)) {
    rmSync(pidFile, { force: true });
    const log = openSync(logFile, "a");
    const child = spawn("pnpm", ["dev"], {
      cwd: root,
      detached: true,
      stdio: ["ignore", log, log],
    });
    child.on("error", () => { console.error("找不到 pnpm，请先安装项目依赖。"); process.exitCode = 1; });
    closeSync(log);
    child.unref();
    if (!child.pid) throw new Error("启动失败：请确认 Node.js 与 pnpm 已安装。");
    writeFileSync(pidFile, String(child.pid));
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const [response, healthResponse] = await Promise.all([
        fetch("http://127.0.0.1:5173/", { signal: AbortSignal.timeout(2000) }),
        fetch("http://127.0.0.1:5173/api/health", { signal: AbortSignal.timeout(2000) }),
      ]);
      const health = await healthResponse.json();
      if (response.ok && health.ok && health.app === "ai-blackboard") {
        if (!process.argv.includes("--no-open")) spawn("open", ["http://127.0.0.1:5173/"], { detached: true, stdio: "ignore" }).unref();
        console.log("AI Blackboard 已打开。");
        return;
      }
    } catch { /* 等待本地服务启动 */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  console.error("启动超时。请把 .ai-blackboard.log 发给 Codex 检查。");
  process.exitCode = 1;
}

try {
  if (process.argv[2] === "stop") await stop();
  else await start();
} catch (error) {
  console.error(`操作未完成：${error.message}`);
  process.exitCode = 1;
}
