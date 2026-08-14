import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_FREE_LIMIT } from "@/lib/site";

export interface Entitlement {
  isPro: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  aiUsed: number;
  aiRemaining: number; // Infinity when Pro
  hasCustomer: boolean;
}

// A subscription in these states grants Pro access (trialing = inside the free trial).
const PRO_STATUSES = new Set(["active", "trialing"]);

export async function getEntitlement(
  supabase: SupabaseClient,
  userId: string,
): Promise<Entitlement> {
  const { data } = await supabase
    .from("profiles")
    .select("subscription_status, current_period_end, ai_generations_used, stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  const status = (data?.subscription_status as string | null) ?? null;
  const isPro = status != null && PRO_STATUSES.has(status);
  const aiUsed = (data?.ai_generations_used as number | null) ?? 0;

  return {
    isPro,
    status,
    currentPeriodEnd: (data?.current_period_end as string | null) ?? null,
    aiUsed,
    aiRemaining: isPro ? Infinity : Math.max(0, AI_FREE_LIMIT - aiUsed),
    hasCustomer: Boolean(data?.stripe_customer_id),
  };
}
