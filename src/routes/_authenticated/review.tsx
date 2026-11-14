import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { MissedList } from "@/components/app/MissedList";
import { SavedList } from "@/components/app/SavedList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({ meta: [{ title: "Review · SciOly Center" }, { name: "description", content: "Review your saved and missed Science Olympiad questions." }, { property: "og:title", content: "Review · SciOly Center" }, { property: "og:description", content: "Review saved questions and learn from missed answers." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Review,
});

function Review() {
  const { data: me } = useMe();
  if (!me) return null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Review</h1>
      <Tabs defaultValue="saved"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="saved">Saved</TabsTrigger><TabsTrigger value="missed">Missed</TabsTrigger></TabsList><TabsContent value="saved"><SavedList userId={me.id} /></TabsContent><TabsContent value="missed"><MissedList userId={me.id} /></TabsContent></Tabs>
    </div>
  );
}
