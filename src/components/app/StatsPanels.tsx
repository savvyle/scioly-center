import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { byEvent, statsQuery, trendQuery } from "@/lib/data";
import { pct } from "@/lib/week";
import type { ReactNode } from "react";

export function EventAccuracy({ userId, division, title, action }: { userId: string | null; division?: string | null; title?: string; action?: ReactNode }) {
  const { data = [] } = useQuery(statsQuery(userId, division ?? null));
  const events = byEvent(data);
  if (!events.length && !title) return <div className="panel p-4 text-sm text-muted-foreground">No answers yet.</div>;
  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title ?? <>By event <span className="text-sm font-normal text-muted-foreground">(weakest first)</span></>}</h2>
        {action}
      </div>
      {!events.length && <p className="mt-3 text-sm text-muted-foreground">No answers yet.</p>}
      <div className="mt-3 space-y-2">
        {events.map((e) => {
          const acc = e.correct / e.answered;
          return (
            <details key={e.event} className="group">
              <summary className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm sm:grid-cols-[10rem_minmax(0,1fr)_6rem] sm:gap-3">
                <span className="min-w-0 break-words font-medium">{e.event}</span>
                <span className="relative col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-muted sm:col-span-1 sm:row-start-auto">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: pct(acc) }} />
                </span>
                <span className="w-24 text-right font-mono text-xs">{pct(acc)} · {e.answered}</span>
              </summary>
              <div className="mb-2 ml-4 mt-2 space-y-1 border-l border-border pl-3">
                {data.filter((r) => r.event === e.event).map((r) => (
                  <div key={r.topic} className="flex justify-between font-mono text-xs text-muted-foreground">
                    <span>{r.topic}</span><span>{pct(r.correct / r.answered)} of {r.answered}</span>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

export function TrendChart({ userId }: { userId: string | null }) {
  const { data = [] } = useQuery(trendQuery(userId));
  const rows = data.map((d) => ({ day: String(d.day).slice(5), answered: d.answered, accuracy: Math.round((d.correct / d.answered) * 100) }));
  if (!rows.length) return null;
  return (
    <div className="panel p-4">
      <h2 className="text-lg font-bold">Last 4 weeks</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} width={24} />
              <Tooltip />
              <Bar dataKey="answered" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-40">
          <ResponsiveContainer>
            <LineChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" fontSize={10} />
              <YAxis fontSize={10} width={24} domain={[0, 100]} unit="%" />
              <Tooltip />
              <Line dataKey="accuracy" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
