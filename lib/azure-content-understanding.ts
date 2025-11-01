import { AzureAnalyzeResponse, AzureContentResult } from './types';

// Azure AI Content Understanding REST API integration
export class AzureContentUnderstandingService {
  private endpoint: string;
  private apiKey: string;
  private analyzerId: string;
  private apiVersion: string;

  constructor() {
    this.endpoint = process.env.AZURE_CONTENT_ENDPOINT || '';
    this.apiKey = process.env.AZURE_CONTENT_KEY || '';
    this.analyzerId = process.env.AZURE_ANALYZER_ID || 'audience-survey';
    this.apiVersion = '2025-05-01-preview';

    if (!this.endpoint || !this.apiKey) {
      console.warn('Azure Content Understanding credentials not configured');
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<AzureContentResult> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure Content Understanding not configured');
    }

    try {
      // Step 1: Start analysis
      const analyzeUrl = `${this.endpoint}/contentunderstanding/analyzers/${this.analyzerId}:analyze?api-version=${this.apiVersion}&stringEncoding=utf16`;
      
      const response = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'x-ms-useragent': 'audience-survey-app',
        },
        body: imageBuffer as unknown as BodyInit,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure API error: ${response.status} - ${errorText}`);
      }

      // Step 2: Get operation location from header
      const operationLocation = response.headers.get('operation-location');
      if (!operationLocation) {
        throw new Error('Operation location not found in response headers');
      }

      // Step 3: Poll for result
      const result = await this.pollResult(operationLocation, 120, 2);
      
      if (!result.result) {
        throw new Error('No result returned from Azure Content Understanding');
      }

      return result.result;
    } catch (error) {
      console.error('Azure Content Understanding error:', error);
      throw error;
    }
  }

  private async pollResult(
    operationLocation: string,
    timeoutSeconds: number = 120,
    pollingIntervalSeconds: number = 2
  ): Promise<AzureAnalyzeResponse> {
    const startTime = Date.now();
    const headers = {
      'Ocp-Apim-Subscription-Key': this.apiKey,
    };

    while (true) {
      const elapsedTime = (Date.now() - startTime) / 1000;
      
      if (elapsedTime > timeoutSeconds) {
        throw new Error(`Operation timed out after ${timeoutSeconds} seconds`);
      }

      const response = await fetch(operationLocation, { headers });
      
      if (!response.ok) {
        throw new Error(`Polling error: ${response.status}`);
      }

      const result: AzureAnalyzeResponse = await response.json();
      const status = result.status.toLowerCase();

      if (status === 'succeeded') {
        console.log(`Analysis completed in ${elapsedTime.toFixed(2)} seconds`);
        return result;
      } else if (status === 'failed') {
        throw new Error('Analysis failed');
      }

      // Still running, wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollingIntervalSeconds * 1000));
    }
  }
}
