import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Config = {
  apiKey: string;
  workspaceId: string;
  model: string;
  imageSearchModel: string;
  port: number;
};

function parseCsv(filePath: string): Record<string, string> {
  const rows = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  return Object.fromEntries(rows.filter(Boolean).map((row) => {
    const comma = row.indexOf(",");
    return [row.slice(0, comma), row.slice(comma + 1)];
  }));
}

export function loadConfig(): Config {
  const envPath = resolve(".env");
  if (existsSync(envPath)) process.loadEnvFile(envPath);
  const csvPath = resolve("默认业务空间-apiKey-6641244.csv");
  const csv = existsSync(csvPath) ? parseCsv(csvPath) : {};
  const apiKey = process.env.DASHSCOPE_API_KEY || csv.apiKey;
  const workspaceId = process.env.DASHSCOPE_WORKSPACE_ID || csv.workspaceId;
  if (!apiKey || !workspaceId) {
    throw new Error("缺少百炼 API Key 或 Workspace ID。请配置 .env 或保留本地 CSV。 ");
  }
  return {
    apiKey,
    workspaceId,
    model: process.env.DASHSCOPE_MODEL || "qwen-audio-3.0-realtime-flash",
    imageSearchModel: process.env.DASHSCOPE_IMAGE_SEARCH_MODEL || "qwen3.6-flash",
    port: Number(process.env.PORT || 8787),
  };
}
