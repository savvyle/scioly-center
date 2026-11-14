import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SciOly Center" },
      { name: "description", content: "KLS Science Olympiad practice: past tournament questions, spaced repetition and weekly goals." },
      { property: "og:title", content: "SciOly Center" },
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
      <h1 className="text-center text-6xl font-extrabold leading-none sm:text-7xl">
        SciOly <span className="text-accent">Center</span>
      </h1>
      <Button asChild variant="hero" size="lg" className="mt-8 w-full">
        <Link to="/auth">Sign in</Link>
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">Accounts are made by your coach.</p>
    </main>
  );
}
