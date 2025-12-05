#!/usr/bin/env ts-node

/**
 * Cleanup Script for Payment Webhook Events
 *
 * This script removes old webhook events from the database to prevent
 * table bloat and maintain optimal performance.
 *
 * Usage:
 *   npm run cleanup:webhook-events
 *   npm run cleanup:webhook-events -- --days 7
 *   npm run cleanup:webhook-events -- --dry-run
 *
 * Cron Schedule:
 *   Daily at 2 AM: 0 2 * * *
 *   Weekly on Sunday at 2 AM: 0 2 * * 0
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupOptions {
  daysToKeep: number;
  dryRun: boolean;
  provider?: string;
}

async function cleanupWebhookEvents(options: CleanupOptions) {
  const { daysToKeep, dryRun, provider } = options;

  console.log('='.repeat(60));
  console.log('Payment Webhook Events Cleanup');
  console.log('='.repeat(60));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Days to keep: ${daysToKeep}`);
  console.log(`Provider filter: ${provider || 'all'}`);
  console.log(`Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));
  console.log('');

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
  console.log('');

  // Build where clause
  const whereClause: any = {
    processedAt: {
      lt: cutoffDate,
    },
    status: 'completed', // Only delete completed events
  };

  if (provider) {
    whereClause.provider = provider;
  }

  try {
    // Get statistics before cleanup
    console.log('Analyzing events to be deleted...');
    const eventsToDelete = await prisma.paymentWebhookEvent.findMany({
      where: whereClause,
      select: {
        provider: true,
        status: true,
        eventType: true,
      },
    });

    // Group by provider
    const statsByProvider: Record<string, number> = {};
    const statsByEventType: Record<string, number> = {};

    eventsToDelete.forEach((event) => {
      statsByProvider[event.provider] = (statsByProvider[event.provider] || 0) + 1;
      statsByEventType[event.eventType] = (statsByEventType[event.eventType] || 0) + 1;
    });

    const totalToDelete = eventsToDelete.length;

    console.log('');
    console.log('Events to be deleted:');
    console.log(`Total: ${totalToDelete}`);
    console.log('');

    if (totalToDelete > 0) {
      console.log('By Provider:');
      Object.entries(statsByProvider)
        .sort(([, a], [, b]) => b - a)
        .forEach(([provider, count]) => {
          console.log(`  ${provider}: ${count}`);
        });
      console.log('');

      console.log('By Event Type (top 10):');
      Object.entries(statsByEventType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([eventType, count]) => {
          console.log(`  ${eventType}: ${count}`);
        });
      console.log('');

      if (dryRun) {
        console.log('DRY RUN: No events were deleted.');
        console.log('Run without --dry-run flag to actually delete events.');
      } else {
        // Perform deletion
        console.log('Deleting events...');
        const startTime = Date.now();

        const result = await prisma.paymentWebhookEvent.deleteMany({
          where: whereClause,
        });

        const duration = Date.now() - startTime;

        console.log('');
        console.log('Deletion complete:');
        console.log(`  Events deleted: ${result.count}`);
        console.log(`  Duration: ${duration}ms`);
        console.log('');

        // Get remaining statistics
        const remaining = await prisma.paymentWebhookEvent.count();
        const oldestEvent = await prisma.paymentWebhookEvent.findFirst({
          orderBy: { processedAt: 'asc' },
          select: { processedAt: true },
        });

        console.log('Remaining events:');
        console.log(`  Total: ${remaining}`);
        if (oldestEvent) {
          console.log(`  Oldest event: ${oldestEvent.processedAt.toISOString()}`);
        }
      }
    } else {
      console.log('No events found matching the criteria.');
    }

    console.log('');
    console.log('='.repeat(60));
    console.log(`Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('');
    console.error('ERROR: Cleanup failed');
    console.error('='.repeat(60));
    console.error(error.message);
    console.error(error.stack);
    console.error('='.repeat(60));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
function parseArgs(): CleanupOptions {
  const args = process.argv.slice(2);
  const options: CleanupOptions = {
    daysToKeep: 30, // Default: keep 30 days
    dryRun: false,
    provider: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--days':
        const days = parseInt(args[++i], 10);
        if (isNaN(days) || days < 1) {
          console.error('Error: --days must be a positive number');
          process.exit(1);
        }
        options.daysToKeep = days;
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--provider':
        options.provider = args[++i];
        break;

      case '--help':
        printHelp();
        process.exit(0);
        break;

      default:
        console.error(`Error: Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

function printHelp() {
  console.log('');
  console.log('Payment Webhook Events Cleanup Script');
  console.log('');
  console.log('Usage:');
  console.log('  npm run cleanup:webhook-events [options]');
  console.log('');
  console.log('Options:');
  console.log('  --days <number>     Number of days to keep (default: 30)');
  console.log('  --dry-run           Preview what would be deleted without actually deleting');
  console.log('  --provider <name>   Only delete events from specific provider (stripe, paypal, etc.)');
  console.log('  --help              Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run cleanup:webhook-events');
  console.log('  npm run cleanup:webhook-events -- --days 7');
  console.log('  npm run cleanup:webhook-events -- --days 30 --provider stripe');
  console.log('  npm run cleanup:webhook-events -- --dry-run');
  console.log('');
}

// Main execution
const options = parseArgs();
cleanupWebhookEvents(options)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
