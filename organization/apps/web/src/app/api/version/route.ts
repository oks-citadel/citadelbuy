import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/version
 *
 * Returns the current build information including:
 * - version: Semantic version from build
 * - commit: Git commit SHA
 * - buildDate: ISO timestamp of when the image was built
 * - environment: Current environment (dev/staging/production)
 *
 * This endpoint serves as a fallback when build-info.json is not available.
 * The information is read from environment variables set during Docker build.
 */
export async function GET() {
  try {
    // Try to read from build-info.json first
    const buildInfoPath = path.join(process.cwd(), 'public', 'build-info.json');

    if (fs.existsSync(buildInfoPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf-8'));
      return NextResponse.json(buildInfo, {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      });
    }

    // Fallback to environment variables
    const buildInfo = {
      version: process.env.APP_VERSION || process.env.npm_package_version || 'unknown',
      commit: process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      buildDate: process.env.BUILD_DATE || new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      // Additional metadata
      imageTag: process.env.IMAGE_TAG || 'local',
      region: process.env.AZURE_REGION || process.env.REGION || 'unknown',
    };

    return NextResponse.json(buildInfo, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Error fetching version info:', error);

    return NextResponse.json(
      {
        version: 'unknown',
        commit: 'unknown',
        buildDate: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        error: 'Could not fetch version info',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

/**
 * HEAD /api/version
 *
 * Quick health check that returns just headers
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-App-Version': process.env.APP_VERSION || 'unknown',
      'X-Git-Commit': process.env.GIT_SHA?.slice(0, 7) || 'unknown',
      'X-Environment': process.env.NODE_ENV || 'development',
    },
  });
}
