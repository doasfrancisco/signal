"use client";

import { useEffect, useRef } from "react";
import type { Task } from "@/lib/types";
import { NotionIcon } from "./NotionIcon";
import { doneCount, sortSubtasks, stateClass, stateColor } from "@/lib/utils";

export function TodayList({
  tasks,
  selectedId,
  expandedParentId,
  onSelect,
}: {
  tasks: Task[];
  selectedId: string | null;
  expandedParentId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="task-list">
      {tasks.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          selectedId={selectedId}
          expandedParentId={expandedParentId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function TaskRow({
  task,
  selectedId,
  expandedParentId,
  onSelect,
}: {
  task: Task;
  selectedId: string | null;
  expandedParentId: string | null;
  onSelect: (id: string) => void;
}) {
  const subs = task.subtasks ?? [];
  const highlightId = expandedParentId ?? selectedId;
  const isSelected = highlightId === task.id;
  const subSelected = subs.some((s) => s.id === selectedId);
  const isExpanded = expandedParentId === task.id;

  const doneCls = task.state === "done" ? "state-done" : "";
  const selectedCls = isSelected ? `selected ${stateClass(task.state)}` : "";
  const counter = doneCount(task);

  return (
    <div
      className={`task-row ${doneCls} ${selectedCls}`.trim()}
      onClick={() => onSelect(task.id)}
    >
      <div className="task-row-main">
        {task.source?.type === "notion" ? (
          <span className="task-icon-slot">
            <NotionIcon />
          </span>
        ) : (
          <div className="task-icon-slot">
            <div
              className="task-dot"
              style={{ background: stateColor(task.state) }}
            />
          </div>
        )}
        <span className="task-name">{task.problem ?? task.id}</span>
        <span className="task-counter">{counter ?? ""}</span>
      </div>

      {subs.length > 0 && (
        <SubtaskList
          parentId={task.id}
          subtasks={subs}
          expanded={isExpanded}
          selectedId={selectedId}
          subSelected={subSelected}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function SubtaskList({
  parentId,
  subtasks,
  expanded,
  selectedId,
  subSelected,
  onSelect,
}: {
  parentId: string;
  subtasks: Task[];
  expanded: boolean;
  selectedId: string | null;
  subSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    if (expanded) {
      wrap.style.maxHeight = inner.scrollHeight + "px";
      wrap.style.opacity = "1";
    } else {
      wrap.style.maxHeight = "0px";
      wrap.style.opacity = "0";
    }
  }, [expanded, subtasks]);

  const sorted = sortSubtasks(subtasks);

  return (
    <div
      className="subtask-list-wrap"
      ref={wrapRef}
      data-parent={parentId}
    >
      <div className="subtask-list" ref={innerRef}>
        {sorted.map((s) => {
          const sCls = (() => {
            if (s.state === "done") return "done";
            if (typeof s.state === "string" && s.state.startsWith("blocked"))
              return "blocked";
            if (s.state === "in_progress" || s.state === "in progress")
              return "in_progress";
            return "";
          })();
          const selCls = subSelected && selectedId === s.id ? "sub-selected" : "";
          return (
            <div
              key={s.id}
              className={`subtask-item ${sCls} ${selCls}`.trim()}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(s.id);
              }}
            >
              {s.problem ?? s.id}
            </div>
          );
        })}
      </div>
    </div>
  );
}
