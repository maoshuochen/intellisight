import { supabase } from "./supabase";
import { demoRequest } from "./demoApi";
import { env } from "./env";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (env.demoMode) return demoRequest<T>(path, init);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(formatApiError(response.status, response.statusText, payload?.error?.message));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function formatApiError(status: number, statusText: string, message?: string) {
  const raw = message ?? "";
  const lower = raw.toLowerCase();
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to make this change in the selected project.";
  if (status === 404) return "The requested project item was not found. Refresh and try again.";
  if (status === 500 && (lower.includes("relation") || lower.includes("column") || lower.includes("schema"))) {
    return "The database schema is out of date. Apply the latest Supabase migrations, then refresh this page.";
  }
  if (status === 500) return raw && raw !== "Internal Server Error" ? raw : "The server hit an unexpected error. Check the API logs or database migration status.";
  return raw || `Request failed: ${status} ${statusText}`;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" })
};
