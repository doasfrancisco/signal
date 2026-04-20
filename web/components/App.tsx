"use client";

import { useState } from "react";
import type { ShowData } from "@/lib/types";
import type { View } from "@/lib/types-ui";
import { Header } from "./Header";
import { QuestLogView } from "./QuestLogView";
import { AnalyticsView } from "./AnalyticsView";

export function App({ data }: { data: ShowData }) {
  const [view, setView] = useState<View>("questlog");

  return (
    <>
      <Header view={view} onChangeView={setView} />
      {view === "questlog" ? (
        <QuestLogView data={data} />
      ) : (
        <AnalyticsView analytics={data.analytics} />
      )}
    </>
  );
}
