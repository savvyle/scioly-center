import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Atom, Brain, Timer, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SciOly@KLS Practice Hub" },
      { name: "description", content: "KLS Science Olympiad practice: past tournament questions, spaced repetition and weekly goals." },
      { property: "og:title", content: "SciOly@KLS Practice Hub" },
      { property: "og:description", content: "KLS Science Olympiad practice: past tournament questions, spaced repetition and weekly goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        <Atom className="h-4 w-4 text-accent" /> KLS Science Olympiad
      </div>
      <h1 className="text-5xl font-extrabold leading-[0.95] sm:text-6xl">
        Practice <span className="text-primary">every</span> past test.
        <br />
        <span className="bg-accent px-2 text-accent-foreground">Miss less.</span>
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        The team's private question bank. Drill one question at a time, missed ones come back until they stick.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
        {[
          [Brain, "Spaced review"],
          [Timer, "50-min mocks"],
          [Trophy, "Weekly board"],
        ].map(([Icon, label]: any) => (
          <div key={label} className="panel flex flex-col items-start gap-2 p-3">
            <Icon className="h-5 w-5 text-primary" />
            <span className="font-medium">{label}</span>
          </div>
        ))}
      </div>
      <Button asChild variant="hero" size="lg" className="mt-8 w-full">
        <Link to="/auth">Sign in</Link>
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Accounts are made by your coach.</p>
    </main>
  );
}
