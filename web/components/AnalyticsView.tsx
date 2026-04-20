"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Analytics } from "@/lib/types";
import { fmtShort, isWeekend, truncate } from "@/lib/utils";

const TOP_COLORS = [
  {
    solid: "#fbbf24",
    muted: "rgba(251,191,36,0.15)",
    dot: "#fbbf24",
    shadow: "#fbbf2499",
    bulletBg: "#fbbf2466",
  },
  {
    solid: "#818cf8",
    muted: "rgba(129,140,248,0.15)",
    dot: "#818cf8",
    shadow: "#818cf899",
    bulletBg: "#818cf866",
  },
  {
    solid: "#3b82f6",
    muted: "rgba(59,130,246,0.15)",
    dot: "#3b82f6",
    shadow: "#3b82f699",
    bulletBg: "#3b82f666",
  },
] as const;

const OTHER = {
  solid: "#2dd4bf",
  muted: "rgba(45,212,191,0.12)",
  shadow: "#2dd4bf4d",
} as const;

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();
}

type ProjCounts = Record<string, number>;
type DayProj = Record<string, ProjCounts>;
type TasksByDay = Record<string, { proj: string; problem: string }[]>;

interface Aggregates {
  doneByDayProj: DayProj;
  addedByDayProj: DayProj;
  tasksByDay: TasksByDay;
  months: string[];
}

function buildAggregates(A: Analytics): Aggregates {
  const doneByDayProj: DayProj = {};
  const addedByDayProj: DayProj = {};
  const tasksByDay: TasksByDay = {};

  for (const [proj, tasks] of Object.entries(A.completed_by_project ?? {})) {
    for (const t of tasks) {
      const day = t.done_day;
      if (!day) continue;
      (doneByDayProj[day] ??= {})[proj] = (doneByDayProj[day][proj] ?? 0) + 1;
      (tasksByDay[day] ??= []).push({ proj, problem: t.problem });
    }
  }
  for (const [proj, tasks] of Object.entries(A.added_by_project ?? {})) {
    for (const t of tasks) {
      const day = t.add_day;
      if (!day) continue;
      (addedByDayProj[day] ??= {})[proj] = (addedByDayProj[day][proj] ?? 0) + 1;
    }
  }

  const dates = A.daily_flow?.dates ?? [];
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))].sort();

  return { doneByDayProj, addedByDayProj, tasksByDay, months };
}

export function AnalyticsView({ analytics }: { analytics: Analytics | null }) {
  const agg = useMemo(
    () => (analytics ? buildAggregates(analytics) : null),
    [analytics],
  );

  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    if (!agg?.months.length) return "";
    return agg.months[agg.months.length - 1];
  });

  if (!analytics || !agg) {
    return (
      <div className="analytics-view rel">
        <div className="empty-state">NO ANALYTICS DATA</div>
      </div>
    );
  }

  return (
    <div className="analytics-view rel">
      <div className="analytics-header">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="title-bar" />
          <div>
            <div className="a-section-title" style={{ fontSize: 20 }}>
              SIGNAL ANALYTICS
            </div>
            <div className="title-sub">SYSTEM.DASHBOARD.ACTIVE</div>
          </div>
        </div>
        <MonthSummary month={currentMonth} />
      </div>

      <div className="a-main">
        <div className="a-panel a-chart-panel">
          <div className="chart-header">
            <div className="a-section-title">DASHBOARD</div>
            <MonthPicker
              months={agg.months}
              current={currentMonth}
              onChange={setCurrentMonth}
            />
          </div>
          <ChartArea month={currentMonth} agg={agg} />
          <Legend />
        </div>
        <div className="a-panel a-stats-panel">
          <div className="a-section-title">STATS</div>
          <StatsRow month={currentMonth} agg={agg} />
          <TopProjects month={currentMonth} agg={agg} />
        </div>
      </div>
    </div>
  );
}

function MonthSummary({ month }: { month: string }) {
  if (!month) return <div />;
  const [y, mo] = month.split("-");
  const days = new Date(+y, +mo, 0).getDate();
  const first = `${month}-01`;
  const last = `${month}-${String(days).padStart(2, "0")}`;
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-exo), sans-serif",
          fontSize: 13,
          color: "#cffafeb3",
          textAlign: "right",
        }}
      >
        {fmtShort(first)} — {fmtShort(last)}, {y}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 10,
          color: "#22d3ee4d",
          letterSpacing: ".2em",
          textAlign: "right",
        }}
      >
        {days} DAYS
      </div>
    </div>
  );
}

