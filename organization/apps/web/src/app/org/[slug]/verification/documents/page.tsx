'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Loader2, CheckCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DocumentUploader,
  type UploadedFile,
} from '@/components/kyc/DocumentUploader';
import { VerificationProgress } from '@/components/kyc/VerificationProgress';
import { toast } from 'sonner';

export default function DocumentUploadPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [documents, setDocuments] = useState<{
    idDocument?: UploadedFile;
    addressProof?: UploadedFile;
    businessRegistration?: UploadedFile;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleUpload = async (
    type: 'idDocument' | 'addressProof' | 'businessRegistration',
    file: File
  ): Promise<UploadedFile> => {
    // Simulate upload to server
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const uploadedFile: UploadedFile = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date(),
    };

    setDocuments((prev) => ({
      ...prev,
      [type]: uploadedFile,
    }));

    toast.success(`${file.name} uploaded successfully`);
    return uploadedFile;
  };

  const handleRemove = async (
    type: 'idDocument' | 'addressProof' | 'businessRegistration'
  ) => {
    // Simulate removal from server
    await new Promise((resolve) => setTimeout(resolve, 500));

    setDocuments((prev) => {
      const newDocs = { ...prev };
      delete newDocs[type];
      return newDocs;
    });

    toast.success('Document removed');
  };

  const handleSubmit = async () => {
    if (!documents.idDocument || !documents.addressProof || !documents.businessRegistration) {
      toast.error('Please upload all required documents');
      return;
    }

    try {
      setIsSubmitting(true);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setSubmitSuccess(true);
      toast.success('Documents submitted for review');

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/org/${slug}/verification`);
      }, 2000);
    } catch (err) {
      toast.error('Failed to submit documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allDocumentsUploaded =
    documents.idDocument && documents.addressProof && documents.businessRegistration;

  if (submitSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="p-4 bg-success/10 rounded-full">
          <CheckCircle className="h-12 w-12 text-success" />
        </div>
        <h2 className="text-2xl font-bold">Documents Submitted!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Your documents have been submitted for review. We'll notify you once the
          review is complete, usually within 1-2 business days.
        </p>
        <Loader2 className="h-5 w-5 animate-spin text-primary mt-4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/org/${slug}/verification`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload the required documents to verify your organization
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <VerificationProgress currentStep="documents" />
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Document Requirements:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>All documents must be clear and legible</li>
              <li>Files must be in PDF, JPG, or PNG format</li>
              <li>Maximum file size: 10MB per document</li>
              <li>Documents must be valid and not expired</li>
              <li>Personal information must be clearly visible</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>

      {/* Upload Section */}
      <div className="space-y-6">
        {/* ID Document */}
        <Card>
          <CardHeader>
            <CardTitle>Government-Issued ID</CardTitle>
            <CardDescription>
              Upload a clear photo or scan of your passport, driver's license, or
              national ID card
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              label="ID Document"
              description="Accepted: Passport, Driver's License, National ID"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              existingFile={documents.idDocument}
              onUpload={(file) => handleUpload('idDocument', file)}
              onRemove={() => handleRemove('idDocument')}
            />
          </CardContent>
        </Card>

        {/* Proof of Address */}
        <Card>
          <CardHeader>
            <CardTitle>Proof of Address</CardTitle>
            <CardDescription>
              Upload a recent utility bill, bank statement, or official document
              showing your address (dated within the last 3 months)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              label="Address Proof"
              description="Utility bill, bank statement, or government letter (max 3 months old)"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              existingFile={documents.addressProof}
              onUpload={(file) => handleUpload('addressProof', file)}
              onRemove={() => handleRemove('addressProof')}
            />
          </CardContent>
        </Card>

        {/* Business Registration */}
        <Card>
          <CardHeader>
            <CardTitle>Business Registration</CardTitle>
            <CardDescription>
              Upload your certificate of incorporation, business license, or other
              official business registration documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentUploader
              label="Business Registration"
              description="Certificate of incorporation or business license"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              existingFile={documents.businessRegistration}
              onUpload={(file) => handleUpload('businessRegistration', file)}
              onRemove={() => handleRemove('businessRegistration')}
            />
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => router.push(`/org/${slug}/verification`)}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!allDocumentsUploaded || isSubmitting}
          isLoading={isSubmitting}
          loadingText="Submitting..."
          rightIcon={<Send className="h-4 w-4" />}
        >
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
