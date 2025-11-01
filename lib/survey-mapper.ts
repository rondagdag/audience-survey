import {
  AzureAIExtractionResult,
  SurveyResult,
  AttendeeType,
  AILevel,
  AzureAIUsage,
  PresentationFeedback,
} from './types';

/**
 * Maps Azure AI Content Understanding extraction results to SurveyResult
 */
export class SurveyMapper {
  mapToSurveyResult(
    extraction: AzureAIExtractionResult,
    sessionId: string
  ): SurveyResult {
    const result: SurveyResult = {
      id: crypto.randomUUID(),
      sessionId,
      presentationFeedback: {
        engaging: 3,
        clear: 3,
        usefulDemos: 3,
        rightLevel: 3,
        learnedSomething: 3,
      },
      recommendScore: 5,
      submittedAt: new Date().toISOString(),
      uncertain: extraction.confidence < 0.7,
    };

    // Extract attendee type from text
    result.attendeeType = this.extractAttendeeType(extraction.text || []);

    // Extract AI level
    result.aiLevel = this.extractAILevel(extraction.text || []);

    // Extract Azure AI usage
    result.usedAzureAI = this.extractAzureAIUsage(extraction.text || []);

    // Extract Likert scale ratings (1-5) for presentation feedback
    result.presentationFeedback = this.extractPresentationFeedback(
      extraction.numbers || [],
      extraction.checkboxes || []
    );

    // Extract NPS score (0-10)
    result.recommendScore = this.extractRecommendScore(
      extraction.numbers || [],
      extraction.checkboxes || []
    );

    // Extract open-ended text feedback
    const openFeedback = this.extractOpenFeedback(extraction.text || []);
    result.bestPart = openFeedback.bestPart;
    result.improve = openFeedback.improve;
    result.futureTopics = openFeedback.futureTopics;

    return result;
  }

  private extractAttendeeType(textLines: string[]): AttendeeType | undefined {
    const text = textLines.join(' ').toLowerCase();
    const attendeeTypes: AttendeeType[] = [
      'Student',
      'Developer',
      'Manager',
      'Researcher',
      'Hobbyist',
      'Other',
    ];

    for (const type of attendeeTypes) {
      if (text.includes(type.toLowerCase())) {
        return type;
      }
    }

    return undefined;
  }

  private extractAILevel(textLines: string[]): AILevel | undefined {
    const text = textLines.join(' ').toLowerCase();
    const levels: AILevel[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

    for (const level of levels) {
      if (text.includes(level.toLowerCase())) {
        return level;
      }
    }

    return undefined;
  }

  private extractAzureAIUsage(textLines: string[]): AzureAIUsage | undefined {
    const text = textLines.join(' ').toLowerCase();

    if (text.includes('planning')) return 'Planning to';
    if (text.includes('yes') || text.includes('used')) return 'Yes';
    if (text.includes('no') || text.includes('not')) return 'No';

    return undefined;
  }

  private extractPresentationFeedback(
    numbers: Array<{ label: string; value: number }>,
    checkboxes: Array<{ label: string; checked: boolean }>
  ): PresentationFeedback {
    const feedback: PresentationFeedback = {
      engaging: 3,
      clear: 3,
      usefulDemos: 3,
      rightLevel: 3,
      learnedSomething: 3,
    };

    // Try to extract from numbered fields
    numbers.forEach((num) => {
      const label = num.label.toLowerCase();
      const value = Math.max(1, Math.min(5, Math.round(num.value)));

      if (label.includes('engaging') || label.includes('engage')) {
        feedback.engaging = value;
      } else if (label.includes('clear') || label.includes('clarity')) {
        feedback.clear = value;
      } else if (label.includes('demo') || label.includes('example')) {
        feedback.usefulDemos = value;
      } else if (label.includes('level') || label.includes('difficulty')) {
        feedback.rightLevel = value;
      } else if (label.includes('learn') || label.includes('new')) {
        feedback.learnedSomething = value;
      }
    });

    // Try to extract from checkboxes (counting checked boxes as rating)
    const questionGroups: Record<string, string[]> = {
      engaging: [],
      clear: [],
      usefulDemos: [],
      rightLevel: [],
      learnedSomething: [],
    };

    checkboxes.forEach((cb) => {
      const label = cb.label.toLowerCase();
      if (cb.checked) {
        if (label.includes('engaging')) questionGroups.engaging.push(label);
        if (label.includes('clear')) questionGroups.clear.push(label);
        if (label.includes('demo')) questionGroups.usefulDemos.push(label);
        if (label.includes('level')) questionGroups.rightLevel.push(label);
        if (label.includes('learn')) questionGroups.learnedSomething.push(label);
      }
    });

    // Convert checkbox counts to ratings
    Object.entries(questionGroups).forEach(([key, checked]) => {
      if (checked.length > 0) {
        feedback[key as keyof PresentationFeedback] = Math.min(
          5,
          checked.length
        );
      }
    });

    return feedback;
  }

  private extractRecommendScore(
    numbers: Array<{ label: string; value: number }>,
    checkboxes: Array<{ label: string; checked: boolean }>
  ): number {
    // Look for recommend/NPS score in numbers
    for (const num of numbers) {
      const label = num.label.toLowerCase();
      if (
        label.includes('recommend') ||
        label.includes('nps') ||
        label.includes('0-10') ||
        label.includes('0 to 10')
      ) {
        return Math.max(0, Math.min(10, Math.round(num.value)));
      }
    }

    // Count checked boxes in 0-10 range
    const npsChecked = checkboxes.filter(
      (cb) => cb.checked && /\d+/.test(cb.label)
    );
    if (npsChecked.length > 0) {
      const scores = npsChecked
        .map((cb) => parseInt(cb.label.match(/\d+/)?.[0] || '5'))
        .filter((s) => s >= 0 && s <= 10);
      if (scores.length > 0) {
        return Math.round(scores.reduce((a, b) => a + b) / scores.length);
      }
    }

    return 5; // Default middle score
  }

  private extractOpenFeedback(textLines: string[]): {
    bestPart?: string;
    improve?: string;
    futureTopics?: string;
  } {
    const feedback: {
      bestPart?: string;
      improve?: string;
      futureTopics?: string;
    } = {};

    let currentSection: 'bestPart' | 'improve' | 'futureTopics' | null = null;
    const sections: Record<string, string[]> = {
      bestPart: [],
      improve: [],
      futureTopics: [],
    };

    textLines.forEach((line) => {
      const lower = line.toLowerCase();

      // Detect section headers
      if (lower.includes('best part') || lower.includes('what did you like')) {
        currentSection = 'bestPart';
        return;
      } else if (
        lower.includes('improve') ||
        lower.includes('suggestion') ||
        lower.includes('change')
      ) {
        currentSection = 'improve';
        return;
      } else if (
        lower.includes('future') ||
        lower.includes('topic') ||
        lower.includes('next')
      ) {
        currentSection = 'futureTopics';
        return;
      }

      // Add line to current section if not a header
      if (
        currentSection &&
        line.trim().length > 5 &&
        !lower.includes('presentation') &&
        !lower.includes('feedback')
      ) {
        sections[currentSection].push(line.trim());
      }
    });

    // Join sections
    if (sections.bestPart.length > 0) {
      feedback.bestPart = sections.bestPart.join(' ').slice(0, 500);
    }
    if (sections.improve.length > 0) {
      feedback.improve = sections.improve.join(' ').slice(0, 500);
    }
    if (sections.futureTopics.length > 0) {
      feedback.futureTopics = sections.futureTopics.join(' ').slice(0, 500);
    }

    return feedback;
  }
}
