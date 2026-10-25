import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { sessionsQuery } from "@/lib/queries";
import { SessionRows } from "@/components/session-rows";
import { ErrorState, Loading, PageHeader, Panel } from "@/components/ui-bits";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Practice History — InterviewAI" },
      { name: "description", content: "All your past interview sessions." },
    ],
  }),
  component: History,
});

function History() {
  const q = useQuery(sessionsQuery);
  const [filter, setFilter] = useState("all");
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorState message="Couldn't load history." onRetry={() => q.refetch()} />;
  const list = (q.data ?? []).filter((s) => filter === "all" || s.status === filter);
  return (
    <>
      <PageHeader
        title="Practice history"
        subtitle="Every interview you've taken, newest first."
        action={
          <Link to="/interview/new" className="btn-primary">
            New Interview
          </Link>
        }
      />
      <div className="mb-4 flex gap-2">
        {[
          ["all", "All"],
          ["completed", "Completed"],
          ["in_progress", "In progress"],
        ].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v!)}
            className={`rounded-full px-4 py-1.5 text-sm ${filter === v ? "bg-brand text-primary-foreground" : "glass text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <Panel>
        <SessionRows sessions={list} />
      </Panel>
    </>
  );
}
