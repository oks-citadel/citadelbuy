#!/usr/bin/env node
/**
 * Broxiva Monorepo - Affected Components Detection
 *
 * Analyzes git changes and dependency graph to determine
 * which components need rebuilding.
 *
 * Usage:
 *   node detect-affected-components.js [--json|--matrix|--list]
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Component definitions
const COMPONENTS = {
  api: {
    path: 'apps/api',
    dockerfile: 'apps/api/Dockerfile.production',
    image: 'api',
    type: 'backend',
    dependencies: ['packages/types', 'packages/utils', 'packages/config']
  },
  web: {
    path: 'apps/web',
    dockerfile: 'apps/web/Dockerfile.production',
    image: 'web',
    type: 'frontend',
    dependencies: ['packages/types', 'packages/ui', 'packages/utils', 'packages/config']
  },
  'ai-agents': {
    path: 'apps/services/ai-agents',
    dockerfile: 'apps/services/ai-agents/Dockerfile',
    image: 'services/ai-agents',
    type: 'service',
    dependencies: ['packages/types', 'packages/ai-sdk']
  },
  'ai-engine': {
    path: 'apps/services/ai-engine',
    dockerfile: 'apps/services/ai-engine/Dockerfile',
    image: 'services/ai-engine',
    type: 'service',
    dependencies: ['packages/types', 'packages/ai-sdk']
  },
  analytics: {
    path: 'apps/services/analytics',
    dockerfile: 'apps/services/analytics/Dockerfile',
    image: 'services/analytics',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  chatbot: {
    path: 'apps/services/chatbot',
    dockerfile: 'apps/services/chatbot/Dockerfile',
    image: 'services/chatbot',
    type: 'service',
    dependencies: ['packages/types', 'packages/ai-sdk']
  },
  'fraud-detection': {
    path: 'apps/services/fraud-detection',
    dockerfile: 'apps/services/fraud-detection/Dockerfile',
    image: 'services/fraud-detection',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  inventory: {
    path: 'apps/services/inventory',
    dockerfile: 'apps/services/inventory/Dockerfile',
    image: 'services/inventory',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  media: {
    path: 'apps/services/media',
    dockerfile: 'apps/services/media/Dockerfile',
    image: 'services/media',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  notification: {
    path: 'apps/services/notification',
    dockerfile: 'apps/services/notification/Dockerfile',
    image: 'services/notification',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  personalization: {
    path: 'apps/services/personalization',
    dockerfile: 'apps/services/personalization/Dockerfile',
    image: 'services/personalization',
    type: 'service',
    dependencies: ['packages/types', 'packages/ai-sdk']
  },
  pricing: {
    path: 'apps/services/pricing',
    dockerfile: 'apps/services/pricing/Dockerfile',
    image: 'services/pricing',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  recommendation: {
    path: 'apps/services/recommendation',
    dockerfile: 'apps/services/recommendation/Dockerfile',
    image: 'services/recommendation',
    type: 'service',
    dependencies: ['packages/types', 'packages/ai-sdk']
  },
  search: {
    path: 'apps/services/search',
    dockerfile: 'apps/services/search/Dockerfile',
    image: 'services/search',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  },
  'supplier-integration': {
    path: 'apps/services/supplier-integration',
    dockerfile: 'apps/services/supplier-integration/Dockerfile',
    image: 'services/supplier-integration',
    type: 'service',
    dependencies: ['packages/types', 'packages/utils']
  }
};

// Paths that trigger all builds
const GLOBAL_TRIGGER_PATHS = [
  '.github/workflows/build-and-push-acr.yml',
  '.github/workflows/ci-build-push.yml',
  'docker-compose.production.yml',
  '.dockerignore',
  'package.json',
  'pnpm-lock.yaml',
  'turbo.json'
];

/**
 * Get list of changed files from git
 */
