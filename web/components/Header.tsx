"use client";

import type { View } from "@/lib/types-ui";

export function Header({
  view,
  onChangeView,
}: {
  view: View;
  onChangeView: (v: View) => void;
}) {
  return (
    <div className="header rel">
      <div className="title-bar" />
      <div>
        <div className="title-text">QUEST LOG</div>
        <div className="title-sub">SYSTEM.SIGNAL.QUESTS</div>
      </div>
      <div className="top-nav">
        <button
          className={`nav-btn ${view === "questlog" ? "active" : ""}`}
          onClick={() => onChangeView("questlog")}
        >
          QUEST LOG
        </button>
        <button
          className={`nav-btn ${view === "analytics" ? "active" : ""}`}
          onClick={() => onChangeView("analytics")}
        >
          ANALYTICS
        </button>
      </div>
    </div>
  );
}
