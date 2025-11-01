// Survey response data models

export type AttendeeType = "Student" | "Developer" | "Manager" | "Researcher" | "Hobbyist" | "Other";
export type AILevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type AzureAIUsage = "Yes" | "No" | "Planning to";

export interface PresentationFeedback {
  engaging: number;       // 1-5
  clear: number;          // 1-5
  usefulDemos: number;    // 1-5
  rightLevel: number;     // 1-5
  learnedSomething: number; // 1-5
}

export interface SurveyResult {
  id: string;
  sessionId: string;
  attendeeType?: AttendeeType;
  aiLevel?: AILevel;
  usedAzureAI?: AzureAIUsage;
  presentationFeedback: PresentationFeedback;
  recommendScore: number; // 0-10 (NPS)
  bestPart?: string;
  improve?: string;
  futureTopics?: string;
  submittedAt: string;
  uncertain?: boolean; // Flag for low-confidence extractions
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  closedAt?: string;
  isActive: boolean;
}

export interface SessionSummary {
  sessionId: string;
  totalSubmissions: number;
  attendeeTypeCounts: Record<string, number>;
  aiLevelCounts: Record<string, number>;
  azureAIUsageCounts: Record<string, number>;
  averageFeedback: PresentationFeedback;
  npsScore: number;
  npsDistribution: number[]; // 0-10 array of counts
  topWords: { text: string; value: number }[];
  feedbackList: string[];
  generatedInsights?: string[];
}

export interface AzureAIExtractionResult {
  text?: string[];
  checkboxes?: { label: string; checked: boolean }[];
  numbers?: { label: string; value: number }[];
  confidence: number;
}

export interface UploadResponse {
  success: boolean;
  surveyResult?: SurveyResult;
  error?: string;
  message?: string;
}
