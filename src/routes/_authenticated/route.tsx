import { createFileRoute, Link, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { BarChart3, Brain, Home, ListChecks, LogOut, Timer, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/drill", label: "Practice", icon: Brain },
  { to: "/mock", label: "Test Archive", icon: Timer },
  { to: "/review", label: "Review", icon: ListChecks },
  { to: "/leaderboard", label: "Board", icon: Trophy },
] as const;

function Shell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const nav = me?.isStaff ? [...NAV, { to: "/coach", label: "Coach", icon: BarChart3 } as const] : NAV;

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link to="/dashboard" className="font-display text-lg font-extrabold">
            SciOly <span className="text-accent">Center</span>
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className={cn("rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground", path.startsWith(n.to) && "bg-secondary text-foreground")}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {me && (
              <span className="text-right text-xs leading-tight">
                <span className="block font-semibold">{me.displayName}</span>
                <span className="font-mono text-muted-foreground">{me.role}{me.division ? ` · Div ${me.division}` : ""}</span>
              </span>
            )}
            <button onClick={signOut} aria-label="Sign out" className="rounded-md p-2 text-muted-foreground hover:bg-secondary">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
          {nav.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-muted-foreground", active && "text-primary")}>
                <n.icon className={cn("h-5 w-5", active && "text-accent")} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
