import { AzureAIExtractionResult, SurveyResult } from './types';

// Azure AI Content Understanding REST API integration
export class AzureContentUnderstandingService {
  private endpoint: string;
  private apiKey: string;

  constructor() {
    this.endpoint = process.env.AZURE_CONTENT_ENDPOINT || '';
    this.apiKey = process.env.AZURE_CONTENT_KEY || '';

    if (!this.endpoint || !this.apiKey) {
      console.warn('Azure Content Understanding credentials not configured');
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<AzureAIExtractionResult> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure Content Understanding not configured');
    }

    try {
      // Call Azure AI Content Understanding REST API
      // Based on MS docs: POST {endpoint}/contentunderstanding/documents:analyze
      const response = await fetch(
        `${this.endpoint}/contentunderstanding/documents:analyze?api-version=2024-12-01-preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': this.apiKey,
          },
          body: imageBuffer as unknown as BodyInit,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return this.parseAzureResponse(result);
    } catch (error) {
      console.error('Azure Content Understanding error:', error);
      throw error;
    }
  }

  private parseAzureResponse(azureResult: any): AzureAIExtractionResult {
    // Parse Azure response into our format
    // Extract text, checkboxes, and numbers from the analysis
    const extracted: AzureAIExtractionResult = {
      text: [],
      checkboxes: [],
      numbers: [],
      confidence: 0.8, // Default confidence
    };

    // Extract text content (OCR results)
    if (azureResult.analyzeResult?.readResults) {
      const allText: string[] = [];
      azureResult.analyzeResult.readResults.forEach((page: any) => {
        page.lines?.forEach((line: any) => {
          allText.push(line.text);
        });
      });
      extracted.text = allText;
    }

    // Extract form fields (checkboxes and numbers)
    if (azureResult.analyzeResult?.documentResults) {
      azureResult.analyzeResult.documentResults.forEach((doc: any) => {
        if (doc.fields) {
          Object.entries(doc.fields).forEach(([key, field]: [string, any]) => {
            if (field.type === 'selectionMark') {
              extracted.checkboxes?.push({
                label: key,
                checked: field.valueSelectionMark === 'selected',
              });
            } else if (field.type === 'number') {
              extracted.numbers?.push({
                label: key,
                value: field.valueNumber,
              });
            }
          });
        }
      });
    }

    // Calculate average confidence
    if (azureResult.analyzeResult?.readResults) {
      const confidences = azureResult.analyzeResult.readResults.flatMap(
        (page: any) =>
          page.lines?.map((line: any) => line.confidence || 0) || []
      );
      if (confidences.length > 0) {
        extracted.confidence =
          confidences.reduce((sum: number, c: number) => sum + c, 0) /
          confidences.length;
      }
    }

    return extracted;
  }
}
