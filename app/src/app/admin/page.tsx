'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import { SessionSummary } from '@/lib/types';
import FeedbackChart from '@/components/FeedbackChart';
import NpsStrip from '@/components/NpsStrip';
import WordCloud from '@/components/WordCloud';

export default function AdminPage() {
  const router = useRouter();
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { activeSession, sessions, fetchSessions } = useSessionStore();

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  useEffect(() => {
    if (activeSession) {
      loadSummary(activeSession.id);
      const interval = setInterval(() => loadSummary(activeSession.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret) {
      setError('Please enter admin secret');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify admin secret using dedicated auth endpoint
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminSecret }),
      });

      const data = await response.json();

      if (response.status === 401 || data.error === 'Unauthorized') {
        setError('Invalid admin secret. Please check and try again.');
      } else if (data.success) {
        setIsAuthenticated(true);
        setError('');
      } else {
        setError('Unable to verify admin credentials');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    if (!sessionName.trim()) {
      setError('Please enter a session name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sessionName, adminSecret }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionName('');
        await fetchSessions();
      } else if (response.status === 401 || data.error === 'Unauthorized') {
        setError('Authentication failed. Your admin secret may have expired. Please refresh and login again.');
        setIsAuthenticated(false);
      } else {
        setError(data.error || 'Failed to create session');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const closeSession = async (sessionId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, adminSecret }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchSessions();
      } else if (response.status === 401 || data.error === 'Unauthorized') {
        setError('Authentication failed. Your admin secret may have expired. Please refresh and login again.');
        setIsAuthenticated(false);
      } else {
        setError(data.error || 'Failed to close session');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reactivateSession = async (sessionId: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, adminSecret }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchSessions();
      } else if (response.status === 401 || data.error === 'Unauthorized') {
        setError('Authentication failed. Your admin secret may have expired. Please refresh and login again.');
        setIsAuthenticated(false);
      } else {
        setError(data.error || 'Failed to reactivate session');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/summary?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    }
  };

  const viewSessionSummary = async (sessionId: string) => {
    await loadSummary(sessionId);
  };

  const exportCSV = () => {
    if (activeSession) {
      window.open(
        `/api/export?sessionId=${activeSession.id}&adminSecret=${encodeURIComponent(adminSecret)}`,
        '_blank'
      );
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Admin Access
            </h1>
            <p className="text-gray-600">
              Enter your admin secret to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Admin Secret"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-800 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🎤 Speaker Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage sessions and view live feedback
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              ← Audience View
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Session Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Session Management
          </h2>

          {activeSession ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="font-semibold text-green-900">
                      {activeSession.name}
                    </span>
                  </div>
                  <div className="text-sm text-green-700 mt-1">
                    Active since {new Date(activeSession.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => closeSession(activeSession.id)}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  Close Session
                </button>
              </div>

              {summary && (
                <div className="flex gap-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {summary.totalSubmissions}
                    </div>
                    <div className="text-sm text-gray-600">Submissions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {summary.npsScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Rating</div>
                  </div>
                  <div className="flex-1 text-right">
                    <button
                      onClick={exportCSV}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      📥 Export CSV
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">No active session. Create one to start collecting feedback.</p>
              
              <div className="flex gap-3">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Session name (e.g., Azure AI Workshop - Morning)"
                  className="flex-1 px-4 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                />
                <button
                  onClick={createSession}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  Create Session
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Live Summary */}
        {summary && summary.totalSubmissions > 0 ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Live Results
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FeedbackChart feedback={summary.averageFeedback} />
              <NpsStrip
                npsDistribution={summary.npsDistribution}
                averageScore={summary.npsScore}
              />
            </div>

            <WordCloud words={summary.topWords} />

            {/* Audience Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Audience Breakdown
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Attendee Type</h4>
                  {Object.entries(summary.attendeeTypeCounts).map(([type, count]) => (
                    <div key={type} className="flex justify-between py-1">
                      <span className="text-gray-600">{type}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">AI Experience</h4>
                  {Object.entries(summary.aiLevelCounts).map(([level, count]) => (
                    <div key={level} className="flex justify-between py-1">
                      <span className="text-gray-600">{level}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Azure AI Usage</h4>
                  {Object.entries(summary.azureAIUsageCounts).map(([usage, count]) => (
                    <div key={usage} className="flex justify-between py-1">
                      <span className="text-gray-600">{usage}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Feedback */}
            {summary.feedbackList.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Recent Feedback Comments
                </h3>
                <div className="space-y-3">
                  {summary.feedbackList.slice(0, 10).map((feedback, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700"
                    >
                      &quot;{feedback}&quot;
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeSession ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Waiting for Responses...
            </h3>
            <p className="text-gray-600">
              Survey results will appear here as attendees submit their feedback.
            </p>
          </div>
        ) : null}

        {/* Session History */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Session History
            </h3>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {session.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(session.createdAt).toLocaleString()}
                      {session.closedAt && ' - ' + new Date(session.closedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {session.isActive ? (
                      <span className="text-green-600 font-semibold text-sm">Active</span>
                    ) : (
                      <>
                        <button
                          onClick={() => viewSessionSummary(session.id)}
                          disabled={loading}
                          className="text-purple-600 hover:text-purple-700 font-semibold text-sm disabled:opacity-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => reactivateSession(session.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-700 font-semibold text-sm disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                        <button
                          onClick={() => {
                            window.open(
                              `/api/export?sessionId=${session.id}&adminSecret=${encodeURIComponent(adminSecret)}`,
                              '_blank'
                            );
                          }}
                          className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                        >
                          Export
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete session "${session.name}"? This cannot be undone.`)) {
                              try {
                                const response = await fetch(
                                  `/api/sessions?sessionId=${session.id}&adminSecret=${encodeURIComponent(adminSecret)}`,
                                  { method: 'DELETE' }
                                );
                                if (response.ok) {
                                  await fetchSessions();
                                } else {
                                  setError('Failed to delete session');
                                }
                              } catch {
                                setError('Network error while deleting session');
                              }
                            }
                          }}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 font-semibold text-sm disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
