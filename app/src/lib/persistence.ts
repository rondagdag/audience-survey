import { Session, SurveyResult } from './types';
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';

export class FilePersistence {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;
  private sessionsBlob: string = 'data/sessions.json';
  private resultsBlob: string = 'data/survey-results.json';
  private useLocalFallback: boolean = false;

  constructor() {
    try {
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const managedIdentityClientId = process.env.AZURE_CLIENT_ID;

      if (!accountName && !connectionString) {
        console.warn('⚠️ Azure Storage not configured, using local file fallback');
        this.useLocalFallback = true;
        return;
      }

      // Prefer connection string for local development, managed identity for production
      if (connectionString) {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      } else if (accountName) {
        const credential = managedIdentityClientId 
          ? new ManagedIdentityCredential(managedIdentityClientId)
          : new DefaultAzureCredential();
        
        this.blobServiceClient = new BlobServiceClient(
          `https://${accountName}.blob.core.windows.net`,
          credential
        );
      }

      this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';
    } catch (error) {
      console.error('Error initializing blob storage for persistence:', error);
      this.useLocalFallback = true;
    }
  }

  async loadSessions(): Promise<Map<string, Session>> {
    if (this.useLocalFallback) {
      return this.loadSessionsLocal();
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
      
      const blobClient = containerClient.getBlobClient(this.sessionsBlob);
      
      if (await blobClient.exists()) {
        const downloadResponse = await blobClient.download();
        const downloaded = await this.streamToString(downloadResponse.readableStreamBody!);
        const sessionsData = JSON.parse(downloaded);
        const sessions = new Map(Object.entries(sessionsData));
        console.log(`✅ Loaded ${sessions.size} sessions from blob storage`);
        return sessions;
      }
    } catch (error) {
      console.error('Error loading sessions from blob storage:', error);
    }
    return new Map();
  }

  async loadResults(): Promise<Map<string, SurveyResult[]>> {
    if (this.useLocalFallback) {
      return this.loadResultsLocal();
    }

    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
      
      const blobClient = containerClient.getBlobClient(this.resultsBlob);
      
      if (await blobClient.exists()) {
        const downloadResponse = await blobClient.download();
        const downloaded = await this.streamToString(downloadResponse.readableStreamBody!);
        const resultsData = JSON.parse(downloaded);
        const results = new Map(Object.entries(resultsData));
        const totalResults = Array.from(results.values()).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`✅ Loaded ${totalResults} survey results from blob storage`);
        return results;
      }
    } catch (error) {
      console.error('Error loading results from blob storage:', error);
    }
    return new Map();
  }

  async saveSessions(sessions: Map<string, Session>): Promise<void> {
    if (this.useLocalFallback) {
      return this.saveSessionsLocal(sessions);
    }

    try {
      const sessionsData = Object.fromEntries(sessions);
      const content = JSON.stringify(sessionsData, null, 2);
      
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
      
      const blockBlobClient = containerClient.getBlockBlobClient(this.sessionsBlob);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
      
      console.log('💾 Sessions saved to blob storage');
    } catch (error) {
      console.error('Error saving sessions to blob storage:', error);
    }
  }

  async saveResults(results: Map<string, SurveyResult[]>): Promise<void> {
    if (this.useLocalFallback) {
      return this.saveResultsLocal(results);
    }

    try {
      const resultsData = Object.fromEntries(results);
      const content = JSON.stringify(resultsData, null, 2);
      
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      await containerClient.createIfNotExists();
      
      const blockBlobClient = containerClient.getBlockBlobClient(this.resultsBlob);
      await blockBlobClient.upload(content, content.length, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
      });
      
      console.log('💾 Results saved to blob storage');
    } catch (error) {
      console.error('Error saving results to blob storage:', error);
    }
  }

  async saveAll(sessions: Map<string, Session>, results: Map<string, SurveyResult[]>): Promise<void> {
    await Promise.all([
      this.saveSessions(sessions),
      this.saveResults(results)
    ]);
  }

  // Helper to convert stream to string
  private async streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      readableStream.on('data', (data) => {
        chunks.push(data instanceof Buffer ? data : Buffer.from(data));
      });
      readableStream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
      readableStream.on('error', reject);
    });
  }

  // Local file fallback methods
  private loadSessionsLocal(): Map<string, Session> {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      const sessionsFile = path.join(dataDir, 'sessions.json');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      if (fs.existsSync(sessionsFile)) {
        const sessionsData = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
        const sessions = new Map(Object.entries(sessionsData));
        console.log(`✅ Loaded ${sessions.size} sessions from local file`);
        return sessions;
      }
    } catch (error) {
      console.error('Error loading sessions from local file:', error);
    }
    return new Map();
  }

  private loadResultsLocal(): Map<string, SurveyResult[]> {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      const resultsFile = path.join(dataDir, 'survey-results.json');
      
      if (fs.existsSync(resultsFile)) {
        const resultsData = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
        const results = new Map(Object.entries(resultsData));
        const totalResults = Array.from(results.values()).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`✅ Loaded ${totalResults} survey results from local file`);
        return results;
      }
    } catch (error) {
      console.error('Error loading results from local file:', error);
    }
    return new Map();
  }

  private saveSessionsLocal(sessions: Map<string, Session>): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      const sessionsFile = path.join(dataDir, 'sessions.json');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const sessionsData = Object.fromEntries(sessions);
      fs.writeFileSync(sessionsFile, JSON.stringify(sessionsData, null, 2), 'utf-8');
      console.log('💾 Sessions saved to local file');
    } catch (error) {
      console.error('Error saving sessions to local file:', error);
    }
  }

  private saveResultsLocal(results: Map<string, SurveyResult[]>): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.join(process.cwd(), 'data');
      const resultsFile = path.join(dataDir, 'survey-results.json');
      
      const resultsData = Object.fromEntries(results);
      fs.writeFileSync(resultsFile, JSON.stringify(resultsData, null, 2), 'utf-8');
      console.log('💾 Results saved to local file');
    } catch (error) {
      console.error('Error saving results to local file:', error);
    }
  }
}
