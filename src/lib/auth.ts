import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const EMAIL_DOMAIN = "kls.local";
export function normalizeUsername(u: string) {
  return u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}
export function usernameToEmail(u: string) {
  return `${normalizeUsername(u)}@${EMAIL_DOMAIN}`;
}

export type Role = "student" | "captain" | "coach";
export type Me = {
  id: string;
  username: string;
  displayName: string;
  teamId: string | null;
  division: "B" | "C" | null;
  role: Role;
  isStaff: boolean;
  isCoach: boolean;
};

export function topRole(roles: string[]): Role {
  if (roles.includes("coach")) return "coach";
  if (roles.includes("captain")) return "captain";
  return "student";
}

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, username, display_name, team_id, teams(division)").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    const role = topRole((r ?? []).map((x) => x.role));
    const team = (p as any)?.teams as { division: "B" | "C" } | null;
    return {
      id: u.user.id,
      username: p?.username ?? u.user.email?.split("@")[0] ?? "",
      displayName: p?.display_name ?? "",
      teamId: p?.team_id ?? null,
      division: team?.division ?? null,
      role,
      isStaff: role !== "student",
      isCoach: role === "coach",
    };
  },
  staleTime: 60_000,
});

export function useMe() {
  return useQuery(meQuery);
}
