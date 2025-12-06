#!/usr/bin/env node

/**
 * HMAC-SHA256 Signature Generator for CitadelBuy Webhooks
 *
 * Usage:
 *   node generate-signature.js <payload-file> [secret]
 *   node generate-signature.js test-payloads.json
 *   node generate-signature.js custom-payload.json my-webhook-secret
 *
 * Environment Variables:
 *   CITADELBUY_WEBHOOK_SECRET - Default webhook secret if not provided as argument
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * Generate HMAC-SHA256 signature
 */
function generateSignature(payload, secret) {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
}

/**
 * Format bytes for display
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  CitadelBuy Webhook HMAC-SHA256 Signature Generator');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(colors.reset);

  // Parse command line arguments
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`${colors.yellow}Usage:${colors.reset}`);
    console.log('  node generate-signature.js <payload-file> [secret]');
    console.log('  node generate-signature.js test-payloads.json');
    console.log('  node generate-signature.js custom-payload.json my-webhook-secret\n');
    console.log(`${colors.yellow}Environment Variables:${colors.reset}`);
    console.log('  CITADELBUY_WEBHOOK_SECRET - Default webhook secret\n');
    console.log(`${colors.yellow}Examples:${colors.reset}`);
    console.log('  node generate-signature.js test-payloads.json');
    console.log('  CITADELBUY_WEBHOOK_SECRET=abc123 node generate-signature.js test.json');
    process.exit(0);
  }

  const payloadFile = args[0];
  const secret = args[1] || process.env.CITADELBUY_WEBHOOK_SECRET || 'your-webhook-secret-key';

  // Validate secret
  if (secret === 'your-webhook-secret-key') {
    console.log(`${colors.red}⚠️  WARNING: Using default secret. Set CITADELBUY_WEBHOOK_SECRET or pass as argument.${colors.reset}\n`);
  }

  if (secret.length < 32) {
    console.log(`${colors.yellow}⚠️  WARNING: Secret should be at least 32 characters for security.${colors.reset}\n`);
  }

  // Read payload file
  const payloadPath = path.resolve(payloadFile);

  if (!fs.existsSync(payloadPath)) {
    console.error(`${colors.red}✗ Error: File not found: ${payloadPath}${colors.reset}`);
    process.exit(1);
  }

  console.log(`${colors.dim}Reading payload from: ${payloadPath}${colors.reset}\n`);

  let payloadData;
  try {
    const fileContent = fs.readFileSync(payloadPath, 'utf8');
    payloadData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`${colors.red}✗ Error reading/parsing payload file: ${error.message}${colors.reset}`);
    process.exit(1);
  }

  // Check if file contains test_payloads structure
  let payloads = {};
  if (payloadData.test_payloads) {
    payloads = payloadData.test_payloads;
    console.log(`${colors.green}✓ Found ${Object.keys(payloads).length} test payloads${colors.reset}\n`);
  } else {
    // Single payload
    payloads = { main: payloadData };
  }

  // Generate signatures for all payloads
  console.log(`${colors.bright}Generated Signatures:${colors.reset}`);
  console.log('─'.repeat(80) + '\n');

  const results = [];

  for (const [name, payload] of Object.entries(payloads)) {
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payload, secret);
    const payloadSize = Buffer.byteLength(payloadString, 'utf8');

    results.push({
      name,
      signature,
      payloadSize,
      payload
    });

    console.log(`${colors.bright}${colors.blue}Payload: ${name}${colors.reset}`);
    console.log(`${colors.dim}Size: ${formatBytes(payloadSize)}${colors.reset}`);
    console.log(`${colors.green}Signature: ${signature}${colors.reset}\n`);
  }

  // Generate curl commands
  console.log('\n' + '─'.repeat(80));
  console.log(`${colors.bright}${colors.cyan}Sample cURL Commands:${colors.reset}\n`);

  for (const result of results) {
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'https://your-n8n.com/webhook/citadelbuy-order-webhook';

    console.log(`${colors.bright}# Test: ${result.name}${colors.reset}`);
    console.log(`curl -X POST '${webhookUrl}' \\`);
    console.log(`  -H 'Content-Type: application/json' \\`);
    console.log(`  -H 'X-CitadelBuy-Signature: ${result.signature}' \\`);
    console.log(`  -d '${JSON.stringify(result.payload).replace(/'/g, "'\"'\"'")}'`);
    console.log();
  }

  // Generate Node.js code snippet
  console.log('\n' + '─'.repeat(80));
  console.log(`${colors.bright}${colors.cyan}Node.js Code Snippet:${colors.reset}\n`);

  console.log(`${colors.dim}const crypto = require('crypto');
const axios = require('axios');

async function sendWebhook(payload) {
  const secret = '${secret.substring(0, 10)}...';
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');

  const response = await axios.post(
    'https://your-n8n.com/webhook/citadelbuy-order-webhook',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-CitadelBuy-Signature': signature
      }
    }
  );

  return response.data;
}

// Example usage
sendWebhook(${JSON.stringify(results[0].payload, null, 2).split('\n').map((line, i) => i === 0 ? line : '  ' + line).join('\n')})
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error.message));
${colors.reset}`);

  // Save signatures to file
  const outputFile = path.join(path.dirname(payloadPath), 'generated-signatures.json');
  const output = {
    generated_at: new Date().toISOString(),
    secret_preview: secret.substring(0, 8) + '...',
    webhook_url: process.env.N8N_WEBHOOK_URL || 'https://your-n8n.com/webhook/citadelbuy-order-webhook',
    signatures: results.map(r => ({
      name: r.name,
      signature: r.signature,
      payload_size: r.payloadSize,
      payload: r.payload
    }))
  };

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));

  console.log('\n' + '─'.repeat(80));
  console.log(`${colors.green}✓ Signatures saved to: ${outputFile}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log(colors.reset);
}

// Run main function
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`${colors.red}✗ Unexpected error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { generateSignature };
