'use client';

import React from 'react';
import { AuthProvider } from './auth-context';
import { AuthModal } from './auth-modal';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModal />
    </AuthProvider>
  );
}
