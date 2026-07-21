import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react';
import { supabase, isSupabaseConfigured, fetchProfile } from '../lib/supabase';
import { dicebearUrl } from '../lib/constants';
import type { UserProfile } from '../lib/supabase';
export type InviteStatus = 'idle' | 'inviting' | 'accepted' | 'rejected' | 'timeout';
export interface DuelRequest {
  id: string;
  senderId: string;
  senderName: string;
  avatar: string;
}
interface DuelContextType {
  // Outgoing state
  inviteStatus: InviteStatus;
  targetId: string | null;
  sendInvite: (id: string, name: string) => void;
  resetInviteState: () => void;
  cancelInvite: () => void;
  
  // Incoming state
  incomingRequest: DuelRequest | null;
  acceptInvite: (roomId: string) => void;
  rejectInvite: () => void;
  
  // Real-time State
  activeDuelRoomId: string | null;
  // Dev Helper
  simulateIncomingInvite: () => void;
}
const DuelContext = createContext<DuelContextType | undefined>(undefined);
export function DuelProvider({ children }: { children: ReactNode }) {
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('idle');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<DuelRequest | null>(null);
  const [activeDuelRoomId, setActiveDuelRoomId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const myProfileRef = useRef<UserProfile | null>(null);
  const targetIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (responseRef.current) clearTimeout(responseRef.current);
  };
  useEffect(() => {
    myProfileRef.current = myProfile;
  }, [myProfile]);
  useEffect(() => {
    targetIdRef.current = targetId;
  }, [targetId]);
  // Load profile on mount
  useEffect(() => {
    fetchProfile().then(p => {
      setMyProfile(p);
    });
  }, []);
  // Supabase Real-time Duel Invitations channel subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !myProfile?.id) return;
    const channel = supabase!.channel('duel_lobby');
    channelRef.current = channel;
    channel
      .on('broadcast', { event: 'invite' }, (payload) => {
        const { senderId, senderName, senderAvatar, targetId } = payload.payload;
        const myId = myProfileRef.current?.id;
        
        if (targetId === myId) {
          setIncomingRequest({
            id: senderId,
            senderId,
            senderName,
            avatar: dicebearUrl(senderAvatar ? senderName : 'Siti')
          });
        }
      })
      .on('broadcast', { event: 'accept' }, (payload) => {
        const { senderId, targetId, roomId } = payload.payload;
        const myId = myProfileRef.current?.id;
        const currentTarget = targetIdRef.current;
        if (targetId === myId && senderId === currentTarget) {
          setActiveDuelRoomId(roomId);
          setInviteStatus('accepted');
        }
      })
      .on('broadcast', { event: 'reject' }, (payload) => {
        const { senderId, targetId } = payload.payload;
        const myId = myProfileRef.current?.id;
        const currentTarget = targetIdRef.current;
        if (targetId === myId && senderId === currentTarget) {
          setInviteStatus('rejected');
        }
      })
      .on('broadcast', { event: 'cancel' }, (payload) => {
        const { senderId, targetId } = payload.payload;
        const myId = myProfileRef.current?.id;
        if (targetId === myId) {
          setIncomingRequest(prev => {
            if (prev && prev.senderId === senderId) {
              return null;
            }
            return prev;
          });
        }
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [myProfile]);
  // Send an invite
  const sendInvite = (id: string, _name: string) => {
    clearTimers();
    setInviteStatus('inviting');
    setTargetId(id);
    setActiveDuelRoomId(null);
    
    // 30s timeout
    timeoutRef.current = setTimeout(() => {
      setInviteStatus(prev => prev === 'inviting' ? 'timeout' : prev);
    }, 30000);
    if (isSupabaseConfigured() && myProfile && channelRef.current) {
      // Send real invite using Supabase Real-time Broadcast
      channelRef.current.send({
        type: 'broadcast',
        event: 'invite',
        payload: {
          senderId: myProfile.id,
          senderName: myProfile.username,
          senderAvatar: myProfile.selected_avatar,
          targetId: id
        }
      });
    } else {
      // Mock response after 3 seconds (Randomly accept or reject)
      responseRef.current = setTimeout(() => {
        setInviteStatus(prev => {
          if (prev === 'inviting') {
            const isAccepted = Math.random() > 0.4; // 60% chance to accept
            if (isAccepted) {
              const mockRoomId = 'R_' + Math.random().toString(36).substring(2, 8).toUpperCase();
              setActiveDuelRoomId(mockRoomId);
              return 'accepted';
            }
            return 'rejected';
          }
          return prev;
        });
      }, 3000);
    }
  };
  const resetInviteState = () => {
    clearTimers();
    setInviteStatus('idle');
    setTargetId(null);
    setActiveDuelRoomId(null);
  };
  const cancelInvite = () => {
    clearTimers();
    if (isSupabaseConfigured() && myProfile && channelRef.current && targetId) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cancel',
        payload: {
          senderId: myProfile.id,
          targetId: targetId
        }
      });
    }
    setInviteStatus('idle');
    setTargetId(null);
    setActiveDuelRoomId(null);
  };
  // Receive an invite (mocked/dev helper)
  const simulateIncomingInvite = () => {
    setIncomingRequest({
      id: 'mock-user-123',
      senderId: 'mock-user-123',
      senderName: 'Siti Rahma',
      avatar: dicebearUrl('Siti')
    });
  };
  const acceptInvite = (roomId: string) => {
    if (incomingRequest) {
      if (isSupabaseConfigured() && myProfile && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'accept',
          payload: {
            senderId: myProfile.id,
            senderName: myProfile.username,
            targetId: incomingRequest.senderId,
            roomId: roomId
          }
        });
      }
      setActiveDuelRoomId(roomId);
    }
    setIncomingRequest(null);
  };
  const rejectInvite = () => {
    if (incomingRequest) {
      if (isSupabaseConfigured() && myProfile && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'reject',
          payload: {
            senderId: myProfile.id,
            targetId: incomingRequest.senderId
          }
        });
      }
    }
    setIncomingRequest(null);
  };
  return (
    <DuelContext.Provider value={{
      inviteStatus,
      targetId,
      sendInvite,
      resetInviteState,
      incomingRequest,
      acceptInvite,
      rejectInvite,
      simulateIncomingInvite,
      activeDuelRoomId,
      cancelInvite
    }}>
      {children}
    </DuelContext.Provider>
  );
}
export function useDuelMatchmaking() {
  const context = useContext(DuelContext);
  if (!context) {
    throw new Error('useDuelMatchmaking must be used within a DuelProvider');
  }
  return context;
}
