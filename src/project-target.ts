import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getBaseUrl } from "./config.js";

export const targetPath = () => resolve(".tara-project.json");
export function readTarget(): { projectId: string; baseUrl: string } {
  const target = JSON.parse(readFileSync(targetPath(), "utf8")) as { projectId?: unknown; baseUrl?: unknown };
  if (typeof target.projectId !== "string" || !target.projectId || typeof target.baseUrl !== "string") throw new Error("Invalid .tara-project.json. Run tara use <project>.");
  if (target.baseUrl !== getBaseUrl()) throw new Error("Current project belongs to a different server. Run tara use <project> on this server.");
  return { projectId: target.projectId, baseUrl: target.baseUrl };
}

export function resolveProjectPath(path: string): string {
  if (!/^\/api\/studio\/projects\/(?:%40current|@current)(?=\/|$)/i.test(path)) return path;
  return path.replace(/^(\/api\/studio\/projects\/)(?:%40current|@current)/i, (_, prefix: string) => prefix + encodeURIComponent(readTarget().projectId));
}
