"use client";

import type { HistoryEntry } from "@/lib/types";
import { NotionIcon } from "./NotionIcon";
import { doneCount, fmtShort } from "@/lib/utils";

export function HistoryList({
  history,
  today,
  selectedId,
  onSelect,
}: {
  history: Record<string, HistoryEntry[]>;
  today: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const dates = Object.keys(history).sort().reverse();

  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <div className="task-list">
      {dates.map((d) => {
        const isToday = d === today;
        const isYesterday = d === yesterday;
        const label = isToday
          ? "TODAY"
          : isYesterday
            ? "YESTERDAY"
            : fmtShort(d).toUpperCase().replace(",", "");
        const sub =
          isToday || isYesterday
            ? fmtShort(d).toUpperCase().replace(",", "")
            : "";

        return (
          <div key={d}>
            <div className="date-header">
              <span className="date-label">{label}</span>
              {sub && <span className="date-sub">{sub}</span>}
              <div className="date-line" />
            </div>
            {history[d].map((entry, i) => (
              <HistRow
                key={`${d}-${i}`}
                entry={entry}
                selectedId={selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function HistRow({
  entry,
  selectedId,
  onSelect,
}: {
  entry: HistoryEntry;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (entry.type === "parent_done") {
    const t = entry.task;
    const sel = selectedId === t.id;
    const counter = doneCount(t);
    return (
      <div
        className={`hist-row ${sel ? "selected" : ""}`}
        onClick={() => onSelect(t.id)}
      >
        <div className="hist-main">
          {t.source?.type === "notion" ? (
            <span className="task-icon-slot">
              <NotionIcon />
            </span>
          ) : (
            <div className="task-icon-slot">
              <div
                className="task-dot"
                style={{ background: "#2DD4BF" }}
              />
            </div>
          )}
          <span className="hist-name">{t.problem ?? t.id}</span>
          {counter && <span className="hist-counter">{counter}</span>}
        </div>
        {sel &&
          (t.subtasks ?? []).map((s) => (
            <div key={s.id} className="hist-subtask-label">
              {s.problem ?? s.id}
            </div>
          ))}
      </div>
    );
  }

  const { parent, task: sub } = entry;
  const sel = selectedId === sub.id;
  return (
    <div
      className={`hist-row ${sel ? "selected" : ""}`}
      onClick={() => onSelect(sub.id)}
    >
      <div className="hist-main">
        {parent.source?.type === "notion" ? (
          <span className="task-icon-slot">
            <NotionIcon />
          </span>
        ) : (
          <div className="task-icon-slot">
            <div
              className="task-dot"
              style={{ background: "#2DD4BF" }}
            />
          </div>
        )}
        <span className="hist-name">{parent.problem ?? parent.id}</span>
      </div>
      <div className="hist-parent-label">{sub.problem ?? sub.id}</div>
    </div>
  );
}
