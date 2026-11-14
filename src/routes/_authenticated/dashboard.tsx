import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/auth";
import { leaderboardQuery, settingsQuery } from "@/lib/data";
import { GoalBar } from "@/components/app/GoalBar";
import { MyEventProgress } from "@/components/app/MyEventProgress";
import { Leaderboard } from "@/components/app/Leaderboard";
import { Brain } from "lucide-react";

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
        <Link to="/practice"><Brain /> Practice</Link>
      </Button>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <MyEventProgress userId={me.id} />
        <GoalBar answered={mine?.answered ?? 0} correct={mine?.correct ?? 0} goal={goal} />
      </div>
      <Leaderboard />
    </div>
  );
}
