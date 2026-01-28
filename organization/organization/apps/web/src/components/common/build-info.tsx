'use client';

import { useState, useEffect } from 'react';
import { Info, GitCommit, Calendar, Server, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

interface BuildInfo {
  version: string;
  commit: string;
  buildDate: string;
  environment: string;
}

interface BuildInfoProps {
  /** Show as expanded panel or compact badge */
  variant?: 'panel' | 'badge' | 'footer';
  /** Additional CSS classes */
  className?: string;
}

/**
 * BuildInfo Component
 *
 * Displays current build/deployment information including:
 * - Version number
 * - Git commit SHA
 * - Build timestamp
 * - Environment (dev/staging/prod)
 *
 * The build info is injected at Docker build time via build-info.json
 */
export function BuildInfo({ variant = 'footer', className = '' }: BuildInfoProps) {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBuildInfo() {
      try {
        // Try to fetch from static file first (generated during Docker build)
        const response = await fetch('/build-info.json');
        if (response.ok) {
          const data = await response.json();
          setBuildInfo(data);
        } else {
          // Fallback to API endpoint
          const apiResponse = await fetch('/api/version');
          if (apiResponse.ok) {
            const data = await apiResponse.json();
            setBuildInfo(data);
          }
        }
      } catch (error) {
        console.warn('Could not fetch build info:', error);
        // Use fallback values for development
        setBuildInfo({
          version: 'dev',
          commit: 'local',
          buildDate: new Date().toISOString(),
          environment: 'development'
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchBuildInfo();
  }, []);

  if (isLoading || !buildInfo) {
    return null;
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env.toLowerCase()) {
      case 'production':
      case 'prod':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'staging':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'development':
      case 'dev':
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  const shortCommit = buildInfo.commit?.slice(0, 7) || 'unknown';

  // Badge variant - minimal display
  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-mono rounded-full border ${getEnvironmentColor(buildInfo.environment)} ${className}`}
        title={`Version ${buildInfo.version} | Commit ${shortCommit}`}
      >
        <span className="capitalize">{buildInfo.environment}</span>
        <span className="text-muted-foreground">|</span>
        <span>v{buildInfo.version}</span>
      </div>
    );
  }

  // Footer variant - compact with expand option
  if (variant === 'footer') {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Info className="h-3 w-3" />
          <span className="font-mono">v{buildInfo.version}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${getEnvironmentColor(buildInfo.environment)}`}>
            {buildInfo.environment}
          </span>
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {isExpanded && (
          <div className="mt-2 p-3 bg-muted/50 rounded-lg border space-y-2">
            <div className="flex items-center gap-2">
              <GitCommit className="h-3 w-3" />
              <span>Commit:</span>
              <code className="font-mono bg-background px-1.5 py-0.5 rounded">{shortCommit}</code>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              <span>Built:</span>
              <span>{formatDate(buildInfo.buildDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="h-3 w-3" />
              <span>Environment:</span>
              <span className="capitalize">{buildInfo.environment}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Panel variant - full display for admin pages
  return (
    <div className={`p-4 bg-card border rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" />
          Build Information
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getEnvironmentColor(buildInfo.environment)}`}>
          {buildInfo.environment}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Server className="h-4 w-4" />
            Version
          </span>
          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">v{buildInfo.version}</code>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            Commit
          </span>
          <a
            href={`https://github.com/broxiva/broxiva/commit/${buildInfo.commit}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors flex items-center gap-1"
          >
            {shortCommit}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Build Date
          </span>
          <span className="text-sm">{formatDate(buildInfo.buildDate)}</span>
        </div>
      </div>
    </div>
  );
}

export default BuildInfo;
