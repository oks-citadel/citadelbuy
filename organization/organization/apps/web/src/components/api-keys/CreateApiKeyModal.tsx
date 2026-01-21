'use client';

import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, Key, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface CreateApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, permissions: string[]) => Promise<string>;
}

const availablePermissions = [
  {
    id: 'read:products',
    label: 'Read Products',
    description: 'View product information',
  },
  {
    id: 'write:products',
    label: 'Write Products',
    description: 'Create and update products',
  },
  {
    id: 'read:orders',
    label: 'Read Orders',
    description: 'View order information',
  },
  {
    id: 'write:orders',
    label: 'Write Orders',
    description: 'Create and update orders',
  },
  {
    id: 'read:customers',
    label: 'Read Customers',
    description: 'View customer information',
  },
  {
    id: 'write:customers',
    label: 'Write Customers',
    description: 'Create and update customers',
  },
  {
    id: 'read:analytics',
    label: 'Read Analytics',
    description: 'View analytics and reports',
  },
  {
    id: 'admin',
    label: 'Admin Access',
    description: 'Full administrative access',
  },
];

export function CreateApiKeyModal({
  open,
  onOpenChange,
  onCreate,
}: CreateApiKeyModalProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [createdKey, setCreatedKey] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Please select at least one permission');
      return;
    }

    try {
      setIsCreating(true);
      const key = await onCreate(name, selectedPermissions);
      setCreatedKey(key);
      setStep('success');
    } catch (err) {
      toast.error('Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast.success('API key copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    if (step === 'success') {
      // Reset form
      setStep('form');
      setName('');
      setSelectedPermissions([]);
      setCreatedKey('');
      setCopied(false);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {step === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key with specific permissions for your
                organization
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g., Production Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to help you identify this key
                </p>
              </div>

              {/* Permissions */}
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {availablePermissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() =>
                          handlePermissionToggle(permission.id)
                        }
                        disabled={isCreating}
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={permission.id}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {permission.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPermissions.length} permission(s) selected
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  isCreating || !name.trim() || selectedPermissions.length === 0
                }
                isLoading={isCreating}
              >
                Create API Key
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="p-2 bg-success/10 rounded-full">
                  <Check className="h-5 w-5 text-success" />
                </div>
                API Key Created
              </DialogTitle>
              <DialogDescription>
                Your API key has been created successfully
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Warning Alert */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium">Important: Save this key now</p>
                  <p className="text-sm mt-1">
                    This is the only time you'll see the full API key. Make sure
                    to copy it and store it securely.
                  </p>
                </AlertDescription>
              </Alert>

              {/* API Key Display */}
              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg border">
                    <code className="text-sm font-mono break-all">
                      {createdKey}
                    </code>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Key Details */}
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Key Name:</span>
                  <span className="text-muted-foreground">{name}</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="mt-0.5">
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <span className="font-medium">Permissions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedPermissions.map((permId) => {
                        const perm = availablePermissions.find(
                          (p) => p.id === permId
                        );
                        return (
                          <span
                            key={permId}
                            className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded"
                          >
                            {perm?.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Tips */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Security Tips:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Never share your API key in public repositories</li>
                  <li>Use environment variables to store keys securely</li>
                  <li>Rotate keys regularly for better security</li>
                  <li>Revoke keys immediately if compromised</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                I've Saved My Key
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
