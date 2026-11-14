import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { MissedList } from "@/components/app/MissedList";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Missed questions · SciOly Center" }, { name: "description", content: "Every question you got wrong." }, { property: "og:title", content: "Missed questions · SciOly Center" }, { property: "og:description", content: "Every question you got wrong." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Review,
});

function Review() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Review missed</h1>
      <p className="text-muted-foreground">Missed questions also return in Practice automatically until you get them right.</p>
      <MissedList userId={me.id} />
    </div>
  );
}
