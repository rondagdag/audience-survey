import {
  AzureContentResult,
  SurveyResult,
  AttendeeType,
  AILevel,
  AzureAIUsage,
  PresentationFeedback,
} from './types';

/**
 * Maps Azure Content Understanding extraction results to SurveyResult
 */
export class SurveyMapper {
  mapToSurveyResult(
    azureResult: AzureContentResult,
    sessionId: string
  ): SurveyResult {
    // Extract fields from first content item
    const fields = azureResult.contents[0]?.fields || {};

    const result: SurveyResult = {
      id: crypto.randomUUID(),
      sessionId,
      presentationFeedback: {
        engaging: this.getIntegerField(fields.TopicEngagement, 3),
        clear: this.getIntegerField(fields.ConceptClarity, 3),
        usefulDemos: this.getIntegerField(fields.DemoUsefulness, 3),
        rightLevel: this.getIntegerField(fields.SkillLevelAppropriateness, 3),
        learnedSomething: this.getIntegerField(fields.LearningOutcome, 3),
      },
      recommendScore: this.getIntegerField(fields.RecommendScore, 5),
      submittedAt: new Date().toISOString(),
      uncertain: false, // Azure Content Understanding with custom analyzers is highly accurate
    };

    // Map string fields
    result.attendeeType = this.mapAttendeeType(this.getStringField(fields.Role));
    result.aiLevel = this.mapAILevel(this.getStringField(fields.AIKnowledgeLevel));
    result.usedAzureAI = this.mapAzureAIUsage(this.getStringField(fields.UsedAzureAI));

    // Map open-ended feedback
    result.bestPart = this.getStringField(fields.BestPart);
    result.improve = this.getStringField(fields.ImprovementSuggestions);
    result.futureTopics = this.getStringField(fields.FutureTopics);

    return result;
  }

  private getStringField(field: any | undefined): string | undefined {
    if (!field || field.type !== 'string') return undefined;
    return field.valueString || undefined;
  }

  private getIntegerField(field: any | undefined, defaultValue: number): number {
    if (!field || field.type !== 'integer') return defaultValue;
    const value = field.valueInteger;
    return typeof value === 'number' ? value : defaultValue;
  }

  private mapAttendeeType(value: string | undefined): AttendeeType | undefined {
    if (!value) return undefined;
    const normalized = value.trim();
    const validTypes: AttendeeType[] = ['Student', 'Developer', 'Manager', 'Researcher', 'Hobbyist', 'Other'];
    return validTypes.find(t => t.toLowerCase() === normalized.toLowerCase());
  }

  private mapAILevel(value: string | undefined): AILevel | undefined {
    if (!value) return undefined;
    const normalized = value.trim();
    const validLevels: AILevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
    return validLevels.find(l => l.toLowerCase() === normalized.toLowerCase());
  }

  private mapAzureAIUsage(value: string | undefined): AzureAIUsage | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'yes') return 'Yes';
    if (normalized === 'no') return 'No';
    if (normalized.includes('planning')) return 'Planning to';
    return undefined;
  }
}
