import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeDays } from "@/lib/program";

function fmtDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AdminPage() {
  if (!supabaseConfigured) redirect("/app");

  // Gate: must be signed in AND flagged is_admin (checked via the user's own session).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/app/login");
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) redirect("/app");

  const admin = createAdminClient();
  if (!admin) {
    return (
      <div className="pt-10">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-muted">
          Service-role key not configured. Set <code>SUPABASE_SERVICE_ROLE_KEY</code> to enable the
          dashboard.
        </p>
      </div>
    );
  }

  // Read across all users (service role bypasses RLS). Fine for a small user base;
  // for scale, move the aggregation into a SQL view / RPC.
  const [{ data: profiles }, { data: logs }, { data: programs }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, display_name, is_admin, created_at, disclaimer_accepted_at")
      .order("created_at", { ascending: true }),
    admin.from("session_logs").select("user_id, performed_at"),
    admin.from("program_state").select("user_id, completed, started_at"),
  ]);

  const totalActive = activeDays().length;

  const logStats = new Map<string, { count: number; last: number }>();
  for (const l of logs ?? []) {
    const t = new Date(l.performed_at as string).getTime();
    const cur = logStats.get(l.user_id as string) ?? { count: 0, last: 0 };
    cur.count += 1;
    cur.last = Math.max(cur.last, t);
    logStats.set(l.user_id as string, cur);
  }
  const progStats = new Map<string, number>();
  for (const p of programs ?? []) {
    progStats.set(p.user_id as string, (p.completed as string[] | null)?.length ?? 0);
  }

  const users = (profiles ?? []).map((p) => ({
    id: p.id as string,
    name: (p.display_name as string | null) ?? null,
    email: (p.email as string | null) ?? "",
    isAdmin: (p.is_admin as boolean) ?? false,
    joined: new Date(p.created_at as string).getTime(),
    waiver: p.disclaimer_accepted_at ? new Date(p.disclaimer_accepted_at as string).getTime() : null,
    workouts: logStats.get(p.id as string)?.count ?? 0,
    lastActive: logStats.get(p.id as string)?.last ?? null,
    programDone: progStats.get(p.id as string) ?? 0,
  }));

  const weekAgo = Date.now() - 7 * 86400000;
  const activeThisWeek = users.filter((u) => u.lastActive && u.lastActive >= weekAgo).length;
  const totalWorkouts = (logs ?? []).length;

  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Link href="/app/account" className="text-sm text-muted hover:text-foreground">
          ← Account
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat value={users.length} label="users" />
        <Stat value={totalWorkouts} label="workouts" />
        <Stat value={activeThisWeek} label="active / 7d" />
      </div>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{u.name || "(no name)"}</span>
                  {u.isAdmin ? (
                    <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
                      admin
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-sm text-muted">{u.email}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-brand tnum">{u.workouts}</div>
                <div className="text-xs text-muted">workouts</div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted">
              <span>Joined {fmtDate(u.joined)}</span>
              <span>Last active {fmtDate(u.lastActive)}</span>
              <span>
                Program {u.programDone}/{totalActive}
              </span>
              <span className={u.waiver ? "text-work" : "text-red-400"}>
                {u.waiver ? `✓ waiver ${fmtDate(u.waiver)}` : "✗ no waiver"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className="text-2xl font-bold text-brand tnum">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
