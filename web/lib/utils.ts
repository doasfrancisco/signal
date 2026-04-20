import type { Task, TaskState, ShowData } from "./types";

export function truncate(s: string | undefined, max = 60): string {
  if (!s) return "";
  const clean = s.replace(/\n/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "\u2026" : clean;
}

export function fmtShort(iso: string | undefined): string {
  if (!iso) return "?";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function isWeekend(iso: string): boolean {
  const d = new Date(iso + "T00:00:00");
  return d.getDay() === 0 || d.getDay() === 6;
}

export function stateClass(s: TaskState | undefined): string {
  if (s === "done") return "state-done";
  if (s === "in_progress" || s === "in progress") return "state-in_progress";
  if (typeof s === "string" && s.startsWith("blocked")) return "state-blocked";
  return "state-not_started";
}

export type StateLabel = "DONE" | "IN PROGRESS" | "BLOCKED" | "NOT STARTED";

export function stateLabel(s: TaskState | undefined): StateLabel {
  if (s === "done") return "DONE";
  if (s === "in_progress" || s === "in progress") return "IN PROGRESS";
  if (typeof s === "string" && s.startsWith("blocked")) return "BLOCKED";
  return "NOT STARTED";
}

export function stateColor(s: TaskState | undefined): string {
  if (s === "done") return "#2DD4BF";
  if (s === "in_progress" || s === "in progress") return "#FBBF24";
  if (typeof s === "string" && s.startsWith("blocked")) return "#EF4444";
  return "#94A3B8";
}

export function doneCount(task: Task): string | null {
  const subs = task.subtasks ?? [];
  if (!subs.length) return null;
  const done = subs.filter((s) => s.state === "done").length;
  return `${done}/${subs.length}`;
}

export function findTask(D: ShowData | null, id: string): Task | null {
  if (!D) return null;
  for (const t of D.tasks) {
    if (t.id === id) return t;
    for (const s of t.subtasks ?? []) {
      if (s.id === id) return { ...s, _parent: t };
    }
  }
  for (const entries of Object.values(D.history ?? {})) {
    for (const e of entries) {
      if (e.task.id === id) return e.task;
    }
  }
  return null;
}

export function findTaskName(D: ShowData | null, id: string): string {
  const t = findTask(D, id);
  return t?.problem ?? id;
}

export function sortSubtasks(subtasks: Task[]): Task[] {
  return [...subtasks].sort(
    (a, b) => (a.state === "done" ? 1 : 0) - (b.state === "done" ? 1 : 0),
  );
}
