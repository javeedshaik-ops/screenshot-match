import { Link } from "@tanstack/react-router";

type Row = {
  id: string;
  role: string;
  category: string;
  difficulty: string;
  score: number | null;
  completed_at: string | null;
  status: string;
  created_at: string;
};

export function SessionRows({ sessions }: { sessions: Row[] }) {
  if (!sessions.length) return <p className="text-sm text-muted-foreground">No sessions yet.</p>;
  return (
    <div className="divide-y divide-border">
      {sessions.map((s) => (
        <Link
          key={s.id}
          to={s.status === "completed" ? "/results/$id" : "/interview/$id"}
          params={{ id: s.id }}
          className="flex items-center justify-between gap-4 py-3 text-sm hover:text-cyan"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{s.role}</div>
            <div className="truncate text-xs text-muted-foreground">
              {s.category} · <span className="capitalize">{s.difficulty}</span> ·{" "}
              {new Date(s.completed_at ?? s.created_at).toLocaleString()}
            </div>
          </div>
          <span className="font-display text-lg font-semibold">
            {s.status === "completed" ? (
              `${Math.round(Number(s.score))}%`
            ) : (
              <span className="text-xs text-warning">In progress</span>
            )}
          </span>
        </Link>
      ))}
    </div>
  );
}
