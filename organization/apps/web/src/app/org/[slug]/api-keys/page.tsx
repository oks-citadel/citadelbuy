'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Key, Shield, Code, Loader2, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiKeyList, type ApiKey } from '@/components/api-keys/ApiKeyList';
import { CreateApiKeyModal } from '@/components/api-keys/CreateApiKeyModal';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export default function ApiKeysPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, [slug]);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);

      // Load API keys from backend
      const response = await apiClient.get(`/organizations/${slug}/api-keys`);

      // Map API keys to frontend format
      const mappedKeys: ApiKey[] = response.data.map((key: any) => ({
        id: key.id,
        name: key.name,
        prefix: key.keyPrefix || '••••••••',
        permissions: key.permissions || [],
        status: key.isActive ? 'active' as const : 'revoked' as const,
        created: new Date(key.createdAt),
        lastUsed: key.lastUsedAt ? new Date(key.lastUsedAt) : undefined,
      }));

      setApiKeys(mappedKeys);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load API keys';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async (
    name: string,
    permissions: string[]
  ): Promise<string> => {
    try {
      // Create API key via backend
      const response = await apiClient.post(`/organizations/${slug}/api-keys`, {
        name,
        permissions
      });

      // Add new key to the list
      const newKey: ApiKey = {
        id: response.data.id,
        name: response.data.name,
        prefix: response.data.keyPrefix || '••••••••',
        permissions: response.data.permissions || [],
        status: 'active' as const,
        created: new Date(response.data.createdAt),
        lastUsed: undefined
      };

      setApiKeys((prev) => [newKey, ...prev]);

      toast.success('API key created successfully');

      // Return the full API key (only shown once)
      return response.data.apiKey;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create API key';
      toast.error(errorMessage);
      throw err;
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      // Revoke API key via backend
      await apiClient.delete(`/organizations/${slug}/api-keys/${keyId}`);

      // Update the key status in the list
      setApiKeys((prev) =>
        prev.map((key) =>
          key.id === keyId ? { ...key, status: 'revoked' as const } : key
        )
      );

      toast.success('API key revoked successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke API key';
      toast.error(errorMessage);
    }
  };

  const activeKeys = apiKeys.filter((key) => key.status === 'active');
  const revokedKeys = apiKeys.filter((key) => key.status === 'revoked');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage API keys for your organization's integrations
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create API Key
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Keys</CardDescription>
            <CardTitle className="text-3xl">{activeKeys.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Keys</CardDescription>
            <CardTitle className="text-3xl">{apiKeys.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Revoked Keys</CardDescription>
            <CardTitle className="text-3xl">{revokedKeys.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-1">
            <p className="font-medium">API Key Security</p>
            <p className="text-sm text-muted-foreground">
              Keep your API keys secure. Never expose them in client-side code or
              public repositories. If a key is compromised, revoke it immediately
              and create a new one.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Getting Started Guide */}
      {apiKeys.length === 0 && !isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Getting Started with API Keys
            </CardTitle>
            <CardDescription>
              Learn how to use API keys to integrate with CitadelBuy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Create an API Key</h4>
                  <p className="text-sm text-muted-foreground">
                    Click "Create API Key" and select the permissions your
                    integration needs
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Copy Your Key</h4>
                  <p className="text-sm text-muted-foreground">
                    Save the API key securely - you won't be able to see it again
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Start Building</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the API key in your requests to authenticate with our API
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Example Request</p>
              <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
                <code>{`curl https://api.citadelbuy.com/v1/products \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</code>
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {activeKeys.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active API Keys</h2>
            <ApiKeyList
              apiKeys={activeKeys}
              onRevoke={handleRevokeKey}
              isLoading={isLoading}
            />
          </div>
        )}

        {revokedKeys.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Revoked API Keys</h2>
            <ApiKeyList
              apiKeys={revokedKeys}
              onRevoke={handleRevokeKey}
              isLoading={isLoading}
            />
          </div>
        )}

        {apiKeys.length === 0 && isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* API Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" />
            API Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <p className="text-sm">
                Learn more about our API endpoints, authentication, rate limits,
                and best practices.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://docs.citadelbuy.com/api"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    API Reference
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://docs.citadelbuy.com/guides"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Integration Guides
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://docs.citadelbuy.com/examples"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Code Examples
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Modal */}
      <CreateApiKeyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreate={handleCreateKey}
      />
    </div>
  );
}
