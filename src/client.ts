import { getApiKey, getBaseUrl } from "./config.js";

export class TaraAPIError extends Error {
  constructor(
    public message: string,
    public status: number,
  ) {
    super(message);
  }
}

function exitCodeForStatus(status: number): number {
  if (status === 401 || status === 403) return 3;
  if (status === 409) return 4;
  if (status >= 500 || status === 429) return 5;
  if (status >= 400) return 2;
  return 1;
}

export function markCommandFailure(error: unknown): void {
  if (error instanceof TaraAPIError) {
    process.exitCode = exitCodeForStatus(error.status);
    return;
  }

  process.exitCode = error instanceof TypeError ? 5 : 1;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    markCommandFailure(error);
    throw error;
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = data as { error?: string; message?: string } | null;
    const error = new TaraAPIError(
      err?.message ?? err?.error ?? `HTTP ${res.status}`,
      res.status,
    );
    markCommandFailure(error);
    throw error;
  }

  return data as T;
}

export async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<T> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: formData,
    });
  } catch (error) {
    markCommandFailure(error);
    throw error;
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = data as { error?: string; message?: string } | null;
    const error = new TaraAPIError(
      err?.message ?? err?.error ?? `HTTP ${res.status}`,
      res.status,
    );
    markCommandFailure(error);
    throw error;
  }

  return data as T;
}
