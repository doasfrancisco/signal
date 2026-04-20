import type { TaskState } from "@/lib/types";
import { stateLabel } from "@/lib/utils";

const badgeClass: Record<string, string> = {
  DONE: "badge-done",
  "IN PROGRESS": "badge-progress",
  BLOCKED: "badge-blocked",
  "NOT STARTED": "badge-notstarted",
};

export function StateBadge({ state }: { state: TaskState | undefined }) {
  const label = stateLabel(state);
  return (
    <span className={`detail-badge ${badgeClass[label]}`}>
      {label}
    </span>
  );
}
