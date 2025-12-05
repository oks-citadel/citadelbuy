'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Loader2,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KycStatusBadge, type KycStatus } from '@/components/kyc/KycStatusBadge';
import { VerificationProgress, type VerificationStep } from '@/components/kyc/VerificationProgress';

interface KycData {
  status: KycStatus;
  currentStep: VerificationStep;
  submittedAt?: Date;
  reviewedAt?: Date;
  rejectionReason?: string;
  documents: {
    idDocument?: boolean;
    addressProof?: boolean;
    businessRegistration?: boolean;
  };
}

export default function VerificationPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [kycData, setKycData] = useState<KycData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKycData();
  }, [slug]);

  const loadKycData = async () => {
    try {
      setIsLoading(true);

      // Mock data - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockData: KycData = {
        status: 'incomplete',
        currentStep: 'info',
        documents: {
          idDocument: false,
          addressProof: false,
          businessRegistration: false,
        },
      };

      setKycData(mockData);
    } catch (err) {
      console.error('Failed to load KYC data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartVerification = () => {
    router.push(`/org/${slug}/verification/documents`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!kycData) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load verification data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  const isVerified = kycData.status === 'approved';
  const isRejected = kycData.status === 'rejected';
  const isInReview = kycData.status === 'in_review';
  const canStartVerification =
    kycData.status === 'incomplete' || kycData.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">KYC Verification</h1>
          <p className="text-muted-foreground mt-2">
            Verify your organization to unlock all features
          </p>
        </div>
        <KycStatusBadge status={kycData.status} />
      </div>

      {/* Progress Indicator */}
      {!isVerified && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Progress</CardTitle>
            <CardDescription>
              Complete all steps to verify your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationProgress currentStep={kycData.currentStep} />
          </CardContent>
        </Card>
      )}

      {/* Rejection Alert */}
      {isRejected && kycData.rejectionReason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium">Verification Rejected</p>
              <p className="mt-1 text-sm">{kycData.rejectionReason}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleStartVerification}
              >
                Resubmit Documents
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {isVerified && (
        <Alert className="border-success bg-success/10">
          <CheckCircle className="h-4 w-4 text-success" />
          <AlertDescription>
            <p className="font-medium text-success">Verification Complete</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your organization has been successfully verified.
              {kycData.reviewedAt && (
                <> Verified on {kycData.reviewedAt.toLocaleDateString()}.</>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* In Review Alert */}
      {isInReview && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <p className="font-medium">Under Review</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your documents are being reviewed. This usually takes 1-2 business
              days.
              {kycData.submittedAt && (
                <> Submitted on {kycData.submittedAt.toLocaleDateString()}.</>
              )}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <div className="mt-2">
                <KycStatusBadge status={kycData.status} />
              </div>
            </div>

            {kycData.submittedAt && (
              <div>
                <p className="text-sm font-medium">Submitted</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {kycData.submittedAt.toLocaleDateString()} at{' '}
                  {kycData.submittedAt.toLocaleTimeString()}
                </p>
              </div>
            )}

            {kycData.reviewedAt && (
              <div>
                <p className="text-sm font-medium">Reviewed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {kycData.reviewedAt.toLocaleDateString()} at{' '}
                  {kycData.reviewedAt.toLocaleTimeString()}
                </p>
              </div>
            )}

            {canStartVerification && (
              <Button
                className="w-full mt-4"
                onClick={handleStartVerification}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {kycData.status === 'pending'
                  ? 'Continue Verification'
                  : 'Start Verification'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Required Documents Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Required Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <DocumentItem
                label="Government-issued ID"
                description="Passport, driver's license, or national ID"
                completed={kycData.documents.idDocument}
              />
              <DocumentItem
                label="Proof of Address"
                description="Utility bill or bank statement (max 3 months old)"
                completed={kycData.documents.addressProof}
              />
              <DocumentItem
                label="Business Registration"
                description="Certificate of incorporation or business license"
                completed={kycData.documents.businessRegistration}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Why Verify Your Organization?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">Enhanced Security</h3>
              <p className="text-sm text-muted-foreground">
                Protect your organization and customers with verified identity
              </p>
            </div>
            <div className="space-y-2">
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">Build Trust</h3>
              <p className="text-sm text-muted-foreground">
                Show customers your organization is verified and legitimate
              </p>
            </div>
            <div className="space-y-2">
              <div className="p-2 bg-primary/10 rounded-lg w-fit">
                <ArrowRight className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-medium">Unlock Features</h3>
              <p className="text-sm text-muted-foreground">
                Access advanced features and higher transaction limits
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DocumentItemProps {
  label: string;
  description: string;
  completed?: boolean;
}

function DocumentItem({ label, description, completed }: DocumentItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
          completed
            ? 'bg-success border-success'
            : 'border-muted-foreground'
        }`}
      >
        {completed && <CheckCircle className="h-3 w-3 text-white" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
