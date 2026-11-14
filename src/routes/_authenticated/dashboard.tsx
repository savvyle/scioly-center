import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { leaderboardQuery, settingsQuery } from "@/lib/data";
import { GoalBar } from "@/components/app/GoalBar";
import { EventAccuracy, TrendChart } from "@/components/app/StatsPanels";
import { Brain, ListChecks, Timer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home · SciOly Center" }, { name: "description", content: "Your weekly goal and practice stats." }, { property: "og:title", content: "Home · SciOly Center" }, { property: "og:description", content: "Your weekly goal and practice stats." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useMe();
  const { data: goal } = useQuery(settingsQuery);
  const { data: board = [] } = useQuery(leaderboardQuery(0));
  const mine = board.find((r) => r.user_id === me?.id);
  if (!me || !goal) return null;
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Hi {me.displayName}</p>
        <h1 className="text-3xl font-extrabold">Ready for a few questions?</h1>
      </div>
      <Button asChild variant="hero" size="lg" className="w-full sm:w-auto">
        <Link to="/drill"><Brain /> Practice</Link>
      </Button>
      <div className="grid gap-4 md:grid-cols-2">
        <GoalBar answered={mine?.answered ?? 0} correct={mine?.correct ?? 0} goal={goal} />
        <div className="grid grid-cols-2 gap-3">
          <Link to="/mock" className="panel flex flex-col justify-between p-4 hover:border-primary">
            <Timer className="h-6 w-6 text-primary" />
            <div><div className="font-bold">Test Archive</div><div className="text-xs text-muted-foreground">Past tests and answer keys</div></div>
          </Link>
          <Link to="/review" className="panel flex flex-col justify-between p-4 hover:border-primary">
            <ListChecks className="h-6 w-6 text-primary" />
            <div><div className="font-bold">Review missed</div><div className="text-xs text-muted-foreground">Every question you got wrong</div></div>
          </Link>
          <Link to="/events" className="panel p-4 hover:border-primary"><div className="font-bold">My events</div><div className="text-xs text-muted-foreground">One per conflict block</div></Link>
          <Link to="/syllabus" className="panel p-4 hover:border-primary"><div className="font-bold">Syllabus</div><div className="text-xs text-muted-foreground">Concepts to master</div></Link>
          {mine && (
            <div className="panel col-span-2 flex items-center justify-between p-4">
              <span className="text-sm text-muted-foreground">This week's rank</span>
              <span className="font-display text-3xl font-extrabold">#{mine.rank}<span className="text-base font-normal text-muted-foreground"> / {board.length}</span></span>
            </div>
          )}
        </div>
      </div>
      <EventAccuracy userId={me.id} />
      <TrendChart userId={me.id} />
    </div>
  );
}
