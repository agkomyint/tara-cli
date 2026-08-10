import { getApiKey, getBaseUrl } from "./config.js";

export class TaraAPIError extends Error {
  constructor(
    public message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...options.headers,
    },
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = data as { error?: string; message?: string } | null;
    throw new TaraAPIError(
      err?.message ?? err?.error ?? `HTTP ${res.status}`,
      res.status,
    );
  }

  return data as T;
}
