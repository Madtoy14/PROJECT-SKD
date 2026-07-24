/**
 * Supabase Helper Functions
 * 
 * Additional utility functions for working with Supabase
 */

import { supabase } from './supabase';

/**
 * Call server-side energy validation function
 */
export async function validateEnergyServerSide(
  userId: string,
  energyRequired: number
): Promise<{ valid: boolean; currentEnergy: number; message: string }> {
  if (!supabase) {
    return { valid: false, currentEnergy: 0, message: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('validate-energy', {
      body: { userId, energyRequired }
    });

    if (error) throw error;

    return {
      valid: data.valid,
      currentEnergy: data.currentEnergy,
      message: data.message
    };
  } catch (error) {
    console.error('Energy validation failed:', error);
    return { valid: false, currentEnergy: 0, message: 'Validation error' };
  }
}

/**
 * Call server-side quiz score validation
 */
export async function validateQuizScoreServerSide(
  sessionId: string,
  answers: Record<string, string>,
  claimedScore: number
): Promise<{
  valid: boolean;
  actualScore: number;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
  message: string;
}> {
  if (!supabase) {
    return {
      valid: false,
      actualScore: 0,
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      message: 'Supabase not configured'
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('validate-quiz-score', {
      body: { sessionId, answers, claimedScore }
    });

    if (error) throw error;

    return {
      valid: data.valid,
      actualScore: data.actualScore,
      twkScore: data.twkScore,
      tiuScore: data.tiuScore,
      tkpScore: data.tkpScore,
      message: data.message
    };
  } catch (error) {
    console.error('Score validation failed:', error);
    return {
      valid: false,
      actualScore: 0,
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      message: 'Validation error'
    };
  }
}

/**
 * Calculate user's current energy with server-side regeneration
 */
export async function calculateUserEnergy(userId: string): Promise<number> {
  if (!supabase) return 0;

  try {
    const { data, error } = await supabase.rpc('calculate_user_energy', {
      p_user_id: userId
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Failed to calculate energy:', error);
    return 0;
  }
}

/**
 * Get active quiz session for user
 */
export async function getActiveQuizSession(userId: string): Promise<any | null> {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_active_quiz_session', {
      p_user_id: userId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get active session:', error);
    return null;
  }
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  type: 'daily' | 'weekly' | 'alltime' = 'alltime',
  limit: number = 100
): Promise<any[]> {
  if (!supabase) return [];

  try {
    const viewName = `leaderboard_${type}`;
    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return [];
  }
}

/**
 * Get user's friends list
 */
export async function getFriends(userId: string): Promise<any[]> {
  if (!supabase) return [];

  try {
    // Get accepted friendships where user is either user_id or friend_id
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        user:profiles!friends_user_id_fkey(id, username, level, avatar_url),
        friend:profiles!friends_friend_id_fkey(id, username, level, avatar_url)
      `)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    // Map to friend profiles
    const friends = (data || []).map((friendship: any) => {
      if (friendship.user_id === userId) {
        return { ...friendship.friend, friendship_id: friendship.id };
      } else {
        return { ...friendship.user, friendship_id: friendship.id };
      }
    });

    return friends;
  } catch (error) {
    console.error('Failed to fetch friends:', error);
    return [];
  }
}

/**
 * Get pending friend requests for user
 */
export async function getPendingFriendRequests(userId: string): Promise<any[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        created_at,
        user:profiles!friends_user_id_fkey(id, username, level, avatar_url)
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending');

    if (error) throw error;

    return (data || []).map((req: any) => ({
      request_id: req.id,
      ...req.user,
      requested_at: req.created_at
    }));
  } catch (error) {
    console.error('Failed to fetch friend requests:', error);
    return [];
  }
}

/**
 * Instagram-style follow: insert accepted immediately (no pending gate).
 * Mutual follow = rival (caller re-queries mutuals).
 */
export async function sendFriendRequest(userId: string, friendId: string): Promise<boolean> {
  if (!supabase || !userId || !friendId || userId === friendId) return false;

  try {
    const { error } = await supabase
      .from('friends')
      .upsert(
        {
          user_id: userId,
          friend_id: friendId,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,friend_id' }
      );

    if (error) throw error;

    // Non-blocking notif
    void supabase.from('notifications').insert({
      user_id: friendId,
      type: 'friend_request',
      title: 'Pengikut Baru',
      message: 'Seseorang mulai mengikuti Anda!',
    });

    return true;
  } catch (error) {
    console.error('Failed to follow:', error);
    return false;
  }
}

/** Unfollow: hapus edge user → friend */
export async function unfollowUser(userId: string, friendId: string): Promise<boolean> {
  if (!supabase || !userId || !friendId) return false;
  try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to unfollow:', error);
    return false;
  }
}

/** Count pengikut / mengikuti (status accepted) */
export async function getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  if (!supabase || !userId) return { followers: 0, following: 0 };
  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('friends').select('id', { count: 'exact', head: true }).eq('friend_id', userId).eq('status', 'accepted'),
      supabase.from('friends').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'accepted'),
    ]);
    return {
      followers: followersRes.count || 0,
      following: followingRes.count || 0,
    };
  } catch {
    return { followers: 0, following: 0 };
  }
}

/** Apakah saya follow target */
export async function isFollowing(userId: string, friendId: string): Promise<boolean> {
  if (!supabase || !userId || !friendId) return false;
  const { data } = await supabase
    .from('friends')
    .select('id')
    .eq('user_id', userId)
    .eq('friend_id', friendId)
    .eq('status', 'accepted')
    .maybeSingle();
  return !!data;
}

/**
 * Mutual follows = rival list (both edges accepted).
 * Shape kompatibel UI Profile rival cards.
 */
export async function getMutualRivals(userId: string): Promise<Array<{
  id: string;
  name: string;
  username: string;
  online: boolean;
  avatar: string;
  score: number;
}>> {
  if (!supabase || !userId) return [];
  try {
    const { data: following } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');
    if (!following?.length) return [];
    const followingIds = following.map((f) => f.friend_id);

    const { data: mutuals } = await supabase
      .from('friends')
      .select('user_id')
      .eq('friend_id', userId)
      .eq('status', 'accepted')
      .in('user_id', followingIds);
    if (!mutuals?.length) return [];
    const mutualIds = mutuals.map((m) => m.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, nickname, score, selected_avatar, last_login')
      .in('id', mutualIds);
    if (!profiles) return [];

    const now = Date.now();
    return profiles.map((p: any) => {
      const last = p.last_login ? new Date(p.last_login).getTime() : 0;
      return {
        id: p.id,
        name: p.nickname || p.username,
        username: `@${String(p.username || '').toLowerCase()}`,
        online: (now - last) / (1000 * 60) <= 15,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.username || p.id)}`,
        score: p.score || 0,
      };
    });
  } catch (error) {
    console.error('Failed to fetch mutual rivals:', error);
    return [];
  }
}

/**
 * Accept friend request (legacy pending rows)
 */
export async function acceptFriendRequest(requestId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('friends')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to accept friend request:', error);
    return false;
  }
}

/**
 * Get user notifications
 */
export async function getNotifications(
  userId: string,
  unreadOnly: boolean = false
): Promise<any[]> {
  if (!supabase) return [];

  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Subscribe to real-time duel updates
 */
export function subscribeToDuels(
  userId: string,
  onUpdate: (payload: any) => void
) {
  if (!supabase) return null;

  const channel = supabase
    .channel('duels')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'duels',
        filter: `opponent_id=eq.${userId}`
      },
      onUpdate
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to real-time notifications
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (payload: any) => void
) {
  if (!supabase) return null;

  const channel = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      onNotification
    )
    .subscribe();

  return channel;
}
