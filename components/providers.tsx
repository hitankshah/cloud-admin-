'use client';

import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { NotificationDisplay } from './notification-display';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <NotificationDisplay />
      </NotificationProvider>
    </AuthProvider>
  );
}