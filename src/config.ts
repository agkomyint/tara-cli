import { homedir } from "os";
import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

const CONFIG_DIR = join(homedir(), ".tara");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export type TaraConfig = {
  apiKey?: string;
  baseUrl?: string;
};

export function readConfig(): TaraConfig {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8")) as TaraConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: TaraConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getBaseUrl(): string {
  return readConfig().baseUrl ?? "http://localhost:3000";
}

export function getApiKey(): string | undefined {
  return readConfig().apiKey;
}
