import React, { useEffect, useState } from "react";
import { render, Text, Box } from "ink";
import { apiRequest, TaraAPIError } from "../../client.js";
import { getBaseUrl } from "../../config.js";

type Props = {
  projectId: string;
  private?: boolean;
};

type ShareResponse = {
  success: boolean;
  project: {
    isPublic: boolean;
    publicSlug: string | null;
    publishedAt: string | null;
  };
};

function ShareProjectApp({ projectId, private: makePrivate }: Props) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "done"; isPublic: boolean; publicSlug: string | null }
    | { status: "error"; message: string }
  >({ status: "loading" });

  useEffect(() => {
    apiRequest<ShareResponse>("/api/studio/projects", {
      method: "PATCH",
      body: JSON.stringify({
        projectId,
        isPublic: !makePrivate,
      }),
    })
      .then((data) =>
        setState({
          status: "done",
          isPublic: data.project.isPublic,
          publicSlug: data.project.publicSlug,
        }),
      )
      .catch((err) =>
        setState({
          status: "error",
          message: err instanceof TaraAPIError ? err.message : String(err),
        }),
      );
  }, [projectId, makePrivate]);

  if (state.status === "loading") return <Text color="yellow">Updating project visibility...</Text>;
  if (state.status === "error") return <Text color="red">× {state.message}</Text>;

  const baseUrl = getBaseUrl();
  const publicUrl = state.publicSlug
    ? `${baseUrl}/project/${state.publicSlug}`
    : `${baseUrl}/share/${projectId}`;

  if (!state.isPublic) {
    return <Text color="yellow">✓ Project is now private.</Text>;
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green">✓ Project is public!</Text>
      <Box gap={1}>
        <Text bold>Share URL:</Text>
        <Text color="cyan">{publicUrl}</Text>
      </Box>
    </Box>
  );
}

export async function runProjectsShare(projectId: string, options: { private?: boolean }) {
  const { waitUntilExit } = render(
    <ShareProjectApp projectId={projectId} private={options.private} />,
  );
  await waitUntilExit();
}
