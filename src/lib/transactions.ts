/**
 * Transaction Logging Utility
 * 
 * Provides functions to log all coin, item, energy, and XP transactions
 * for audit trail and anti-cheat purposes.
 */

import { supabase } from './supabase';

export type TransactionType = 'purchase' | 'sell' | 'earn' | 'spend' | 'refund' | 'reward' | 'penalty';
export type TransactionCategory = 'coin' | 'item' | 'energy' | 'xp';

interface TransactionParams {
  type: TransactionType;
  category: TransactionCategory;
  itemId?: string;
  amount: number;
  balanceAfter: number;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Record a transaction in the database
 * 
 * @param params Transaction parameters
 * @returns Transaction ID if successful, null if failed
 */
export async function recordTransaction(params: TransactionParams): Promise<string | null> {
  try {
    if (!supabase) {
      return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user for transaction');
      return null;
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: params.type,
        category: params.category,
        item_id: params.itemId,
        amount: params.amount,
        balance_after: params.balanceAfter,
        source: params.source,
        metadata: params.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to record transaction:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Transaction recording error:', error);
    return null;
  }
}

/**
 * Log a coin purchase (shop item bought)
 */
export async function logCoinPurchase(
  itemId: string,
  cost: number,
  balanceAfter: number,
  metadata?: Record<string, any>
): Promise<string | null> {
  return recordTransaction({
    type: 'purchase',
    category: 'coin',
    itemId,
    amount: -cost, // Negative for spending
    balanceAfter,
    source: 'shop_purchase',
    metadata
  });
}

/**
 * Log item sale (sell back to shop)
 */
export async function logItemSale(
  itemId: string,
  sellPrice: number,
  balanceAfter: number,
  metadata?: Record<string, any>
): Promise<string | null> {
  return recordTransaction({
    type: 'sell',
    category: 'coin',
    itemId,
    amount: sellPrice, // Positive for gaining
    balanceAfter,
    source: 'shop_sellback',
    metadata
  });
}

/**
 * Log coins earned from quiz completion
 */
export async function logQuizReward(
  coinsEarned: number,
  xpEarned: number,
  coinBalanceAfter: number,
  xpBalanceAfter: number,
  quizMode: string,
  sessionId?: string
): Promise<void> {
  // Log coin reward
  await recordTransaction({
    type: 'earn',
    category: 'coin',
    amount: coinsEarned,
    balanceAfter: coinBalanceAfter,
    source: 'quiz_completion',
    metadata: { mode: quizMode, session_id: sessionId }
  });

  // Log XP reward
  await recordTransaction({
    type: 'earn',
    category: 'xp',
    amount: xpEarned,
    balanceAfter: xpBalanceAfter,
    source: 'quiz_completion',
    metadata: { mode: quizMode, session_id: sessionId }
  });
}

/**
 * Log streak bonus coins
 */
export async function logStreakBonus(
  coinsEarned: number,
  balanceAfter: number,
  streakDay: number
): Promise<string | null> {
  return recordTransaction({
    type: 'reward',
    category: 'coin',
    amount: coinsEarned,
    balanceAfter,
    source: 'streak_bonus',
    metadata: { streak_day: streakDay }
  });
}

/**
 * Log quest completion reward
 */
export async function logQuestReward(
  questId: number,
  coinsEarned: number,
  balanceAfter: number
): Promise<string | null> {
  return recordTransaction({
    type: 'reward',
    category: 'coin',
    amount: coinsEarned,
    balanceAfter,
    source: 'quest_completion',
    metadata: { quest_id: questId }
  });
}

/**
 * Log energy purchase
 */
export async function logEnergyPurchase(
  cost: number,
  energyGained: number,
  coinBalanceAfter: number
): Promise<string | null> {
  return recordTransaction({
    type: 'purchase',
    category: 'energy',
    itemId: 'item_energy_refill',
    amount: energyGained,
    balanceAfter: coinBalanceAfter,
    source: 'shop_purchase',
    metadata: { cost, energy_gained: energyGained }
  });
}

/**
 * Log energy consumption (starting a quiz)
 */
export async function logEnergyConsumption(
  energyUsed: number,
  quizMode: string,
  sessionId?: string
): Promise<string | null> {
  return recordTransaction({
    type: 'spend',
    category: 'energy',
    amount: -energyUsed, // Negative for spending
    balanceAfter: 0, // Will be updated by caller
    source: 'quiz_start',
    metadata: { mode: quizMode, session_id: sessionId }
  });
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(
  limit: number = 50,
  category?: TransactionCategory
): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Get transaction statistics for anti-cheat
 */
export async function getTransactionStats(
  timeframe: 'day' | 'week' | 'month' = 'day'
): Promise<{
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  totalPurchases: number;
  suspiciousActivity: boolean;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { totalCoinsEarned: 0, totalCoinsSpent: 0, totalPurchases: 0, suspiciousActivity: false };
    }

    const timeframeDays = timeframe === 'day' ? 1 : timeframe === 'week' ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - timeframeDays);

    const { data: transactions } = await supabase
      .from('transactions')
      .select('type, category, amount')
      .eq('user_id', user.id)
      .eq('category', 'coin')
      .gte('created_at', since.toISOString());

    if (!transactions) {
      return { totalCoinsEarned: 0, totalCoinsSpent: 0, totalPurchases: 0, suspiciousActivity: false };
    }

    let totalCoinsEarned = 0;
    let totalCoinsSpent = 0;
    let totalPurchases = 0;

    transactions.forEach(t => {
      if (t.type === 'earn' || t.type === 'reward') {
        totalCoinsEarned += t.amount;
      } else if (t.type === 'purchase' || t.type === 'spend') {
        totalCoinsSpent += Math.abs(t.amount);
        totalPurchases++;
      }
    });

    // Simple anti-cheat: Flag if earned more than 10000 coins in a day
    const suspiciousActivity = timeframe === 'day' && totalCoinsEarned > 10000;

    return {
      totalCoinsEarned,
      totalCoinsSpent,
      totalPurchases,
      suspiciousActivity
    };
  } catch (error) {
    console.error('Error calculating transaction stats:', error);
    return { totalCoinsEarned: 0, totalCoinsSpent: 0, totalPurchases: 0, suspiciousActivity: false };
  }
}

/**
 * Validate a purchase before processing
 * Checks for suspicious patterns and rate limiting
 */
export async function validatePurchase(
  itemId: string,
  cost: number
): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return { valid: false, reason: 'Koneksi database terputus' };
    }

    // Check recent purchases of the same item
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // Wajib auth
    if (authError || !user) {
      return { valid: false, reason: 'Sesi Anda telah berakhir, silakan login kembali' };
    }

    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

    const { data: recentPurchases, error: queryError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .eq('type', 'purchase')
      .gte('created_at', fiveMinutesAgo.toISOString());

    // If query fails, block purchase
    if (queryError) {
      return { valid: false, reason: 'Gagal memverifikasi server, coba lagi nanti' };
    }

    // Rate limit: Max 10 purchases of same item in 5 minutes
    if (recentPurchases && recentPurchases.length >= 10) {
      return { valid: false, reason: 'Terlalu banyak pembelian dalam waktu singkat' };
    }

    // Check if cost is reasonable (basic sanity check)
    if (cost < 0 || cost > 10000) {
      return { valid: false, reason: 'Harga tidak valid' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Purchase validation error:', error);
    // On error, allow purchase to not block user
    return { valid: true };
  }
}