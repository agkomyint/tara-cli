import { apiRequest } from "../../client.js";
import { parseTags } from "./create.js";

type UpdatedProject = {
  id: string;
  tags: string[];
  isPublic: boolean;
  publicSlug: string | null;
  publishedAt: string | null;
};

export async function runProjectsUpdate(projectId: string, options: { name?: string; description?: string; tags?: string; json?: boolean }) {
  if (options.name === undefined && options.description === undefined && options.tags === undefined) throw new Error("Provide --name, --description, or --tags.");
  const result = await apiRequest<{ success: boolean; project: UpdatedProject }>("/api/studio/projects", {
    method: "PATCH",
    body: JSON.stringify({
      projectId,
      ...(options.name !== undefined ? { name: options.name } : {}),
      ...(options.description !== undefined ? { description: options.description } : {}),
      ...(options.tags !== undefined ? { tags: parseTags(options.tags) } : {}),
    }),
  });
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`Updated project ${result.project.id}.\nTags: ${result.project.tags.join(", ") || "none"}\n`);
}
