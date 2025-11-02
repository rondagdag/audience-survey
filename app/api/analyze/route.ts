import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/lib/data-store';
import { AzureContentUnderstandingService } from '@/lib/azure-content-understanding';
import { SurveyMapper } from '@/lib/survey-mapper';
import { BlobStorageService } from '@/lib/blob-storage';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Check if there's an active session
    const activeSession = dataStore.getActiveSession();
    if (!activeSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active session available. The session may have ended or not started yet. Please refresh the page or contact the speaker.',
        },
        { status: 400 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: 'File too large. Maximum size is 10MB.',
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Azure Blob Storage before processing
    let blobUrl: string | undefined;
    try {
      const blobService = new BlobStorageService();
      const uploadResult = await blobService.uploadImage(
        buffer,
        file.name || 'survey.jpg',
        file.type
      );
      blobUrl = uploadResult.blobUrl;
      console.log('Image uploaded to blob storage:', uploadResult.blobName);
    } catch (blobError) {
      console.error('Failed to upload image to blob storage:', blobError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload image to storage' },
        { status: 500 }
      );
    }

    // Call Azure AI Content Understanding
    const azureService = new AzureContentUnderstandingService();
    let extraction;

    try {
      extraction = await azureService.analyzeImage(buffer);
    } catch (azureError: unknown) {
      console.error('Azure AI error:', azureError);

      // Return user-friendly error
      const azureMsg = (azureError as any)?.message;
      if (typeof azureMsg === 'string' && azureMsg.includes('not configured')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Azure AI service is not configured. Please set up your API credentials.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Couldn't read survey. Please try again with better lighting or a clearer photo.",
        },
        { status: 400 }
      );
    }

    // Map extraction to survey result
    const mapper = new SurveyMapper();
    const surveyResult = mapper.mapToSurveyResult(
      extraction,
      activeSession.id,
      blobUrl
    );

    // Store result
    dataStore.addSurveyResult(surveyResult);

    return NextResponse.json({
      success: true,
      surveyResult,
      message: 'Survey submitted successfully! Thank you for your feedback.',
    });
  } catch (error) {
    console.error('Error analyzing survey:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while processing your survey. Please try again.',
      },
      { status: 500 }
    );
  }
}
