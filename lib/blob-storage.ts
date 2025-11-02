// Azure Blob Storage service for uploading survey images
import { BlobServiceClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';

export interface BlobUploadResult {
  blobName: string;
  blobUrl: string;
  contentType: string;
  uploadedAt: Date;
}

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName: string;

  constructor() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!accountName && !connectionString) {
      throw new Error(
        'Azure Storage is not configured. Please set AZURE_STORAGE_ACCOUNT_NAME or AZURE_STORAGE_CONNECTION_STRING environment variable.'
      );
    }

    // Prefer connection string for local development, managed identity for production
    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (accountName) {
      // Use DefaultAzureCredential for production (supports managed identity, Azure CLI, etc.)
      const credential = new DefaultAzureCredential();
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        credential
      );
    } else {
      throw new Error('Unable to initialize BlobStorageService');
    }

    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'uploads';
  }

  /**
   * Upload image buffer to Azure Blob Storage
   * @param buffer Image data as Buffer
   * @param originalFileName Original filename for extension detection
   * @param contentType MIME type of the image
   * @returns BlobUploadResult with blob name and URL
   */
  async uploadImage(
    buffer: Buffer,
    originalFileName: string,
    contentType: string
  ): Promise<BlobUploadResult> {
    try {
      // Generate unique blob name with timestamp and UUID
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const ext = this.getFileExtension(originalFileName, contentType);
      const blobName = `${timestamp}-${uuid}${ext}`;

      // Get container client
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Ensure container exists (idempotent operation)
      await containerClient.createIfNotExists();

      // Get block blob client
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload buffer with metadata
      const uploadResponse = await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalFileName: originalFileName,
        },
      });

      return {
        blobName,
        blobUrl: blockBlobClient.url,
        contentType,
        uploadedAt: new Date(uploadResponse.lastModified || Date.now()),
      };
    } catch (error) {
      console.error('Error uploading to blob storage:', error);
      throw new Error(`Failed to upload image to blob storage: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a blob from storage
   * @param blobName Name of the blob to delete
   * @returns true if deleted successfully
   */
  async deleteImage(blobName: string): Promise<boolean> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      const deleteResponse = await blockBlobClient.deleteIfExists();
      return deleteResponse.succeeded;
    } catch (error) {
      console.error('Error deleting from blob storage:', error);
      return false;
    }
  }

  /**
   * Get file extension from filename or content type
   */
  private getFileExtension(fileName: string, contentType: string): string {
    const extMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    // Try to get from content type first
    if (extMap[contentType]) {
      return extMap[contentType];
    }

    // Fall back to filename extension
    const match = fileName.match(/\.\w+$/);
    return match ? match[0] : '.jpg';
  }

  /**
   * Extract blob name from blob URL for deletion
   * @param blobUrl Full blob URL
   * @returns Blob name or null if invalid URL
   */
  static extractBlobName(blobUrl: string): string | null {
    try {
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');
      // URL format: https://{account}.blob.core.windows.net/{container}/{blobName}
      return pathParts.length >= 3 ? pathParts.slice(2).join('/') : null;
    } catch {
      return null;
    }
  }
}
