import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ImageCandidate = {
  title: string;
  imageUrl: string;
  sourceUrl: string;
  sourceDomain: string;
};

function isPrivateAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized.startsWith("::ffff:7f") || normalized.startsWith("::ffff:a") || normalized.startsWith("::ffff:c0a8") || normalized.startsWith("::ffff:ac1")) return true;
  if (normalized.startsWith("::ffff:")) return isPrivateAddress(normalized.slice(7));
  if (normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("ff") || normalized.startsWith("2001:db8")) return true;
  const parts = normalized.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

export function isSafePublicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname) return false;
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) return false;
    return !isIP(hostname) || !isPrivateAddress(hostname);
  } catch {
    return false;
  }
}

export function normalizeSearchResults(value: unknown, maxResults: number): ImageCandidate[] {
  if (!Array.isArray(value)) return [];
  const candidates: ImageCandidate[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const imageUrl = String(record.url ?? "");
    if (!isSafePublicHttpsUrl(imageUrl)) continue;
    if (candidates.some((item) => item.imageUrl === imageUrl)) continue;
    const url = new URL(imageUrl);
    candidates.push({
      title: String(record.title ?? "参考图片").trim().slice(0, 160) || "参考图片",
      imageUrl,
      sourceUrl: imageUrl,
      sourceDomain: url.hostname.replace(/^www\./, ""),
    });
    if (candidates.length >= maxResults * 3) break;
  }
  return candidates;
}

async function resolvesPublicly(hostname: string) {
  const results = await lookup(hostname, { all: true });
  return results.length > 0 && results.every(({ address }) => !isPrivateAddress(address));
}

async function verifyImage(candidate: ImageCandidate, signal?: AbortSignal): Promise<ImageCandidate | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    let url = candidate.imageUrl;
    for (let redirects = 0; redirects < 4; redirects += 1) {
      const parsed = new URL(url);
      if (!isSafePublicHttpsUrl(url) || !(await resolvesPublicly(parsed.hostname))) return undefined;
      const response = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
        headers: { Accept: "image/jpeg,image/png,image/webp,image/gif", Range: "bytes=0-0" },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) return undefined;
        url = new URL(location, url).toString();
        continue;
      }
      const contentType = response.headers.get("content-type")?.split(";")[0].trim() ?? "";
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(contentType);
      const contentRange = response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
      const size = Number(contentRange ?? response.headers.get("content-length") ?? 0);
      await response.body?.cancel();
      if (!response.ok || !allowed || !size || size > 10 * 1024 * 1024) return undefined;
      const final = new URL(url);
      return { ...candidate, imageUrl: url, sourceUrl: url, sourceDomain: final.hostname.replace(/^www\./, "") };
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchReferenceImages(options: {
  apiKey: string;
  workspaceId: string;
  model: string;
  query: string;
  maxResults: number;
  signal?: AbortSignal;
}) {
  const timeout = AbortSignal.timeout(25_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const endpoint = `https://${options.workspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/responses`;
  const response = await fetch(endpoint, {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      input: `为黑板讲解搜索真实参考图片：${options.query}`,
      tools: [{ type: "web_search_image" }],
    }),
  });
  if (!response.ok) throw new Error(`image_search_http_${response.status}`);
  const body = await response.json() as { output?: Array<Record<string, unknown>> };
  const call = body.output?.find((item) => item.type === "web_search_image_call");
  if (!call || typeof call.output !== "string") throw new Error("image_search_no_results");
  const normalized = normalizeSearchResults(JSON.parse(call.output), options.maxResults);
  const verified = await Promise.all(normalized.map((candidate) => verifyImage(candidate, signal)));
  return verified.filter((item): item is ImageCandidate => Boolean(item)).slice(0, options.maxResults);
}
