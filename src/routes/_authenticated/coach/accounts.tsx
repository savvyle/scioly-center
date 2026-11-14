import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { createAccount, deleteAccount, resetPassword, updateAccount } from "@/lib/accounts.functions";
import { topRole, useMe, type Role } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/coach/accounts")({
  head: () => ({ meta: [{ title: "Accounts · SciOly Center" }, { name: "description", content: "Manage team accounts and roles." }, { property: "og:title", content: "Accounts · SciOly Center" }, { property: "og:description", content: "Manage team accounts and roles." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Accounts,
});

function genPassword() {
  const w = ["atom", "lens", "orbit", "quartz", "fossil", "helix", "proton", "comet", "magma", "ion"];
  return `${w[Math.floor(Math.random() * w.length)]}-${w[Math.floor(Math.random() * w.length)]}-${Math.floor(10 + Math.random() * 89)}`;
}

function Accounts() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const create = useServerFn(createAccount);
  const update = useServerFn(updateAccount);
  const reset = useServerFn(resetPassword);
  const remove = useServerFn(deleteAccount);
  const [f, setF] = useState({ username: "", displayName: "", password: genPassword(), role: "student" as Role, division: "C" as "B" | "C" | "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; username: string } | null>(null);

  const { data: people = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id, username, display_name, teams(division)").order("display_name"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (p ?? []).map((x: any) => ({
        id: x.id, username: x.username, name: x.display_name, division: (x.teams?.division ?? "") as "B" | "C" | "",
        role: topRole((r ?? []).filter((y) => y.user_id === x.id).map((y) => y.role)),
      }));
    },
  });

  async function doCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await create({ data: { ...f, division: f.division || null } });
      toast.success(`Created ${r.username} — password: ${f.password}`, { duration: 15000 });
      setF({ ...f, username: "", displayName: "", password: genPassword() });
      qc.invalidateQueries({ queryKey: ["accounts"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function act(fn: () => Promise<unknown>, msg: string) {
    try {
      await fn();
      toast.success(msg, { duration: 12000 });
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-[22rem_1fr]">
      {me?.isCoach ? (
        <form onSubmit={doCreate} className="panel h-fit space-y-3 p-5">
          <h2 className="text-lg font-bold">New account</h2>
          <p className="text-xs text-muted-foreground">No emails or personal info. Use a pseudonymous username.</p>
          <div className="space-y-1"><Label>Username</Label><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required autoCapitalize="none" /></div>
          <div className="space-y-1"><Label>Display name</Label><Input value={f.displayName} onChange={(e) => setF({ ...f, displayName: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Password</Label><Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={6} /></div>
          <div className="grid grid-cols-2 gap-2">
            <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              <option value="student">Student</option><option value="captain">Captain</option><option value="coach">Coach</option>
            </select>
            <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={f.division} onChange={(e) => setF({ ...f, division: e.target.value as any })}>
              <option value="B">Div B</option><option value="C">Div C</option><option value="">No team</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>Create account</Button>
        </form>
      ) : (
        <div className="panel h-fit p-5 text-sm text-muted-foreground">Captains can reset passwords. Only coaches create accounts or change roles.</div>
      )}
      <div className="panel divide-y divide-border">
        {people.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
            <div className="min-w-32 flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="font-mono text-xs text-muted-foreground">@{p.username}</div>
            </div>
            {me?.isCoach && <Button size="sm" variant="outline" onClick={() => setEditing({ id: p.id, name: p.name, username: p.username })}>Edit name / username</Button>}
            {editing && editing.id === p.id && <form className="flex w-full flex-wrap gap-2" onSubmit={async (e) => { e.preventDefault(); if (!editing) return; try { await update({ data: { userId: editing.id, displayName: editing.name, username: editing.username } }); setEditing(null); qc.invalidateQueries(); toast.success("Account updated"); } catch (error) { toast.error(error instanceof Error ? error.message : "Failed"); } }}>
              <Input aria-label="Display name" className="w-48" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
              <Input aria-label="Username" className="w-48" value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} required />
              <Button type="submit" size="sm">Save</Button><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </form>}
            {me?.isCoach ? (
              <>
                <select className="h-8 rounded-md border border-input bg-card px-1 text-xs" value={p.role} onChange={(e) => act(() => update({ data: { userId: p.id, role: e.target.value as Role } }), "Role updated")}>
                  <option value="student">Student</option><option value="captain">Captain</option><option value="coach">Coach</option>
                </select>
                <select className="h-8 rounded-md border border-input bg-card px-1 text-xs" value={p.division} onChange={(e) => act(() => update({ data: { userId: p.id, division: (e.target.value || null) as any } }), "Team updated")}>
                  <option value="B">Div B</option><option value="C">Div C</option><option value="">—</option>
                </select>
              </>
            ) : (
              <span className="tag">{p.role}{p.division ? ` · ${p.division}` : ""}</span>
            )}
            <Button size="sm" variant="outline" onClick={() => { const pw = genPassword(); act(() => reset({ data: { userId: p.id, password: pw } }), `New password for ${p.username}: ${pw}`); }}>
              Reset password
            </Button>
            {me?.isCoach && p.id !== me.id && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => confirm(`Remove ${p.name}? Their practice history is deleted.`) && act(() => remove({ data: { userId: p.id } }), "Account removed")}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
