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
            <p className="text-gray-600 mb-4">
              The speaker hasn't started a feedback session yet.
            </p>
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              💡 <strong>Tip:</strong> This page will automatically update when a session becomes available. Keep this page open and wait for the speaker to begin.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
