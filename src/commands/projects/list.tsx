import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";

type Project = {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

function ProjectsListApp() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; projects: Project[] }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<{ projects: Project[] }>("/api/studio/projects")
      .then((data) => setState({ status: "done", projects: data.projects }))
      .catch((err) =>
        setState({ status: "error", message: err instanceof TaraAPIError ? err.message : String(err) }),
      );
  }, []);

  if (state.status === "loading") return <Text color="yellow">Loading projects...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  const { projects } = state;

  if (projects.length === 0) {
    return <Text dimColor>No projects found. Create one with: tara projects create &quot;My Project&quot;</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Box gap={3}>
        <Text bold color="cyan">NAME{" ".repeat(30)}</Text>
        <Text bold color="cyan">ID</Text>
      </Box>
      {projects.map((p) => (
        <Box key={p.id} gap={3}>
          <Text>{p.pinned ? "★ " : "  "}{p.name.padEnd(32).slice(0, 32)}</Text>
          <Text dimColor>{p.id}</Text>
        </Box>
      ))}
      <Text dimColor>\n{projects.length} project{projects.length !== 1 ? "s" : ""}</Text>
    </Box>
  );
}

export async function runProjectsList() {
  const { waitUntilExit } = render(<ProjectsListApp />);
  await waitUntilExit();
}
