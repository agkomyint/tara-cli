import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput, useApp, type Key } from "ink";
import { readConfig, writeConfig } from "../../config.js";

type LoginProps = {
  baseUrl?: string;
};

function LoginApp({ baseUrl }: LoginProps) {
  const [step, setStep] = useState<"intro" | "paste" | "verifying" | "done" | "error">("intro");
  const [apiKey, setApiKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const { exit } = useApp();

  useEffect(() => {
    if (step === "intro") {
      const url = `${baseUrl ?? "http://localhost:3000"}/settings/api-keys`;
      console.log(`\n  Open this URL in your browser to create an API key:\n\n  ${url}\n`);
      setTimeout(() => setStep("paste"), 0);
    }
  }, [step, baseUrl]);

  useInput((input: string, key: Key) => {
    if (step === "paste") {
      if (key.return) {
        setStep("verifying");
      } else if (key.backspace || key.delete) {
        setApiKey((prev) => prev.slice(0, -1));
      } else if (input) {
        setApiKey((prev) => prev + input);
      }
    }
  });

  useEffect(() => {
    if (step === "verifying") {
      fetch(`${baseUrl ?? "http://localhost:3000"}/api/api-keys`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
        .then((res) => {
          if (res.ok) {
            writeConfig({ ...readConfig(), apiKey, ...(baseUrl ? { baseUrl } : {}) });
            setStep("done");
            setTimeout(() => exit(), 1000);
          } else {
            setErrorMsg("Invalid API key. Check and try again.");
            setStep("error");
          }
        })
        .catch(() => {
          setErrorMsg("Could not reach the Tara server. Is it running?");
          setStep("error");
        });
    }
  }, [step, apiKey, baseUrl, exit]);

  if (step === "paste") {
    return (
      <Box flexDirection="column" gap={1}>
        <Text color="cyan">Paste your API key and press Enter:</Text>
        <Text dimColor>(key will be hidden as you type)</Text>
      </Box>
    );
  }

  if (step === "verifying") {
    return <Text color="yellow">Verifying key...</Text>;
  }

  if (step === "done") {
    return <Text color="green">✓ Logged in successfully. API key saved to ~/.tara/config.json</Text>;
  }

  if (step === "error") {
    return <Text color="red">× {errorMsg}</Text>;
  }

  return <Text>Initializing...</Text>;
}

export async function runLogin(baseUrl?: string) {
  const { waitUntilExit } = render(<LoginApp baseUrl={baseUrl} />);
  await waitUntilExit();
}
