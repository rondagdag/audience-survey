import { Session, SurveyResult, SessionSummary } from './types';

// In-memory storage (replace with database in production)
class DataStore {
  private sessions: Map<string, Session> = new Map();
  private surveyResults: Map<string, SurveyResult[]> = new Map();

  // Session management
  createSession(name: string): Session {
    // Close any active sessions
    this.sessions.forEach((session) => {
      if (session.isActive) {
        session.isActive = false;
        session.closedAt = new Date().toISOString();
      }
    });

    const session: Session = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getActiveSession(): Session | undefined {
    return Array.from(this.sessions.values()).find((s) => s.isActive);
  }

  closeSession(sessionId: string): Session | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.closedAt = new Date().toISOString();
    }
    return session;
  }

  // Survey result management
  addSurveyResult(result: SurveyResult): void {
    const results = this.surveyResults.get(result.sessionId) || [];
    results.push(result);
    this.surveyResults.set(result.sessionId, results);
  }

  getSurveyResults(sessionId: string): SurveyResult[] {
    return this.surveyResults.get(sessionId) || [];
  }

  // Summary and aggregation
  getSessionSummary(sessionId: string): SessionSummary {
    const results = this.getSurveyResults(sessionId);
    
    if (results.length === 0) {
      return {
        sessionId,
        totalSubmissions: 0,
        attendeeTypeCounts: {},
        aiLevelCounts: {},
        azureAIUsageCounts: {},
        averageFeedback: {
          engaging: 0,
          clear: 0,
          usefulDemos: 0,
          rightLevel: 0,
          learnedSomething: 0,
        },
        npsScore: 0,
        npsDistribution: Array(11).fill(0),
        topWords: [],
        feedbackList: [],
      };
    }

    // Count attendee types
    const attendeeTypeCounts: Record<string, number> = {};
    results.forEach((r) => {
      if (r.attendeeType) {
        attendeeTypeCounts[r.attendeeType] =
          (attendeeTypeCounts[r.attendeeType] || 0) + 1;
      }
    });

    // Count AI levels
    const aiLevelCounts: Record<string, number> = {};
    results.forEach((r) => {
      if (r.aiLevel) {
        aiLevelCounts[r.aiLevel] = (aiLevelCounts[r.aiLevel] || 0) + 1;
      }
    });

    // Count Azure AI usage
    const azureAIUsageCounts: Record<string, number> = {};
    results.forEach((r) => {
      if (r.usedAzureAI) {
        azureAIUsageCounts[r.usedAzureAI] =
          (azureAIUsageCounts[r.usedAzureAI] || 0) + 1;
      }
    });

    // Calculate average feedback
    const avgFeedback = {
      engaging: 0,
      clear: 0,
      usefulDemos: 0,
      rightLevel: 0,
      learnedSomething: 0,
    };

    results.forEach((r) => {
      avgFeedback.engaging += r.presentationFeedback.engaging;
      avgFeedback.clear += r.presentationFeedback.clear;
      avgFeedback.usefulDemos += r.presentationFeedback.usefulDemos;
      avgFeedback.rightLevel += r.presentationFeedback.rightLevel;
      avgFeedback.learnedSomething += r.presentationFeedback.learnedSomething;
    });

    const count = results.length;
    avgFeedback.engaging = avgFeedback.engaging / count;
    avgFeedback.clear = avgFeedback.clear / count;
    avgFeedback.usefulDemos = avgFeedback.usefulDemos / count;
    avgFeedback.rightLevel = avgFeedback.rightLevel / count;
    avgFeedback.learnedSomething = avgFeedback.learnedSomething / count;

    // Calculate NPS score and distribution
    const npsDistribution = Array(11).fill(0);
    let npsSum = 0;
    
    results.forEach((r) => {
      const score = Math.max(0, Math.min(10, r.recommendScore));
      npsDistribution[score]++;
      npsSum += score;
    });

    const npsScore = npsSum / count;

    // Extract words from feedback
    const allFeedback: string[] = [];
    results.forEach((r) => {
      if (r.bestPart) allFeedback.push(r.bestPart);
      if (r.improve) allFeedback.push(r.improve);
      if (r.futureTopics) allFeedback.push(r.futureTopics);
    });

    const topWords = this.extractTopWords(allFeedback);

    return {
      sessionId,
      totalSubmissions: count,
      attendeeTypeCounts,
      aiLevelCounts,
      azureAIUsageCounts,
      averageFeedback: avgFeedback,
      npsScore,
      npsDistribution,
      topWords,
      feedbackList: allFeedback.filter((f) => f.length > 10),
    };
  }

  private extractTopWords(
    feedbackList: string[]
  ): Array<{ text: string; value: number }> {
    const wordCounts: Record<string, number> = {};
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'was',
      'were',
      'is',
      'are',
      'it',
      'this',
      'that',
      'very',
      'really',
    ]);

    feedbackList.forEach((feedback) => {
      const words = feedback
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/);

      words.forEach((word) => {
        if (word.length > 3 && !stopWords.has(word)) {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
      });
    });

    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([text, value]) => ({ text, value }));
  }

  // Export to CSV
  exportToCSV(sessionId: string): string {
    const results = this.getSurveyResults(sessionId);
    const headers = [
      'ID',
      'Submitted At',
      'Attendee Type',
      'AI Level',
      'Used Azure AI',
      'Engaging',
      'Clear',
      'Useful Demos',
      'Right Level',
      'Learned Something',
      'Recommend Score',
      'Best Part',
      'Improve',
      'Future Topics',
      'Uncertain',
    ];

    const rows = results.map((r) => [
      r.id,
      r.submittedAt,
      r.attendeeType || '',
      r.aiLevel || '',
      r.usedAzureAI || '',
      r.presentationFeedback.engaging,
      r.presentationFeedback.clear,
      r.presentationFeedback.usefulDemos,
      r.presentationFeedback.rightLevel,
      r.presentationFeedback.learnedSomething,
      r.recommendScore,
      r.bestPart || '',
      r.improve || '',
      r.futureTopics || '',
      r.uncertain ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    return csvContent;
  }
}

// Singleton instance
export const dataStore = new DataStore();
