'use client';

import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt?: Date;
}

interface DocumentUploaderProps {
  label: string;
  description?: string;
  accept?: string;
  maxSizeMB?: number;
  existingFile?: UploadedFile;
  onUpload: (file: File) => Promise<UploadedFile>;
  onRemove?: () => Promise<void>;
  className?: string;
}

export function DocumentUploader({
  label,
  description,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 10,
  existingFile,
  onUpload,
  onRemove,
  className,
}: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState<UploadedFile | undefined>(existingFile);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    const acceptedTypes = accept.split(',').map((t) => t.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = acceptedTypes.some(
      (type) =>
        type === fileExtension ||
        file.type.startsWith(type.replace('*', ''))
    );

    if (!isValidType) {
      return `File type must be one of: ${accept}`;
    }

    return null;
  };

  const handleUpload = async (fileToUpload: File) => {
    const validationError = validateFile(fileToUpload);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const uploadedFile = await onUpload(fileToUpload);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setFile(uploadedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleUpload(droppedFile);
      }
    },
    [onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleRemove = async () => {
    if (onRemove) {
      try {
        await onRemove();
        setFile(undefined);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Remove failed');
      }
    } else {
      setFile(undefined);
      setError(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div>
        <h4 className="text-sm font-medium">{label}</h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {file ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                    {file.uploadedAt && (
                      <> • Uploaded {file.uploadedAt.toLocaleDateString()}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={cn(
            'border-2 border-dashed transition-colors',
            isDragging && 'border-primary bg-primary/5',
            error && 'border-destructive'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              {isUploading ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="w-full max-w-xs space-y-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Drop your file here, or{' '}
                      <label className="text-primary cursor-pointer hover:underline">
                        browse
                        <input
                          type="file"
                          accept={accept}
                          className="hidden"
                          onChange={handleFileSelect}
                          disabled={isUploading}
                        />
                      </label>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Accepted formats: {accept} • Max size: {maxSizeMB}MB
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
