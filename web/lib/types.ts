export type TaskState =
  | null
  | "done"
  | "in_progress"
  | "in progress"
  | `blocked: ${string}`
  | `failed: ${string}`
  | string;

export interface Source {
  type?: "notion" | string;
  group?: string;
  owner?: string | string[];
  parent?: { name: string };
  timeline?: { from: string; to: string };
}

export interface HistoryItem {
  ts: string;
  text: string;
  field?: string;
  source?: string;
  from?: string;
  link?: string;
}

export interface Followup {
  about?: string;
  message?: string;
  who?: string;
  to_send_at?: string;
}

export interface Task {
  id: string;
  problem?: string;
  why?: string | null;
  solution?: string | null;
  project?: string | null;
  focus?: boolean;
  state?: TaskState;
  contacts?: string[];
  subtasks?: Task[];
  source?: Source;
  history?: HistoryItem[];
  followups?: Followup[];
  blocked_by?: string[];
  commits?: string[];
  _parent?: Task;
}

export type HistoryEntry =
  | { type: "parent_done"; task: Task }
  | { type: "subtask_done"; task: Task; parent: Task };

export interface ProjectTask {
  done_day?: string;
  add_day?: string;
  problem: string;
}

export interface Analytics {
  daily_flow: { dates: string[] };
  completed_by_project: Record<string, ProjectTask[]>;
  added_by_project?: Record<string, ProjectTask[]>;
}

export interface ShowData {
  today: string;
  tasks: Task[];
  history: Record<string, HistoryEntry[]>;
  analytics: Analytics | null;
}
