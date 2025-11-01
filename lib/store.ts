import { create } from 'zustand';
import { Session, SurveyResult } from './types';

interface SessionStore {
  activeSession: Session | null;
  sessions: Session[];
  setActiveSession: (session: Session | null) => void;
  addSession: (session: Session) => void;
  updateSession: (sessionId: string, updates: Partial<Session>) => void;
  fetchSessions: () => Promise<void>;
}

interface UploadStore {
  currentImage: string | null;
  isUploading: boolean;
  uploadResult: SurveyResult | null;
  uploadError: string | null;
  setCurrentImage: (image: string | null) => void;
  setUploading: (uploading: boolean) => void;
  setUploadResult: (result: SurveyResult | null) => void;
  setUploadError: (error: string | null) => void;
  resetUpload: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeSession: null,
  sessions: [],
  setActiveSession: (session) => set({ activeSession: session }),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  updateSession: (sessionId, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
      activeSession:
        state.activeSession?.id === sessionId
          ? { ...state.activeSession, ...updates }
          : state.activeSession,
    })),
  fetchSessions: async () => {
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      set({ sessions: data.sessions || [] });
      
      // Set or clear active session
      const activeSession = data.sessions?.find((s: Session) => s.isActive);
      set({ activeSession: activeSession || null });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  },
}));

export const useUploadStore = create<UploadStore>((set) => ({
  currentImage: null,
  isUploading: false,
  uploadResult: null,
  uploadError: null,
  setCurrentImage: (image) => set({ currentImage: image }),
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadResult: (result) => set({ uploadResult: result }),
  setUploadError: (error) => set({ uploadError: error }),
  resetUpload: () =>
    set({
      currentImage: null,
      isUploading: false,
      uploadResult: null,
      uploadError: null,
    }),
}));
