/**
 * TEMPORARY FIX: transactions.ts with guest mode support
 * This allows testing transaction logging without auth
 */

import { supabase } from "./supabase";

// Add this function to check if we are in guest mode
export function isGuestMode(): boolean {
  return !supabase || supabase === null;
}

// Modified validatePurchase for guest mode
export async function validatePurchase(
  itemId: string,
  cost: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Guest mode: Skip server validation
    if (isGuestMode()) {
      console.log("[Guest Mode] Skipping purchase validation");
      return { valid: true };
    }

    // Check recent purchases of the same item
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // No user but Supabase connected: allow for testing
      console.log("[No Auth] Skipping purchase validation");
      return { valid: true };
    }

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: recentPurchases } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_id", itemId)
      .eq("type", "purchase")
      .gte("created_at", fiveMinutesAgo.toISOString());

    // Rate limit: Max 10 purchases of same item in 5 minutes
    if (recentPurchases && recentPurchases.length >= 10) {
      return { valid: false, reason: "Terlalu banyak pembelian dalam waktu singkat" };
    }

    // Check if cost is reasonable (basic sanity check)
    if (cost < 0 || cost > 10000) {
      return { valid: false, reason: "Harga tidak valid" };
    }

    return { valid: true };
  } catch (error) {
    console.error("Purchase validation error:", error);
    // On error, allow purchase to not block user
    return { valid: true };
  }
}
