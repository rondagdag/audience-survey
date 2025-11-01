'use client';

import { useEffect, useState } from 'react';
import { useSessionStore, useUploadStore } from '@/lib/store';
import SessionGuard from '@/components/SessionGuard';
import SurveyUploader from '@/components/SurveyUploader';

export default function Home() {
  const { activeSession, fetchSessions } = useSessionStore();
  const { uploadResult } = useUploadStore();
  const [activeTab, setActiveTab] = useState<'upload' | 'summary'>('upload');

  useEffect(() => {
    // Fetch sessions on mount
    fetchSessions();

    // Poll for session updates every 5 seconds
    const interval = setInterval(fetchSessions, 5000);

    return () => clearInterval(interval);
  }, [fetchSessions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 Audience Survey
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Snap your survey → instant insights
              </p>
            </div>
            {activeSession && (
              <div className="text-right">
                <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Active Session
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {activeSession.name}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {uploadResult ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Thank You!
              </h2>
              <p className="text-gray-600 mb-4">
                Your feedback has been submitted successfully.
              </p>
              <p className="text-sm text-gray-500">
                The speaker will see your responses in real-time on the summary dashboard.
              </p>
            </div>
          </div>
        ) : (
          <SessionGuard>
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📸 Upload Survey
                </button>
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                    activeTab === 'summary'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📊 View Results
                </button>
              </div>

              {/* Content */}
              {activeTab === 'upload' ? (
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="mb-6 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Submit Your Feedback
                    </h2>
                    <p className="text-gray-600">
                      Take a clear photo of your completed survey form
                    </p>
                  </div>
                  <SurveyUploader />
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Results Dashboard
                  </h2>
                  <p className="text-gray-600 mb-4">
                    The speaker will display the live results at the end of the session.
                  </p>
                  <div className="text-4xl">📈</div>
                </div>
              )}
            </div>
          </SessionGuard>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center text-sm text-gray-600">
        <p>Powered by Azure AI Content Understanding</p>
      </footer>
    </div>
  );
}
