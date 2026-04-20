"use client";

import type { ShowData, Task } from "@/lib/types";
import { doneCount, findTaskName, fmtShort } from "@/lib/utils";
import { NotionIcon } from "./NotionIcon";
import { StateBadge } from "./StateBadge";

export function TaskDetail({ task, data }: { task: Task; data: ShowData }) {
  const subs = task.subtasks ?? [];
  const hist = (task.history ?? []).slice().reverse();
  const fups = task.followups ?? [];
  const deps = task.blocked_by ?? [];
  const src = task.source ?? task._parent?.source;
  const tl = task.source?.timeline;

  return (
    <>
      {/* Title + badge */}
      <div className="section-group" style={{ gap: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <span className="detail-title">
            {(task.problem ?? task.id).toUpperCase()}
          </span>
          <StateBadge state={task.state} />
        </div>
        <MetaLine task={task} />
      </div>

      {tl?.from && tl?.to && <Timeline from={tl.from} to={tl.to} state={task.state} />}

      {task.why && (
        <div className="section-group">
          <div className="section-hdr">WHY</div>
          <div className="section-body">{task.why}</div>
        </div>
      )}

      {subs.length > 0 && (
        <div className="section-group">
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div className="section-hdr">SUBTASKS</div>
            <span
              style={{
                fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
                fontSize: 11,
                color: "rgba(255,255,255,0.3)",
              }}
            >
              {doneCount(task)}
            </span>
          </div>
          <div className="bullet-list">
            {subs.map((s) => {
              const isDone = s.state === "done";
              const isBlocked =
                typeof s.state === "string" && s.state.startsWith("blocked");
              const dotColor = isDone
                ? "#2DD4BF"
                : isBlocked
                  ? "#EF4444"
                  : "#22D3EE";
              const cls = isDone ? "done" : isBlocked ? "blocked" : "";
              return (
                <div key={s.id} className="bullet-item">
                  <div className="bullet-dot" style={{ background: dotColor }} />
                  <span className={`bullet-text ${cls}`}>
                    {s.problem ?? s.id}
                  </span>
                  {s.source?.timeline?.from && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: 10,
                        color: "rgba(255,255,255,0.2)",
                        marginLeft: "auto",
                        flexShrink: 0,
                      }}
                    >
                      {fmtShort(s.source.timeline.from)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {hist.length > 0 && (
        <div className="section-group">
          <div className="section-hdr">ACTIVITY</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hist.slice(0, 5).map((h, i) => (
              <div key={i} className="activity-entry">
                <span className="activity-date">
                  {h.ts ? fmtShort(h.ts.slice(0, 10)) : ""}
                </span>
                <span className="activity-text">{h.text ?? ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fups.length > 0 && (
        <div className="section-group">
          <div className="section-hdr">FOLLOWUPS</div>
          <div className="bullet-list">
            {fups.map((f, i) => {
              const isDone = task.state === "done";
              return (
                <div key={i} className="bullet-item">
                  <div className="bullet-dot" style={{ background: "#FBBF24" }} />
                  <span className={`bullet-text ${isDone ? "done" : ""}`}>
                    {f.about ?? f.message ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deps.length > 0 && (
        <div className="section-group">
          <div className="section-hdr">DEPENDENCIES</div>
          <div className="bullet-list">
            {deps.map((dep, i) => (
              <div key={i} className="bullet-item">
                <div className="bullet-dot" style={{ background: "#EF4444" }} />
                <span className="bullet-text">{findTaskName(data, dep)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {src && (
        <div className="section-group">
          <div className="section-hdr">SOURCE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="source-row">
              <NotionIcon />
              <span className="source-label">
                {src.type ?? ""} · {src.group ?? ""}
              </span>
            </div>
            {src.owner && (
              <div className="source-meta">
                <span className="source-key">
                  {Array.isArray(src.owner) && src.owner.length > 1
                    ? "owners"
                    : "owner"}
                </span>
                <span className="source-val">
                  {(Array.isArray(src.owner) ? src.owner : [src.owner])
                    .map((o) => o.replace("_self", ""))
                    .join(" · ")}
                </span>
              </div>
            )}
            {src.parent && (
              <div className="source-meta">
                <span className="source-key">parent</span>
                <span className="source-val source-link">
                  {src.parent.name ?? ""}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MetaLine({ task }: { task: Task }) {
  const src = task.source;
  const subs = task.subtasks ?? [];
  const owner = src?.owner;
  const hasOwner = !!owner;
  const ownerList = Array.isArray(owner) ? owner : owner ? [owner] : [];

  return (
    <div className="detail-meta">
      {src?.parent && (
        <>
          <span>{src.parent.name}</span>
          <span className="sep">·</span>
        </>
      )}
      {hasOwner && (
        <>
          <span>
            {ownerList.map((o) => o.replace("_self", "")).join(" · ")}
          </span>
          <span className="sep">·</span>
        </>
      )}
      {subs.length > 0 && <span>{doneCount(task)} subtasks</span>}
    </div>
  );
}

function Timeline({
  from,
  to,
  state,
}: {
  from: string;
  to: string;
  state: Task["state"];
}) {
  const fromDate = new Date(from + "T00:00:00");
  const toDate = new Date(to + "T00:00:00");
  const now = new Date();
  const total = toDate.getTime() - fromDate.getTime();
  const elapsed = now.getTime() - fromDate.getTime();
  const progress = Math.max(0, Math.min(1, elapsed / total));

  let bar: React.ReactNode;
  let statusText: string;
  let statusColor: string;

  if (state === "done") {
    bar = (
      <div
        style={{ flex: 1, background: "#2DD4BF", borderRadius: 2 }}
      />
    );
    statusText = "Completed";
    statusColor = "#2DD4BF";
  } else if (now < fromDate) {
    const daysUntil = Math.ceil(
      (fromDate.getTime() - now.getTime()) / 86400000,
    );
    bar = (
      <div
        style={{
          flex: 1,
          background: "rgba(34,211,238,0.15)",
          borderRadius: 2,
        }}
      />
    );
    statusText = `Starts in ${daysUntil} days`;
    statusColor = "#94A3B8";
  } else {
    const donePct = Math.round(progress * 100);
    bar = (
      <>
        <div
          style={{
            flex: donePct,
            background: "#2DD4BF",
            borderRadius: progress < 1 ? "2px 0 0 2px" : 2,
          }}
        />
        {progress < 1 && (
          <div
            style={{
              flex: 100 - donePct,
              background: "rgba(34,211,238,0.15)",
              borderRadius: "0 2px 2px 0",
            }}
          />
        )}
      </>
    );
    const daysLeft = Math.ceil(
      (toDate.getTime() - now.getTime()) / 86400000,
    );
    statusText = `${donePct}% complete · ${daysLeft} days left`;
    statusColor = "#FBBF24";
  }

  return (
    <div className="section-group" style={{ gap: 6 }}>
      <div className="timeline-row">
        <span className="timeline-date">{fmtShort(from)}</span>
        <div className="timeline-bar">{bar}</div>
        <span className="timeline-date end">{fmtShort(to)}</span>
      </div>
      <div className="timeline-status" style={{ color: statusColor }}>
        {statusText}
      </div>
    </div>
  );
}
