'use client';

import React, { useState } from 'react';
import {
  Copy,
  Trash2,
  Key,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created: Date;
  lastUsed?: Date;
  permissions: string[];
  status: 'active' | 'revoked';
}

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onRevoke: (keyId: string) => Promise<void>;
  isLoading?: boolean;
}

export function ApiKeyList({ apiKeys, onRevoke, isLoading }: ApiKeyListProps) {
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const handleCopyPrefix = (prefix: string) => {
    navigator.clipboard.writeText(prefix);
    toast.success('Key prefix copied to clipboard');
  };

  const handleRevoke = async () => {
    if (!revokeKeyId) return;

    try {
      setIsRevoking(true);
      await onRevoke(revokeKeyId);
      toast.success('API key revoked successfully');
      setRevokeKeyId(null);
    } catch (err) {
      toast.error('Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  const toggleExpanded = (keyId: string) => {
    setExpandedKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTimeSinceLastUsed = (lastUsed?: Date) => {
    if (!lastUsed) return 'Never used';

    const now = new Date();
    const diff = now.getTime() - lastUsed.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Used today';
    if (days === 1) return 'Used yesterday';
    if (days < 7) return `Used ${days} days ago`;
    if (days < 30) return `Used ${Math.floor(days / 7)} weeks ago`;
    return `Used ${Math.floor(days / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
                <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-muted rounded-full">
              <Key className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No API Keys</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              You haven't created any API keys yet. Create your first key to start
              using the API.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {apiKeys.map((key) => {
          const isExpanded = expandedKeys.has(key.id);
          const isRevoked = key.status === 'revoked';

          return (
            <Card key={key.id} className={isRevoked ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-primary/10 rounded">
                        <Key className="h-4 w-4 text-primary" />
                      </div>
                      <h3 className="font-medium text-lg">{key.name}</h3>
                      <Badge
                        variant={isRevoked ? 'destructive' : 'success'}
                      >
                        {key.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Created {formatDate(key.created)}
                      </div>
                      <div className="flex items-center gap-1">
                        {key.lastUsed ? (
                          <CheckCircle className="h-3 w-3 text-success" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-warning" />
                        )}
                        {getTimeSinceLastUsed(key.lastUsed)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => toggleExpanded(key.id)}
                    >
                      {isExpanded ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {!isRevoked && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setRevokeKeyId(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Key Prefix */}
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="flex-1 font-mono text-sm">
                    {key.prefix}{'•'.repeat(32)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopyPrefix(key.prefix)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>

                {/* Permissions */}
                {isExpanded && (
                  <div className="pt-3 border-t space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Permissions</h4>
                      <div className="flex flex-wrap gap-2">
                        {key.permissions.map((permission) => (
                          <Badge key={permission} variant="secondary">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {key.lastUsed && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Last Used</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(key.lastUsed)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={revokeKeyId !== null}
        onOpenChange={(open) => !open && setRevokeKeyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this API key? This action cannot be
              undone and any applications using this key will immediately lose
              access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? 'Revoking...' : 'Revoke Key'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