function getChangedFiles() {
  try {
    const baseBranch = process.env.GITHUB_BASE_REF || process.env.BASE_BRANCH || 'main';
    const compareSha = process.env.COMPARE_SHA || 'HEAD';

    let changedFiles;

    if (process.env.GITHUB_BASE_REF) {
      // PR context
      try {
        execSync(`git fetch origin ${baseBranch} --depth=1`, { stdio: 'ignore' });
      } catch (e) {
        // Ignore fetch errors
      }
      changedFiles = execSync(`git diff --name-only origin/${baseBranch}...${compareSha}`)
        .toString()
        .trim();
    } else if (process.env.CI) {
      // CI context
      changedFiles = execSync('git diff --name-only HEAD~1')
        .toString()
        .trim();
    } else {
      // Local context
      try {
        changedFiles = execSync(`git diff --name-only ${baseBranch}...${compareSha}`)
          .toString()
          .trim();
      } catch (e) {
        changedFiles = execSync('git diff --name-only HEAD~1')
          .toString()
          .trim();
      }
    }

    return changedFiles.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting changed files:', error.message);
    return [];
  }
}

/**
 * Check if a file path matches any of the given patterns
 */
function pathMatches(filePath, patterns) {
  return patterns.some(pattern => filePath.startsWith(pattern));
}

/**
 * Build reverse dependency map
 */
function buildReverseDependencyMap() {
  const reverseMap = {};

  for (const [name, config] of Object.entries(COMPONENTS)) {
    for (const dep of config.dependencies || []) {
      if (!reverseMap[dep]) {
        reverseMap[dep] = [];
      }
      reverseMap[dep].push(name);
    }
  }

  return reverseMap;
}

/**
 * Get all components affected by package changes
 */
function getAffectedByPackage(packagePath, reverseMap) {
  const affected = new Set();

  for (const [dep, components] of Object.entries(reverseMap)) {
    if (packagePath.startsWith(dep)) {
      components.forEach(c => affected.add(c));
    }
  }

  return Array.from(affected);
}

/**
 * Main detection logic
 */
function detectAffectedComponents() {
  const changedFiles = getChangedFiles();

  if (changedFiles.length === 0) {
    return {
      affected: [],
      all_changed: false,
      shared_changed: false,
      packages_changed: [],
      matrix: { include: [] }
    };
  }

  const reverseDepMap = buildReverseDependencyMap();
  const affected = new Set();
  const packagesChanged = new Set();
  let allChanged = false;
  let sharedChanged = false;

  // Check for global triggers
  const hasGlobalTrigger = changedFiles.some(f =>
    GLOBAL_TRIGGER_PATHS.some(p => f === p || f.endsWith(p))
  );

  if (hasGlobalTrigger) {
    allChanged = true;
    Object.keys(COMPONENTS).forEach(c => affected.add(c));
  }

  // Check each changed file
  for (const file of changedFiles) {
    // Check if packages changed
    if (file.startsWith('packages/')) {
      sharedChanged = true;
      packagesChanged.add(file.split('/').slice(0, 2).join('/'));

      // Find all components depending on this package
      const affectedByPackage = getAffectedByPackage(file, reverseDepMap);
      affectedByPackage.forEach(c => affected.add(c));
    }

    // Check if specific component changed
    for (const [name, config] of Object.entries(COMPONENTS)) {
      if (file.startsWith(config.path + '/')) {
        affected.add(name);
      }
    }
  }

  // Build affected components array with full metadata
  const affectedArray = Array.from(affected).map(name => ({
    name,
    path: COMPONENTS[name].path,
    dockerfile: COMPONENTS[name].dockerfile,
    image: COMPONENTS[name].image,
    type: COMPONENTS[name].type,
    context: '.'  // Monorepo context
  }));

  return {
    affected: affectedArray,
    affected_names: Array.from(affected),
    all_changed: allChanged,
    shared_changed: sharedChanged,
    packages_changed: Array.from(packagesChanged),
    changed_files_count: changedFiles.length,
    matrix: {
      include: affectedArray
    }
  };
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);
  const result = detectAffectedComponents();

  switch (args[0]) {
    case '--list':
      console.log(result.affected_names.join('\n'));
      break;
    case '--matrix':
      console.log(JSON.stringify(result.matrix, null, 2));
      break;
    case '--github-output':
      // Output for GitHub Actions
      const matrix = JSON.stringify(result.matrix);
      const affected = result.affected_names.join(',');
      const hasAffected = result.affected.length > 0 ? 'true' : 'false';

      console.log(`matrix=${matrix}`);
      console.log(`affected=${affected}`);
      console.log(`has_affected=${hasAffected}`);
      console.log(`all_changed=${result.all_changed}`);
      break;
    case '--json':
    default:
      console.log(JSON.stringify(result, null, 2));
  }
}

main();
