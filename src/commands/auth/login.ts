import * as p from "@clack/prompts";
import { readConfig, writeConfig } from "../../config.js";

export async function runLogin(baseUrl?: string) {
  const base = baseUrl ?? readConfig().baseUrl ?? "https://taraspace.space";

  p.intro("  Tara CLI — Login  ");

  p.note(
    `Open this URL in your browser and create an API key:\n\n  ${base}/settings/api-keys`,
    "Step 1"
  );

  const rawKey = await p.password({
    message: "Paste your API key",
    validate(value) {
      if (!value || value.trim().length === 0) return "API key is required.";
      if (!value.trim().startsWith("tara_")) return 'Key must start with "tara_"';
    },
  });

  if (p.isCancel(rawKey)) {
    p.cancel("Login cancelled.");
    process.exit(0);
  }

  const spinner = p.spinner();
  spinner.start("Verifying key...");

  try {
    const res = await fetch(`${base}/api/api-keys`, {
      headers: { Authorization: `Bearer ${rawKey.trim()}` },
    });

    if (!res.ok) {
      spinner.stop("Verification failed.");
      p.outro("✗ Invalid API key. Go to /settings/api-keys and try again.");
      process.exit(1);
    }

    writeConfig({ ...readConfig(), apiKey: rawKey.trim(), baseUrl: base });
    spinner.stop("Key verified.");
    p.outro(`✓ Logged in. Config saved to ~/.tara/config.json`);
  } catch {
    spinner.stop("Could not connect.");
    p.outro(`✗ Could not reach ${base} — is the server running?`);
    process.exit(1);
  }
}
