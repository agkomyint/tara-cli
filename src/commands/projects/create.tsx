import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type CreateProjectProps = {
  name: string;
  description?: string;
};

type Project = { id: string; name: string };

function CreateProjectApp({ name, description }: CreateProjectProps) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; project: Project }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<{ project: Project }>("/api/studio/projects", {
      method: "POST",
      body: JSON.stringify({ name, description: description ?? "" }),
    })
      .then((data) => setState({ status: "done", project: data.project }))
      .catch((err) =>
        setState({ status: "error", message: err instanceof TaraAPIError ? err.message : String(err) }),
      );
  }, [name, description]);

  if (state.status === "loading") return <Text color="yellow">Creating project...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column">
      <Text color="green">✓ Created project: <Text bold>{state.project.name}</Text></Text>
      <Text dimColor>ID: {state.project.id}</Text>
      <Text dimColor>Open canvas: tara canvas get {state.project.id}</Text>
    </Box>
  );
}

export async function runProjectsCreate(name: string, description?: string) {
  const { waitUntilExit } = render(<CreateProjectApp name={name} description={description} />);
  await waitUntilExit();
}
