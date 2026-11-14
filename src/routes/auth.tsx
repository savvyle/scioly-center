import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usernameToEmail } from "@/lib/auth";
import { needsSetup } from "@/lib/accounts.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · SciOly@KLS" },
      { name: "description", content: "Sign in to the KLS Science Olympiad practice hub." },
      { property: "og:title", content: "Sign in · SciOly@KLS" },
      { property: "og:description", content: "Sign in to the KLS Science Olympiad practice hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = useQuery({ queryKey: ["needs-setup"], queryFn: () => needsSetup() });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
    setBusy(false);
    if (error) { toast.error("Wrong username or password."); return; }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Link to="/" className="mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        ← SciOly@KLS
      </Link>
      <h1 className="text-4xl font-extrabold">Sign in</h1>
      <p className="mt-2 text-muted-foreground">Use the username your coach gave you. Parents: use your child's login.</p>
      <form onSubmit={submit} className="panel mt-6 space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="u">Username</Label>
          <Input id="u" autoCapitalize="none" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="h-12 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p">Password</Label>
          <Input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 text-base" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">Forgot your password? Ask a captain or coach to reset it.</p>
      {setup.data?.needsSetup && (
        <div className="panel mt-6 border-accent p-4 text-sm">
          No coach account exists yet.{" "}
          <Link to="/setup" className="font-semibold text-primary underline">Set up the first coach →</Link>
        </div>
      )}
    </main>
  );
}
