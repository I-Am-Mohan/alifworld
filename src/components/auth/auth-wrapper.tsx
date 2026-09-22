'use client';

import React from 'react';
import { AuthProvider } from './auth-context';
import { AuthModal } from './auth-modal';
import { AccountSessionModal } from './account-session-modal';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
      <AccountSessionModal />
    </AuthProvider>
  );
}
