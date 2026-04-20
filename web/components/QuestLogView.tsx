"use client";

import { useMemo, useState } from "react";
import type { ShowData, Task } from "@/lib/types";
import type { Tab } from "@/lib/types-ui";
import { findTask } from "@/lib/utils";
import { TodayList } from "./TodayList";
import { HistoryList } from "./HistoryList";
import { TaskDetail } from "./TaskDetail";

export function QuestLogView({ data }: { data: ShowData }) {
  const [tab, setTab] = useState<Tab>("today");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first =
      data.tasks.find((t) => t.focus) ??
      data.tasks.find(
        (t) => t.state === "in_progress" || t.state === "in progress",
      ) ??
      data.tasks[0];
    return first?.id ?? null;
  });
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const counter = useMemo(() => {
    if (tab === "today") return `${data.tasks.length} quests`;
    const total = Object.values(data.history ?? {}).reduce(
      (s, arr) => s + arr.length,
      0,
    );
    return `${total} done`;
  }, [tab, data]);

  function selectTaskToday(id: string) {
    const isParent = data.tasks.some((t) => t.id === id);
    let parentId: string | null = null;

    if (isParent) {
      const task = data.tasks.find((t) => t.id === id);
      const hasSubs = !!task?.subtasks?.length;

      if (hasSubs && expandedParentId === id) {
        // clicking the same expanded parent collapses but keeps selection
        setSelectedId(id);
        setExpandedParentId(null);
        return;
      }

      parentId = hasSubs ? id : null;
    } else {
      for (const t of data.tasks) {
        if ((t.subtasks ?? []).some((s) => s.id === id)) {
          parentId = t.id;
          break;
        }
      }
    }

    setSelectedId(id);
    setExpandedParentId(parentId);
  }

  function selectTaskHistory(id: string) {
    setSelectedId(id);
  }

  const selectedTask: Task | null = selectedId
    ? findTask(data, selectedId)
    : null;

  function switchTab(newTab: Tab) {
    setTab(newTab);
    setSelectedId(null);
    setExpandedParentId(null);
  }

  return (
    <div className="ql-wrap rel">
      <div className="ql-left">
        <div className="ql-tabs">
          <button
            className={`ql-tab ${tab === "today" ? "active" : ""}`}
            onClick={() => switchTab("today")}
          >
            TODAY
          </button>
          <button
            className={`ql-tab ${tab === "history" ? "active" : ""}`}
            onClick={() => switchTab("history")}
          >
            HISTORY
          </button>
          <span className="ql-count">{counter}</span>
        </div>

        {tab === "today" ? (
          <TodayList
            tasks={data.tasks}
            selectedId={selectedId}
            expandedParentId={expandedParentId}
            onSelect={selectTaskToday}
          />
        ) : (
          <HistoryList
            history={data.history}
            today={data.today}
            selectedId={selectedId}
            onSelect={selectTaskHistory}
          />
        )}
      </div>

      <div className="ql-right">
        {selectedTask ? (
          <TaskDetail task={selectedTask} data={data} />
        ) : (
          <div className="empty-state">SELECT A QUEST</div>
        )}
      </div>
    </div>
  );
}
