import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DOMAIN = "kls.local";
const norm = (u: string) => u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
const TEAM = { B: "00000000-0000-0000-0000-0000000000b1", C: "00000000-0000-0000-0000-0000000000c1" } as const;

async function roleOf(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role as string);
  return roles.includes("coach") ? "coach" : roles.includes("captain") ? "captain" : "student";
}

export const needsSetup = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "coach");
  return { needsSetup: (count ?? 0) === 0 };
});

export const bootstrapCoach = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ username: z.string().min(2).max(40), displayName: z.string().min(1).max(80), password: z.string().min(8).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "coach");
    if ((count ?? 0) > 0) throw new Error("Setup is already complete. Ask a coach for an account.");
    return createUser(supabaseAdmin, { ...data, role: "coach", division: null });
  });

async function createUser(
  admin: any,
  d: { username: string; displayName: string; password: string; role: "student" | "captain" | "coach"; division: "B" | "C" | null },
) {
  const username = norm(d.username);
  if (username.length < 2) throw new Error("Username needs at least 2 letters or numbers.");
  const { data: created, error } = await admin.auth.admin.createUser({
    email: `${username}@${DOMAIN}`,
    password: d.password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) throw new Error(error.message.includes("already") ? "That username is taken." : error.message);
  const id = created.user.id;
  const { error: pe } = await admin.from("profiles").insert({
    id,
    username,
    display_name: d.displayName,
    team_id: d.division ? TEAM[d.division] : null,
  });
  if (pe) {
    await admin.auth.admin.deleteUser(id);
    throw new Error(pe.message);
  }
  await admin.from("user_roles").insert({ user_id: id, role: d.role });
  return { id, username };
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        username: z.string().min(2).max(40),
        displayName: z.string().min(1).max(80),
        password: z.string().min(6).max(100),
        role: z.enum(["student", "captain", "coach"]),
        division: z.enum(["B", "C"]).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if ((await roleOf(context.supabase, context.userId)) !== "coach") throw new Error("Only coaches can create accounts.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return createUser(supabaseAdmin, data);
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        userId: z.string().uuid(),
        displayName: z.string().trim().min(1).max(80).optional(),
        username: z.string().min(2).max(40).optional(),
        role: z.enum(["student", "captain", "coach"]).optional(),
        division: z.enum(["B", "C"]).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if ((await roleOf(context.supabase, context.userId)) !== "coach") throw new Error("Only coaches can change accounts.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { display_name?: string; username?: string; team_id?: string | null } = {};
    if (data.username !== undefined) {
      const username = norm(data.username);
      if (username.length < 2) throw new Error("Username needs at least 2 letters or numbers.");
      const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("username", username).neq("id", data.userId).maybeSingle();
      if (existing) throw new Error("That username is taken.");
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { email: `${username}@${DOMAIN}`, email_confirm: true, user_metadata: { username } });
      if (error) throw new Error(error.message);
      patch.username = username;
    }
    if (data.displayName) patch.display_name = data.displayName;
    if (data.division !== undefined) patch.team_id = data.division ? TEAM[data.division] : null;
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
      if (error) throw new Error(error.message);
    }
    if (data.role) {
      if (data.userId === context.userId && data.role !== "coach") throw new Error("You can't remove your own coach role.");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    }
    return { ok: true };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), password: z.string().min(6).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const mine = await roleOf(context.supabase, context.userId);
    if (mine === "student") throw new Error("Only captains and coaches can reset passwords.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const target = await roleOf(supabaseAdmin, data.userId);
    if (mine === "captain" && target === "coach") throw new Error("Captains can't reset a coach's password.");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if ((await roleOf(context.supabase, context.userId)) !== "coach") throw new Error("Only coaches can remove accounts.");
    if (data.userId === context.userId) throw new Error("You can't remove yourself.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
