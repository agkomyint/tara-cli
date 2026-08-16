import { apiRequest } from "../../client.js";

type Project = { id: string; name: string; tags: string[] };

export async function runProjectsCreate(name: string, options: { description?: string; tags?: string }) {
  const tags = parseTags(options.tags);
  const data = await apiRequest<{ project: Project }>("/api/studio/projects", {
    method: "POST",
    body: JSON.stringify({ name, description: options.description ?? "", tags }),
  });
  process.stdout.write(`Created project: ${data.project.name}\nID: ${data.project.id}\nTags: ${data.project.tags.join(", ") || "none"}\nOpen canvas: tara canvas get ${data.project.id}\n`);
}

export function parseTags(value?: string) {
  const tags = [...new Set((value ?? "").split(",").map((tag) => tag.trim().toLocaleLowerCase()).filter(Boolean))];
  if (tags.length > 12) throw new Error("Projects support up to 12 tags.");
  if (tags.some((tag) => tag.length > 40)) throw new Error("Each project tag must be 40 characters or fewer.");
  return tags;
}
