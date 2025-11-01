'use client';

import { useSessionStore } from '@/lib/store';
import { ReactNode, useEffect } from 'react';

interface SessionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function SessionGuard({
  children,
  fallback,
}: SessionGuardProps) {
  const { activeSession } = useSessionStore();

  if (!activeSession) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Active Session
            </h2>
            <p className="text-gray-600">
              Please wait for the speaker to start a feedback session.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
