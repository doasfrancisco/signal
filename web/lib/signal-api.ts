/**
 * Server-side fetch client for the signal backend.
 *
 * Only import this from server components or route handlers — never from
 * a "use client" component, because SIGNAL_API_KEY must stay server-side.
 * For client-side mutations, go through the proxy at /api/signal/*.
 */
import type { ShowData, Task } from "./types";

const API_URL = process.env.SIGNAL_API_URL;
const API_KEY = process.env.SIGNAL_API_KEY;

function requireConfig() {
  if (!API_URL || !API_KEY) {
    throw new Error(
      "SIGNAL_API_URL and SIGNAL_API_KEY must be set. See web/.env.example.",
    );
  }
  return { url: API_URL, key: API_KEY };
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown,
  opts?: { revalidate?: number },
): Promise<T> {
  const { url, key } = requireConfig();
  const init: RequestInit & { next?: { revalidate?: number } } = {
    method,
    headers: {
      "x-api-key": key,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  if (opts?.revalidate !== undefined) init.next = { revalidate: opts.revalidate };

  const res = await fetch(`${url}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${method} ${path}] ${res.status} ${text}`);
  }
  const ctype = res.headers.get("content-type") || "";
  return (ctype.includes("application/json") ? res.json() : res.text()) as Promise<T>;
}

// ---- reads ----

export function fetchShowData(revalidate = 5): Promise<ShowData> {
  return request<ShowData>("GET", "/api/state", undefined, { revalidate });
}

export function fetchTask(id: string): Promise<{ task: Task; parent_id: string | null }> {
  return request("GET", `/api/tasks/${id}`, undefined, { revalidate: 0 });
}

export function fetchContext(): Promise<Record<string, Record<string, unknown>>> {
  return request("GET", "/api/context", undefined, { revalidate: 60 });
}

export function fetchProjects(): Promise<Record<string, unknown>> {
  return request("GET", "/api/projects", undefined, { revalidate: 60 });
}

export function fetchFollowupCandidates(): Promise<unknown[]> {
  return request("GET", "/api/followup-candidates", undefined, { revalidate: 15 });
}

export function fetchInbox(kind: "gmail" | "whatsapp"): Promise<string> {
  return request("GET", `/api/inbox/${kind}`, undefined, { revalidate: 30 });
}

// ---- writes ----

export function postTaskState(id: string, state: string | null, commits?: string[]) {
  return request<Task>("POST", `/api/tasks/${id}/state`, { state, commits });
}

export function postTaskEdit(id: string, fields: Partial<Task>) {
  return request<Task>("POST", `/api/tasks/${id}/edit`, fields);
}

export function postTaskAppend(id: string, field: string, text: string) {
  return request<Task>("POST", `/api/tasks/${id}/append`, { field, text });
}

export function postTaskFocus(id: string, focus: boolean) {
  return request<Task>("POST", `/api/tasks/${id}/focus`, { focus });
}

export function postTaskFollowup(
  id: string,
  body: { who: string; about?: string; message: string; at: string },
) {
  return request<Task>("POST", `/api/tasks/${id}/followup`, body);
}

export function postTaskContextRead(id: string) {
  return request<Task>("POST", `/api/tasks/${id}/context-read`);
}

export function addTask(body: {
  problem: string;
  why?: string;
  solution?: string;
  parent?: string;
  project?: string;
  contacts?: string[];
}) {
  return request<Task>("POST", "/api/tasks", body);
}

export function deleteTask(id: string) {
  return request<{ deleted: string; task: Task }>("DELETE", `/api/tasks/${id}`);
}

export function triggerSync() {
  return request<Record<string, unknown>>("POST", "/api/sync");
}
