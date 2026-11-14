import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapCoach } from "@/lib/accounts.functions";
import { usernameToEmail } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "First-time setup · SciOly@KLS" },
      { name: "description", content: "Create the first coach account for the practice hub." },
      { property: "og:title", content: "First-time setup · SciOly@KLS" },
      { property: "og:description", content: "Create the first coach account for the practice hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Setup,
});

function Setup() {
  const navigate = useNavigate();
  const run = useServerFn(bootstrapCoach);
  const [f, setF] = useState({ username: "", displayName: "", password: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await run({ data: f });
      await supabase.auth.signInWithPassword({ email: usernameToEmail(f.username), password: f.password });
      navigate({ to: "/coach/accounts", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-4xl font-extrabold">First coach</h1>
      <p className="mt-2 text-muted-foreground">This only works once. After that, coaches create every account.</p>
      <form onSubmit={submit} className="panel mt-6 space-y-4 p-5">
        <div className="space-y-1.5"><Label>Username</Label><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoCapitalize="none" /></div>
        <div className="space-y-1.5"><Label>Display name</Label><Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required /></div>
        <div className="space-y-1.5"><Label>Password (8+ characters)</Label><Input type="password" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Creating…" : "Create coach account"}</Button>
      </form>
    </main>
  );
}
