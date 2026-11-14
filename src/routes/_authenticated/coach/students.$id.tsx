import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { leaderboardQuery, settingsQuery } from "@/lib/data";
import { GoalBar } from "@/components/app/GoalBar";
import { EventAccuracy, TrendChart } from "@/components/app/StatsPanels";
import { MissedList } from "@/components/app/MissedList";

export const Route = createFileRoute("/_authenticated/coach/students/$id")({
  head: () => ({ meta: [{ title: "Student · SciOly Center" }, { name: "description", content: "Per-student practice stats." }] }),
  component: Student,
});

function Student() {
  const { id } = Route.useParams();
  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => (await supabase.from("profiles").select("display_name, username, teams(division)").eq("id", id).maybeSingle()).data,
  });
  const { data: goal } = useQuery(settingsQuery);
  const { data: board = [] } = useQuery(leaderboardQuery(0));
  const row = board.find((r) => r.user_id === id);
  return (
    <div className="space-y-4">
      <Link to="/coach" className="text-sm text-muted-foreground">← Team</Link>
      <h1 className="text-2xl font-extrabold">{profile?.display_name} <span className="font-mono text-sm font-normal text-muted-foreground">@{profile?.username}</span></h1>
      {goal && <GoalBar answered={row?.answered ?? 0} correct={row?.correct ?? 0} goal={goal} />}
      <EventAccuracy userId={id} />
      <TrendChart userId={id} />
      <h2 className="text-xl font-bold">Missed questions</h2>
      <MissedList userId={id} />
    </div>
  );
}
