import type { Analytics, HistoryEntry, ShowData, Task } from "./types";
import mockTasks from "./mock-tasks.json";

/**
 * Single place where show-data is loaded. Today it reads a static JSON
 * snapshot from signal_legacy; later this becomes a fetch to the backend.
 */
export function loadShowData(): ShowData {
  const today = (mockTasks as { updated: string }).updated;
  const tasks = (mockTasks as { tasks: Task[] }).tasks ?? [];

  return {
    today,
    tasks,
    history: buildMockHistory(tasks, today),
    analytics: buildMockAnalytics(tasks, today),
  };
}

/**
 * Build a best-effort history payload from whatever done tasks appear in the
 * snapshot. Real Signal scans 14 days of task files — this is a stand-in.
 */
function buildMockHistory(
  tasks: Task[],
  today: string,
): Record<string, HistoryEntry[]> {
  const entries: HistoryEntry[] = [];
  for (const t of tasks) {
    if (t.state === "done") {
      entries.push({ type: "parent_done", task: t });
    } else {
      for (const sub of t.subtasks ?? []) {
        if (sub.state === "done") {
          entries.push({
            type: "subtask_done",
            task: sub,
            parent: {
              id: t.id,
              problem: t.problem,
              source: t.source,
              subtasks: t.subtasks,
            },
          });
        }
      }
    }
  }

  const yesterday = shiftDay(today, -1);
  const twoAgo = shiftDay(today, -2);
  const result: Record<string, HistoryEntry[]> = {};

  if (entries.length > 0) {
    const third = Math.ceil(entries.length / 3);
    result[today] = entries.slice(0, third);
    if (entries.length > third) {
      result[yesterday] = entries.slice(third, third * 2);
    }
    if (entries.length > third * 2) {
      result[twoAgo] = entries.slice(third * 2);
    }
  }
  return result;
}

function shiftDay(iso: string, delta: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Build a month's worth of fake analytics keyed off real project names in the
 * task snapshot, so the chart + stats render with realistic content.
 */
function buildMockAnalytics(tasks: Task[], today: string): Analytics {
  const projects = new Set<string>();
  for (const t of tasks) {
    if (t.project) projects.add(t.project);
    for (const s of t.subtasks ?? []) {
      if (s.project) projects.add(s.project);
    }
  }
  const projectList = [...projects].slice(0, 5);
  if (projectList.length === 0) {
    projectList.push("signal", "notion", "whatsapp");
  }

  const [y, m] = today.split("-");
  const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${y}-${m}-${String(d).padStart(2, "0")}`);
  }

  const completed: Record<string, { done_day: string; problem: string }[]> = {};
  const added: Record<string, { add_day: string; problem: string }[]> = {};

  const seed = (s: string) =>
    [...s].reduce((a, c) => ((a * 31 + c.charCodeAt(0)) & 0xffff) >>> 0, 7);
  const rand = (k: string) => (seed(k) % 1000) / 1000;

  for (const proj of projectList) {
    completed[proj] = [];
    added[proj] = [];
    for (const day of dates) {
      const r = rand(proj + day);
      if (r < 0.25) {
        completed[proj].push({ done_day: day, problem: `${proj} done ${day}` });
      }
      const ra = rand(proj + day + "add");
      if (ra < 0.32) {
        added[proj].push({ add_day: day, problem: `${proj} added ${day}` });
      }
    }
  }

  return {
    daily_flow: { dates },
    completed_by_project: completed,
    added_by_project: added,
  };
}
