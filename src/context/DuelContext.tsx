import React, { createContext, useContext, useState, useRef, type ReactNode } from 'react';

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
  
  // Incoming state
  incomingRequest: DuelRequest | null;
  acceptInvite: () => void;
  rejectInvite: () => void;
  
  // Dev Helper
  simulateIncomingInvite: () => void;
}

const DuelContext = createContext<DuelContextType | undefined>(undefined);

export function DuelProvider({ children }: { children: ReactNode }) {
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('idle');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<DuelRequest | null>(null);
  
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (responseRef.current) clearTimeout(responseRef.current);
  };

  // Send an invite (mocked)
  const sendInvite = (id: string, name: string) => {
    clearTimers();
    setInviteStatus('inviting');
    setTargetId(id);
    
    // 30s timeout
    timeoutRef.current = setTimeout(() => {
      setInviteStatus(prev => prev === 'inviting' ? 'timeout' : prev);
    }, 30000);

    // Mock response after 3 seconds (Randomly accept or reject)
    responseRef.current = setTimeout(() => {
      setInviteStatus(prev => {
        if (prev === 'inviting') {
          const isAccepted = Math.random() > 0.4; // 60% chance to accept
          return isAccepted ? 'accepted' : 'rejected';
        }
        return prev;
      });
    }, 3000);
  };

  const resetInviteState = () => {
    clearTimers();
    setInviteStatus('idle');
    setTargetId(null);
  };

  // Receive an invite (mocked)
  const simulateIncomingInvite = () => {
    setIncomingRequest({
      id: Math.random().toString(36).substring(7),
      senderId: 'mock-user-123',
      senderName: 'Siti Rahma',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Siti'
    });
  };

  const acceptInvite = () => {
    setIncomingRequest(null);
    // Real implementation would broadcast ACCEPTED to sender
  };

  const rejectInvite = () => {
    setIncomingRequest(null);
    // Real implementation would broadcast REJECTED to sender
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
      simulateIncomingInvite
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
