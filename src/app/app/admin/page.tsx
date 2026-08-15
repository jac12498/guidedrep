import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function fmtDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const pct = (a: number, b: number): number => (b > 0 ? Math.round((a / b) * 100) : 0);

const PRO_STATES = new Set(["active", "trialing"]);

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
  const [{ data: profiles }, { data: logs }, { data: programs }, { data: visits }] =
    await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, email, display_name, is_admin, created_at, disclaimer_accepted_at, subscription_status, stripe_customer_id",
        )
        .order("created_at", { ascending: true }),
      admin.from("session_logs").select("user_id, performed_at"),
      admin.from("program_state").select("user_id, completed, started_at"),
      admin.from("site_visits").select("visitor_id, created_at"),
    ]);

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
    subStatus: (p.subscription_status as string | null) ?? null,
    hasCustomer: Boolean(p.stripe_customer_id),
  }));

  const weekAgo = Date.now() - 7 * 86400000;

  // Unique visitors (distinct anonymous browser ids) — top of funnel.
  const visitorSet = new Set<string>();
  const visitorSet7d = new Set<string>();
  for (const v of visits ?? []) {
    const id = v.visitor_id as string;
    visitorSet.add(id);
    if (new Date(v.created_at as string).getTime() >= weekAgo) visitorSet7d.add(id);
  }
  const uniqueVisitors = visitorSet.size;
  const visitors7d = visitorSet7d.size;

  // The funnel measures real prospects, so internal/comp admin accounts are excluded.
  const customers = users.filter((u) => !u.isAdmin);
  const isPro = (s: string | null) => !!s && PRO_STATES.has(s);

  const signedUp = customers.length;
  const onboarded = customers.filter((u) => u.waiver).length;
  const activated = customers.filter((u) => u.workouts >= 1).length;
  const habit = customers.filter((u) => u.workouts >= 3).length;
  const subscribers = customers.filter((u) => isPro(u.subStatus)).length;

  const stages = [
    { label: "Visited site", count: uniqueVisitors, hint: "Unique visitors" },
    { label: "Signed up", count: signedUp, hint: "Created an account" },
    { label: "Onboarded", count: onboarded, hint: "Finished setup + waiver" },
    { label: "First workout", count: activated, hint: "Completed ≥ 1 session" },
    { label: "Building a habit", count: habit, hint: "Completed ≥ 3 sessions" },
    { label: "Pro subscriber", count: subscribers, hint: "Trialing or paying" },
  ];
  const top = Math.max(uniqueVisitors, signedUp, 1);

  const activeThisWeek = customers.filter((u) => u.lastActive && u.lastActive >= weekAgo).length;
  const paying = customers.filter((u) => u.subStatus === "active").length;
  const trialing = customers.filter((u) => u.subStatus === "trialing").length;
  const comp = users.filter((u) => u.isAdmin).length;
  const totalWorkouts = (logs ?? []).length;

  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Growth</h1>
        <Link href="/app/account" className="text-sm text-muted hover:text-foreground">
          ← Account
        </Link>
      </div>

      {/* headline KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Kpi value={uniqueVisitors} label="visitors" sub={visitors7d ? `${visitors7d} / 7d` : undefined} />
        <Kpi value={signedUp} label="customers" />
        <Kpi value={activeThisWeek} label="active / 7d" />
        <Kpi value={subscribers} label="subscribers" accent />
        <Kpi value={totalWorkouts} label="workouts" />
      </div>

      {/* acquisition funnel */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">Acquisition funnel</h2>
          <span className="text-xs text-muted">signup → habit → revenue</span>
        </div>

        {uniqueVisitors === 0 && signedUp === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No traffic yet — the funnel fills in as people visit and sign up. 🌱
          </p>
        ) : (
          <div className="space-y-2.5">
            {stages.map((s, i) => {
              const prev = i === 0 ? s.count : stages[i - 1].count;
              const width = Math.max(4, pct(s.count, top));
              return (
                <div key={s.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted">
                      <span className="tnum font-semibold text-foreground">{s.count}</span>
                      {i > 0 ? (
                        <span className="ml-2 tnum">{pct(s.count, prev)}% of prev</span>
                      ) : (
                        <span className="ml-2 tnum">100%</span>
                      )}
                    </span>
                  </div>
                  <div className="h-7 w-full overflow-hidden rounded-lg bg-surface-2">
                    <div
                      className="flex h-full items-center rounded-lg bg-brand/80 px-2"
                      style={{ width: `${width}%` }}
                    >
                      <span className="truncate text-[11px] font-semibold text-black">{s.hint}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted">
              <span>
                Visitor → signup:{" "}
                <span className="tnum font-semibold text-foreground">{pct(signedUp, uniqueVisitors)}%</span>
              </span>
              <span>
                Signup → subscriber:{" "}
                <span className="tnum font-semibold text-foreground">{pct(subscribers, signedUp)}%</span>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* revenue snapshot */}
      <section className="mb-6 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold">Subscribers</h2>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat value={paying} label="paying" />
          <MiniStat value={trialing} label="on trial" />
          <MiniStat value={comp} label="comp (admin)" />
        </div>
      </section>

      {/* per-customer list */}
      <h2 className="mb-2 text-sm font-semibold text-muted">
        All accounts ({users.length})
      </h2>
      <div className="space-y-3">
        {users.map((u) => {
          const pro = isPro(u.subStatus);
          return (
            <div key={u.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{u.name || "(no name)"}</span>
                    {u.isAdmin ? (
                      <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand">
                        admin
                      </span>
                    ) : null}
                    {pro ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400">
                        {u.subStatus === "trialing" ? "trial" : "pro"}
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
                <span>Program {u.programDone} days</span>
                <span className={u.waiver ? "text-emerald-400" : "text-red-400"}>
                  {u.waiver ? `✓ waiver` : "✗ no waiver"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({
  value,
  label,
  accent,
  sub,
}: {
  value: number;
  label: string;
  accent?: boolean;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className={`text-2xl font-bold tnum ${accent ? "text-emerald-400" : "text-brand"}`}>
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
      {sub ? <div className="text-[10px] text-muted/70 tnum">{sub}</div> : null}
    </div>
  );
}

function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-center">
      <div className="text-xl font-bold tnum">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
