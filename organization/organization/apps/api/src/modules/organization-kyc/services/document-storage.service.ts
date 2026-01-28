import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadDocumentOptions {
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  organizationId: string;
  documentType: 'id_document' | 'address_proof' | 'business_document';
}

export interface DocumentMetadata {
  url: string;
  key: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
}

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private s3Client: AWS.S3 | null = null;
  private readonly storageProvider: 'S3' | 'AZURE' | 'LOCAL';
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.storageProvider = this.configService.get<'S3' | 'AZURE' | 'LOCAL'>(
      'STORAGE_PROVIDER',
      'LOCAL',
    );
    this.bucket = this.configService.get<string>('STORAGE_BUCKET', 'kyc-documents');
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');

    this.initializeStorage();
  }

  private initializeStorage() {
    if (this.storageProvider === 'S3') {
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        this.logger.warn(
          'AWS credentials not configured. Storage operations will fail. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
        );
        return;
      }

      this.s3Client = new AWS.S3({
        accessKeyId,
        secretAccessKey,
        region: this.region,
        signatureVersion: 'v4',
      });

      this.logger.log(`S3 storage initialized for bucket: ${this.bucket} in region: ${this.region}`);
    } else if (this.storageProvider === 'AZURE') {
      // Azure Blob Storage implementation would go here
      this.logger.log('Azure Blob Storage provider selected (implementation pending)');
    } else {
      this.logger.log('Local storage provider selected (for development only)');
    }
  }

  /**
   * Generate a secure, unique key for the document
   */
  private generateDocumentKey(
    organizationId: string,
    documentType: string,
    fileName: string,
  ): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(fileName);
    const sanitizedName = path.basename(fileName, extension).replace(/[^a-zA-Z0-9]/g, '_');

    return `kyc/${organizationId}/${documentType}/${timestamp}_${randomHash}_${sanitizedName}${extension}`;
  }

  /**
   * Validate file type for security
   */
  private validateFileType(contentType: string, fileName: string): void {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.heic', '.heif'];
    const extension = path.extname(fileName).toLowerCase();

    if (!allowedMimeTypes.includes(contentType) || !allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and images (JPEG, PNG, HEIC) are allowed.',
      );
    }
  }

  /**
   * Validate file size (max 10MB)
   */
  private validateFileSize(size: number): void {
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    if (size > maxSizeBytes) {
      throw new BadRequestException('File size exceeds maximum allowed size of 10MB.');
    }
  }

  /**
   * Upload document to S3 with encryption
   */
  async uploadDocument(options: UploadDocumentOptions): Promise<DocumentMetadata> {
    this.validateFileType(options.contentType, options.fileName);
    this.validateFileSize(options.fileBuffer.length);

    const documentKey = this.generateDocumentKey(
      options.organizationId,
      options.documentType,
      options.fileName,
    );

    if (this.storageProvider === 'S3') {
      return this.uploadToS3(documentKey, options);
    } else if (this.storageProvider === 'AZURE') {
      return this.uploadToAzure(documentKey, options);
    } else {
      return this.uploadToLocal(documentKey, options);
    }
  }

  /**
   * Upload to AWS S3
   */
  private async uploadToS3(
    key: string,
    options: UploadDocumentOptions,
  ): Promise<DocumentMetadata> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('S3 client not initialized');
    }

    try {
      const params: AWS.S3.PutObjectRequest = {
        Bucket: this.bucket,
        Key: key,
        Body: options.fileBuffer,
        ContentType: options.contentType,
        ServerSideEncryption: 'AES256', // Server-side encryption
        Metadata: {
          organizationId: options.organizationId,
          documentType: options.documentType,
          originalFileName: options.fileName,
          uploadedAt: new Date().toISOString(),
        },
        // Prevent public access
        ACL: 'private',
      };

      const result = await this.s3Client.upload(params).promise();

      this.logger.log(`Document uploaded to S3: ${key}`);

      return {
        url: result.Location,
        key: result.Key,
        contentType: options.contentType,
        size: options.fileBuffer.length,
        uploadedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to upload document to S3', error);
      throw new InternalServerErrorException('Failed to upload document to storage');
    }
  }

  /**
   * Upload to Azure Blob Storage (placeholder)
   */
  private async uploadToAzure(
    key: string,
    options: UploadDocumentOptions,
  ): Promise<DocumentMetadata> {
    // Azure Blob Storage implementation
    // This would use @azure/storage-blob package
    throw new InternalServerErrorException('Azure storage not yet implemented');
  }

  /**
   * Upload to local storage (development only)
   */
  private async uploadToLocal(
    key: string,
    options: UploadDocumentOptions,
  ): Promise<DocumentMetadata> {
    // In development, we'll just return a mock URL
    // In a real implementation, you'd save to local filesystem
    const mockUrl = `${this.configService.get('APP_URL')}/storage/${key}`;

    this.logger.warn('Using local storage (development only)');

    return {
      url: mockUrl,
      key,
      contentType: options.contentType,
      size: options.fileBuffer.length,
      uploadedAt: new Date(),
    };
  }

  /**
   * Generate a pre-signed URL for secure document access
   * @param key - The document key in storage
   * @param expiresIn - Expiration time in seconds (default: 15 minutes)
   */
  async getDocumentUrl(key: string, expiresIn: number = 900): Promise<string> {
    if (this.storageProvider === 'S3') {
      return this.getS3SignedUrl(key, expiresIn);
    } else if (this.storageProvider === 'AZURE') {
      return this.getAzureSignedUrl(key, expiresIn);
    } else {
      return this.getLocalUrl(key);
    }
  }

  /**
   * Generate S3 pre-signed URL
   */
  private async getS3SignedUrl(key: string, expiresIn: number): Promise<string> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('S3 client not initialized');
    }

    try {
      const params = {
        Bucket: this.bucket,
        Key: key,
        Expires: expiresIn,
      };

      const url = await this.s3Client.getSignedUrlPromise('getObject', params);
      return url;
    } catch (error) {
      this.logger.error('Failed to generate S3 signed URL', error);
      throw new InternalServerErrorException('Failed to generate document access URL');
    }
  }

  /**
   * Generate Azure Blob Storage SAS URL (placeholder)
   */
  private async getAzureSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Azure SAS token implementation
    throw new InternalServerErrorException('Azure storage not yet implemented');
  }

  /**
   * Get local storage URL (development only)
   */
  private getLocalUrl(key: string): string {
    return `${this.configService.get('APP_URL')}/storage/${key}`;
  }

  /**
   * Delete document from storage
   */
  async deleteDocument(key: string): Promise<void> {
    if (this.storageProvider === 'S3') {
      await this.deleteFromS3(key);
    } else if (this.storageProvider === 'AZURE') {
      await this.deleteFromAzure(key);
    } else {
      await this.deleteFromLocal(key);
    }
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('S3 client not initialized');
    }

    try {
      const params: AWS.S3.DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      await this.s3Client.deleteObject(params).promise();
      this.logger.log(`Document deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error('Failed to delete document from S3', error);
      throw new InternalServerErrorException('Failed to delete document from storage');
    }
  }

  /**
   * Delete from Azure (placeholder)
   */
  private async deleteFromAzure(key: string): Promise<void> {
    throw new InternalServerErrorException('Azure storage not yet implemented');
  }

  /**
   * Delete from local storage (development only)
   */
  private async deleteFromLocal(key: string): Promise<void> {
    this.logger.warn(`Local storage delete called for: ${key}`);
    // In development, just log
  }

  /**
   * Check if document exists
   */
  async documentExists(key: string): Promise<boolean> {
    if (this.storageProvider === 'S3') {
      return this.s3DocumentExists(key);
    } else if (this.storageProvider === 'AZURE') {
      return this.azureDocumentExists(key);
    } else {
      return true; // For local storage, assume it exists
    }
  }

  /**
   * Check if S3 document exists
   */
  private async s3DocumentExists(key: string): Promise<boolean> {
    if (!this.s3Client) {
      return false;
    }

    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      await this.s3Client.headObject(params).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound' || error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if Azure document exists (placeholder)
   */
  private async azureDocumentExists(key: string): Promise<boolean> {
    throw new InternalServerErrorException('Azure storage not yet implemented');
  }

  /**
   * Get document metadata without downloading
   */
  async getDocumentMetadata(key: string): Promise<{
    contentType: string;
    size: number;
    lastModified: Date;
  } | null> {
    if (this.storageProvider === 'S3') {
      return this.getS3Metadata(key);
    } else if (this.storageProvider === 'AZURE') {
      return this.getAzureMetadata(key);
    } else {
      return null;
    }
  }

  /**
   * Get S3 document metadata
   */
  private async getS3Metadata(key: string): Promise<{
    contentType: string;
    size: number;
    lastModified: Date;
  } | null> {
    if (!this.s3Client) {
      return null;
    }

    try {
      const params: AWS.S3.HeadObjectRequest = {
        Bucket: this.bucket,
        Key: key,
      };

      const result = await this.s3Client.headObject(params).promise();

      return {
        contentType: result.ContentType || 'application/octet-stream',
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
      };
    } catch (error) {
      this.logger.error('Failed to get S3 document metadata', error);
      return null;
    }
  }

  /**
   * Get Azure document metadata (placeholder)
   */
  private async getAzureMetadata(key: string): Promise<any> {
    throw new InternalServerErrorException('Azure storage not yet implemented');
  }
}
