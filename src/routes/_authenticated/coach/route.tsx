import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMe } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  component: CoachLayout,
});

function CoachLayout() {
  const { data: me, isLoading } = useMe();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (isLoading) return null;
  if (!me?.isStaff) return <div className="panel p-6">This area is for captains and coaches.</div>;
  const tabs = [
    { to: "/coach", label: "Progress" },
    { to: "/coach/upload", label: "Upload" },
    { to: "/coach/queue", label: "Review queue" },
    { to: "/coach/accounts", label: "Accounts" },
    ...(me.isCoach ? [{ to: "/coach/settings", label: "Settings" }] : []),
  ] as const;
  return (
    <div className="space-y-5">
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} className={cn("whitespace-nowrap rounded-full border border-border px-3 py-1 text-sm", (t.to === "/coach" ? path === "/coach" || path === "/coach/" : path.startsWith(t.to)) && "border-foreground bg-foreground text-background")}>
            {t.label}
          </Link>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
