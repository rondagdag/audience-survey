'use client';

import { useState, useRef } from 'react';
import { useSessionStore, useUploadStore } from '@/lib/store';
import confetti from 'canvas-confetti';

export default function SurveyUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeSession } = useSessionStore();
  const { isUploading, setUploading, setUploadResult, setUploadError } =
    useUploadStore();

  const handleFileSelect = (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview || !activeSession) return;

    setUploading(true);
    setError(null);
    setUploadError(null);

    try {
      // Convert base64 to blob
      const response = await fetch(preview);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'survey.jpg');

      // Upload
      const uploadResponse = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await uploadResponse.json();

      if (data.success) {
        setUploadResult(data.surveyResult);
        setPreview(null);
        
        // Trigger confetti
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });

        // Reset after 3 seconds
        setTimeout(() => {
          setUploadResult(null);
        }, 3000);
      } else {
        setError(data.error || 'Upload failed');
        setUploadError(data.error);
      }
    } catch {
      const errorMessage = 'Failed to upload. Please try again.';
      setError(errorMessage);
      setUploadError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      {!preview ? (
        <div className="text-center">
          <button
            onClick={triggerFileInput}
            className="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <div className="text-5xl mb-2">📸</div>
            <div className="text-xl">Take Photo of Survey</div>
            <div className="text-sm opacity-90 mt-2">
              Snap a clear picture of your completed feedback form
            </div>
          </button>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Survey preview"
              className="w-full h-auto"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setPreview(null)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-6 rounded-lg transition-colors"
              disabled={isUploading}
            >
              Retake
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Submit Survey'
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-md mx-auto bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <p className="font-medium">⚠️ {error}</p>
          {error.includes('session') ? (
            <p className="text-sm mt-1">
              Please refresh the page or contact the speaker to ensure a session is active.
            </p>
          ) : (
            <p className="text-sm mt-1">
              Try taking the photo in better lighting or with a clearer angle.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
