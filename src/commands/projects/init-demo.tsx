import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type Props = {
  name?: string;
};

type ProjectResponse = {
  project: {
    id: string;
    name: string;
  };
};

function InitDemoApp({ name }: Props) {
  const [state, setState] = useState<
    | { status: "loading"; message: string }
    | { status: "done"; projectId: string; name: string }
    | { status: "error"; message: string }
  >({ status: "loading", message: "Creating project..." });

  useEffect(() => {
    async function run() {
      try {
        const projectName = name ?? "Hello World Canvas";
        // 1. Create project
        const projectRes = await apiRequest<ProjectResponse>("/api/studio/projects", {
          method: "POST",
          body: JSON.stringify({
            name: projectName,
            description: "Created via Tara CLI",
          }),
        });

        const projectId = projectRes.project.id;
        setState({ status: "loading", message: "Adding Hello World note to canvas..." });

        const helloNode = {
          id: crypto.randomUUID(),
          type: "note",
          text: "👋 Hello World from Tara CLI!",
          x: 160,
          y: 120,
          color: "sun",
        };
        await apiRequest(`/api/studio/projects/${encodeURIComponent(projectId)}/canvas/nodes`, {
          method: "POST",
          body: JSON.stringify({ node: helloNode, idempotencyKey: helloNode.id }),
        });

        setState({ status: "done", projectId, name: projectName });
      } catch (err) {
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        });
      }
    }
    void run();
  }, [name]);

  if (state.status === "loading") return <Text color="yellow">{state.message}</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Project &quot;{state.name}&quot; created with Hello World note!</Text>
      <Text dimColor>Project ID: {state.projectId}</Text>
      <Text dimColor>View canvas: tara canvas get {state.projectId}</Text>
      <Text dimColor>Share project: tara share {state.projectId}</Text>
    </Box>
  );
}

export async function runInitDemo(name?: string) {
  const { waitUntilExit } = render(<InitDemoApp name={name} />);
  await waitUntilExit();
}
