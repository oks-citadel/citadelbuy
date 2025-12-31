'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Shield, Upload, CheckCircle, AlertTriangle, FileText, Award, Globe, Eye, RefreshCw } from 'lucide-react';

interface Certification {
  name: string;
  region: string;
  status: string;
  validUntil: string | null;
  uploaded: boolean;
}

export default function VendorCompliancePage() {
  const certifications: Certification[] = [
    {
      name: 'ISO 9001:2015',
      region: 'Global',
      status: 'active',
      validUntil: '2025-12-31',
      uploaded: true,
    },
    {
      name: 'CE Marking',
      region: 'Europe',
      status: 'active',
      validUntil: '2026-06-30',
      uploaded: true,
    },
    {
      name: 'FCC Certification',
      region: 'North America',
      status: 'expiring_soon',
      validUntil: '2025-01-15',
      uploaded: true,
    },
    {
      name: 'RoHS Compliance',
      region: 'Europe',
      status: 'missing',
      validUntil: null,
      uploaded: false,
    },
  ];

  // State for dialogs
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = React.useState(false);
  const [selectedCert, setSelectedCert] = React.useState<Certification | null>(null);

  // File input refs
  const certFileInputRef = React.useRef<HTMLInputElement>(null);
  const newCertFileInputRef = React.useRef<HTMLInputElement>(null);

  // Handler for Review button (expiring certifications alert)
  const handleReviewExpiring = () => {
    const expiringCerts = certifications.filter((c) => c.status === 'expiring_soon');
    if (expiringCerts.length > 0) {
      setSelectedCert(expiringCerts[0]);
      setRenewDialogOpen(true);
    } else {
      toast.info('No certifications expiring soon');
    }
  };

  // Handler for View button
  const handleViewCertification = (cert: Certification) => {
    setSelectedCert(cert);
    setViewDialogOpen(true);
  };

  // Handler for Renew button
  const handleRenewCertification = (cert: Certification) => {
    setSelectedCert(cert);
    setRenewDialogOpen(true);
  };

  // Handler for Upload button (for missing certifications)
  const handleUploadCertification = (cert: Certification) => {
    setSelectedCert(cert);
    certFileInputRef.current?.click();
  };

  // Handler for Choose Files button (new certification upload)
  const handleChooseFiles = () => {
    newCertFileInputRef.current?.click();
  };

  // Handler for certification file selection
  const handleCertFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF, JPG, or PNG files.');
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      // TODO: Replace with actual API call
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          loading: `Uploading ${selectedCert?.name || 'certification'}...`,
          success: `${selectedCert?.name || 'Certification'} uploaded successfully`,
          error: 'Failed to upload certification',
        }
      );
    }
    // Reset the input
    event.target.value = '';
  };

  // Handler for new certification file selection
  const handleNewCertFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type. Please upload PDF, JPG, or PNG files.');
        return;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      // TODO: Replace with actual API call
      toast.promise(
        new Promise((resolve) => setTimeout(resolve, 1500)),
        {
          loading: `Uploading ${file.name}...`,
          success: `${file.name} uploaded successfully. It will be reviewed shortly.`,
          error: 'Failed to upload certification',
        }
      );
    }
    // Reset the input
    event.target.value = '';
  };

  // Handler for renew confirmation
  const handleConfirmRenew = () => {
    if (!selectedCert) return;
    setRenewDialogOpen(false);
    certFileInputRef.current?.click();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expiring_soon':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance & Certifications</h1>
        <p className="text-muted-foreground mt-2">
          Manage certifications required for global markets
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {certifications.filter((c) => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {certifications.filter((c) => c.status === 'expiring_soon').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {certifications.filter((c) => c.status === 'missing').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
          </CardContent>
        </Card>
      </div>

      {/* Alert */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Action Required</h3>
              <p className="text-sm text-yellow-800 mt-1">
                1 certification expiring in 30 days. Upload renewed documents to maintain compliance.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReviewExpiring}>
              Review
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Certifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications by Region
          </CardTitle>
          <CardDescription>Required certifications for each market</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {certifications.map((cert, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(cert.status)}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{cert.name}</h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          cert.status
                        )}`}
                      >
                        {cert.status === 'active'
                          ? 'Active'
                          : cert.status === 'expiring_soon'
                          ? 'Expiring Soon'
                          : 'Missing'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{cert.region}</span>
                      </div>
                      {cert.validUntil && (
                        <span>Valid until: {cert.validUntil}</span>
                      )}
                    </div>
                  </div>
                </div>
                {cert.uploaded ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleViewCertification(cert)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleRenewCertification(cert)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Renew
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" className="gap-2" onClick={() => handleUploadCertification(cert)}>
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload New Certification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload New Certification
          </CardTitle>
          <CardDescription>Add additional certifications for new markets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Upload Certification Documents</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: PDF, JPG, PNG (max 10MB)
            </p>
            <Button onClick={handleChooseFiles}>Choose Files</Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Requirements by Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Regional Compliance Requirements
          </CardTitle>
          <CardDescription>Required documents for each market</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">North America</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• FCC Certification (Electronics)</li>
                <li>• UL Certification (Safety)</li>
                <li>• FDA Registration (Food/Medical)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Europe</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• CE Marking (All Products)</li>
                <li>• RoHS Compliance (Electronics)</li>
                <li>• REACH Registration (Chemicals)</li>
              </ul>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-2">Asia Pacific</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• PSE Mark (Japan - Electronics)</li>
                <li>• CCC Certification (China)</li>
                <li>• KC Mark (South Korea)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={certFileInputRef}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleCertFileChange}
      />
      <input
        type="file"
        ref={newCertFileInputRef}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleNewCertFileChange}
      />

      {/* View Certification Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedCert?.name}
            </DialogTitle>
            <DialogDescription>
              Certification details and document preview
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Region:</span>
                <p className="text-muted-foreground">{selectedCert?.region}</p>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <p className="text-muted-foreground capitalize">{selectedCert?.status?.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="font-medium">Valid Until:</span>
                <p className="text-muted-foreground">{selectedCert?.validUntil || 'N/A'}</p>
              </div>
              <div>
                <span className="font-medium">Document:</span>
                <p className="text-muted-foreground">{selectedCert?.uploaded ? 'Uploaded' : 'Not uploaded'}</p>
              </div>
            </div>
            <div className="border rounded-lg p-8 bg-muted/50 text-center">
              <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Document preview would appear here</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              toast.success('Document download started');
              setViewDialogOpen(false);
            }}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Certification Dialog */}
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Renew {selectedCert?.name}
            </DialogTitle>
            <DialogDescription>
              Upload a new certification document to replace the existing one
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCert?.status === 'expiring_soon' && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">Expiring Soon</p>
                  <p className="text-sm text-yellow-800">
                    This certification expires on {selectedCert.validUntil}. Please upload a renewed document to maintain compliance.
                  </p>
                </div>
              </div>
            )}
            <div className="text-sm">
              <p className="mb-2">Current certification details:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>Region: {selectedCert?.region}</li>
                <li>Valid Until: {selectedCert?.validUntil || 'N/A'}</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              Supported formats: PDF, JPG, PNG (max 10MB)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRenew}>
              <Upload className="h-4 w-4 mr-2" />
              Upload New Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