function MonthPicker({
  months,
  current,
  onChange,
}: {
  months: string[];
  current: string;
  onChange: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className={`month-picker ${open ? "open" : ""}`} ref={ref}>
      <div
        className="month-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span>{current ? fmtMonth(current) : "—"}</span>
        <svg viewBox="0 0 10 10">
          <path d="M2.5 3.5L5 6.5L7.5 3.5" />
        </svg>
      </div>
      <div className="month-list">
        {months.map((m) => (
          <div
            key={m}
            className={`month-opt ${m === current ? "active" : ""}`}
            onClick={() => {
              onChange(m);
              setOpen(false);
            }}
          >
            {fmtMonth(m)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <div className="legend-item">
        <div
          className="legend-dot"
          style={{ background: "rgba(148,163,184,0.25)" }}
        />
        Added
      </div>
      <div className="legend-item">
        <div className="legend-dot" style={{ background: "#2dd4bf" }} />
        Done
      </div>
    </div>
  );
}

interface MonthDerived {
  md: string[];
  mPC: ProjCounts;
  mTop3: string[];
  maxT: number;
  mDone: number;
  mAdded: number;
  actDays: number;
  mTasksByProj: Record<string, { proj: string; problem: string }[]>;
}

function useMonthDerived(month: string, agg: Aggregates): MonthDerived | null {
  return useMemo(() => {
    if (!month) return null;
    const [y, mo] = month.split("-");
    const dim = new Date(+y, +mo, 0).getDate();
    const md: string[] = [];
    for (let i = 1; i <= dim; i++) {
      md.push(`${month}-${String(i).padStart(2, "0")}`);
    }

    const mPC: ProjCounts = {};
    for (const d of md) {
      for (const [p, c] of Object.entries(agg.doneByDayProj[d] ?? {})) {
        mPC[p] = (mPC[p] ?? 0) + c;
      }
    }
    const mTop3 = Object.entries(mPC)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([p]) => p);

    let maxT = 1;
    for (const d of md) {
      const dt = Object.values(agg.doneByDayProj[d] ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      const at = Object.values(agg.addedByDayProj[d] ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      maxT = Math.max(maxT, dt, at);
    }

    const mDone = md.reduce(
      (s, d) =>
        s +
        Object.values(agg.doneByDayProj[d] ?? {}).reduce((a, b) => a + b, 0),
      0,
    );
    const mAdded = md.reduce(
      (s, d) =>
        s +
        Object.values(agg.addedByDayProj[d] ?? {}).reduce((a, b) => a + b, 0),
      0,
    );
    const actDays =
      md.filter((d) => Object.keys(agg.doneByDayProj[d] ?? {}).length > 0)
        .length || 1;

    const mTasksByProj: Record<string, { proj: string; problem: string }[]> =
      {};
    for (const d of md) {
      for (const t of agg.tasksByDay[d] ?? []) {
        (mTasksByProj[t.proj] ??= []).push(t);
      }
    }

    return { md, mPC, mTop3, maxT, mDone, mAdded, actDays, mTasksByProj };
  }, [month, agg]);
}

const CHART_HEIGHT_PX = 380;

function ChartArea({ month, agg }: { month: string; agg: Aggregates }) {
  const der = useMonthDerived(month, agg);
  if (!der) return null;
  const { md, mTop3, maxT } = der;
  const scale = (CHART_HEIGHT_PX / maxT) * 0.85;

  return (
    <>
      <div className="chart-area">
        {md.map((d) => (
          <DayCol
            key={d}
            day={d}
            agg={agg}
            derived={der}
            scale={scale}
            top3={mTop3}
          />
        ))}
      </div>
      <div className="x-axis">
        {md.map((d) => {
          const dn = parseInt(d.split("-")[2]);
          const we = isWeekend(d);
          return (
            <div
              key={d}
              className={`a-day-label${we ? " weekend" : ""}`}
              style={{ flex: 1, textAlign: "center" }}
            >
              {dn}
            </div>
          );
        })}
      </div>
    </>
  );
}

function DayCol({
  day,
  agg,
  derived,
  scale,
  top3,
}: {
  day: string;
  agg: Aggregates;
  derived: MonthDerived;
  scale: number;
  top3: string[];
}) {
  const done = agg.doneByDayProj[day] ?? {};
  const added = agg.addedByDayProj[day] ?? {};
  const hasDone = Object.keys(done).length > 0;
  const hasAdded = Object.keys(added).length > 0;

  if (!hasDone && !hasAdded) {
    return (
      <div className="day-col">
        <div className="bar-pair">
          <div className="bar">
            <div
              style={{
                height: 4,
                background: "rgba(45,212,191,0.04)",
                borderRadius: 1,
              }}
            />
          </div>
          <div className="bar">
            <div
              style={{
                height: 4,
                background: "rgba(45,212,191,0.08)",
                borderRadius: 1,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="day-col">
      <Tooltip day={day} agg={agg} derived={derived} top3={top3} />
      <div className="bar-pair">
        <div className="bar">
          <BarSegments dayCounts={added} scale={scale} muted top3={top3} />
        </div>
        <div className="bar">
          <BarSegments dayCounts={done} scale={scale} top3={top3} />
        </div>
      </div>
    </div>
  );
}

function BarSegments({
  dayCounts,
  scale,
  muted = false,
  top3,
}: {
  dayCounts: ProjCounts;
  scale: number;
  muted?: boolean;
  top3: string[];
}) {
  const entries = Object.entries(dayCounts);
  if (!entries.length) {
    return (
      <div
        style={{
          height: 4,
          background: muted ? "rgba(45,212,191,0.04)" : "rgba(45,212,191,0.08)",
          borderRadius: 1,
        }}
      />
    );
  }
  const sg: { p: string; c: number; idx: number }[] = [];
  let otherCount = 0;
  for (const [p, c] of entries) {
    const idx = top3.indexOf(p);
    if (idx >= 0) sg.push({ p, c, idx });
    else otherCount += c;
  }
  sg.sort((a, b) => a.idx - b.idx);

  return (
    <>
      {sg.map((s) => {
        const col = TOP_COLORS[s.idx];
        const ht = Math.max(Math.round(s.c * scale), 3);
        return (
          <div
            key={s.p}
            style={{
              height: ht,
              background: muted ? col.muted : col.solid,
            }}
          />
        );
      })}
      {otherCount > 0 && (
        <div
          style={{
            height: Math.max(Math.round(otherCount * scale), 3),
            background: muted ? OTHER.muted : OTHER.solid,
            boxShadow: muted ? undefined : `0 0 4px ${OTHER.shadow}`,
          }}
        />
      )}
    </>
  );
}

function Tooltip({
  day,
  agg,
  derived,
  top3,
}: {
  day: string;
  agg: Aggregates;
  derived: MonthDerived;
  top3: string[];
}) {
  const done = agg.doneByDayProj[day] ?? {};
  const added = agg.addedByDayProj[day] ?? {};
  const doneTotal = Object.values(done).reduce((a, b) => a + b, 0);
  const addedTotal = Object.values(added).reduce((a, b) => a + b, 0);
  if (!doneTotal && !addedTotal) return null;

  const dayTasks = agg.tasksByDay[day] ?? [];
  const tasksByProj: Record<string, { proj: string; problem: string }[]> = {};
  for (const t of dayTasks) {
    (tasksByProj[t.proj] ??= []).push(t);
  }

  return (
    <div className="tooltip">
      <div className="tooltip-date">{fmtShort(day)}</div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="tooltip-total" style={{ marginBottom: 4 }}>
            ADDED
          </div>
          {addedTotal ? (
            Object.entries(added)
              .sort((a, b) => b[1] - a[1])
              .map(([p, c]) => {
                const idx = top3.indexOf(p);
                const col = idx >= 0 ? TOP_COLORS[idx].solid : OTHER.solid;
                return (
                  <div key={p} className="tooltip-row">
                    <div
                      className="tooltip-dot"
                      style={{ background: col, opacity: 0.4 }}
                    />
                    <div className="tooltip-proj">{p}</div>
                    <div className="tooltip-n">{c}</div>
                  </div>
                );
              })
          ) : (
            <div className="tooltip-task">—</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div className="tooltip-total" style={{ marginBottom: 4 }}>
            DONE
          </div>
          {doneTotal ? (
            Object.entries(done)
              .sort((a, b) => b[1] - a[1])
              .map(([p, c]) => {
                const idx = top3.indexOf(p);
                const col = idx >= 0 ? TOP_COLORS[idx].solid : OTHER.solid;
                const pt = tasksByProj[p] ?? [];
                return (
                  <div key={p}>
                    <div className="tooltip-row">
                      <div
                        className="tooltip-dot"
                        style={{ background: col }}
                      />
                      <div className="tooltip-proj">{p}</div>
                      <div className="tooltip-n">{c}</div>
                    </div>
                    {pt.slice(0, 2).map((t, i) => (
                      <div key={i} className="tooltip-task">
                        <div
                          className="tooltip-task-dot"
                          style={{ background: col }}
                        />
                        <div className="tooltip-task-text">
                          {truncate(t.problem, 30)}
                        </div>
                      </div>
                    ))}
                    {pt.length > 2 && (
                      <div className="tooltip-task">
                        <div
                          className="tooltip-task-dot"
                          style={{ background: col }}
                        />
                        <div className="tooltip-task-text">
                          +{pt.length - 2} more
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          ) : (
            <div className="tooltip-task">—</div>
          )}
        </div>
      </div>
      <div className="tooltip-divider" />
      <div className="tooltip-total">
        {addedTotal} added · {doneTotal} done
      </div>
    </div>
  );
}

function StatsRow({ month, agg }: { month: string; agg: Aggregates }) {
  const der = useMonthDerived(month, agg);
  if (!der) return null;
  const { mDone, mAdded, actDays } = der;
  return (
    <div className="stat-row">
      <div className="stat-card">
        <div className="stat-label">COMPLETED</div>
        <div
          className="stat-value"
          style={{ color: "#2dd4bf", textShadow: "0 0 12px #22d3ee80" }}
        >
          {mDone}
        </div>
        <div className="stat-detail">{(mDone / actDays).toFixed(1)} / day</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">ADDED</div>
        <div
          className="stat-value"
          style={{ color: "#94a3b8", textShadow: "0 0 12px #3b82f680" }}
        >
          {mAdded}
        </div>
        <div className="stat-detail">{(mAdded / actDays).toFixed(1)} / day</div>
      </div>
    </div>
  );
}

function TopProjects({ month, agg }: { month: string; agg: Aggregates }) {
  const der = useMonthDerived(month, agg);
  if (!der) return null;
  const { mTop3, mPC, mTasksByProj, mDone } = der;

  return (
    <div>
      <div className="a-section-title-sm" style={{ marginBottom: 14 }}>
        TOP PROJECTS
      </div>
      <div className="projects-list">
        {mTop3.map((proj, i) => {
          const c = TOP_COLORS[i];
          const cnt = mPC[proj];
          const tasks = mTasksByProj[proj] ?? [];
          const mx = i === 0 ? 3 : 2;
          const lt = tasks.slice(0, mx);
          return (
            <div key={proj} className="project-row">
              <div className="project-header">
                <div className="project-name-group">
                  <div
                    className="project-dot"
                    style={{
                      background: c.dot,
                      boxShadow: `0 0 6px ${c.shadow}`,
                    }}
                  />
                  <div className="project-name">{proj}</div>
                </div>
                <div className="project-count">
                  <div className="project-num" style={{ color: c.solid }}>
                    {cnt}
                  </div>
                  <div className="project-total">/</div>
                  <div className="project-total">{mDone}</div>
                </div>
              </div>
              <div className="a-task-list">
                {lt.map((t, j) => (
                  <div key={j} className="a-task-item">
                    <div
                      className="a-task-bullet"
                      style={{ background: c.bulletBg }}
                    />
                    <div className="a-task-text">{truncate(t.problem)}</div>
                  </div>
                ))}
                {tasks.length > mx && (
                  <div className="a-task-item">
                    <div
                      className="a-task-bullet"
                      style={{ background: c.bulletBg }}
                    />
                    <div className="a-task-text">...</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
