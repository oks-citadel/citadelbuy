const https = require('https');

const GH_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = 'oks-citadel';
const REPO_NAME = 'citadelbuy';
const PUBLIC_KEY = 'KAwIxtYC1uuA8D/GpcbGO152brBu5WDX4YzZFYg4uGs=';
const KEY_ID = '3380204578043523366';

// Import required crypto
let nacl, naclUtil;
try {
  nacl = require('tweetnacl');
  naclUtil = require('tweetnacl-util');
} catch {
  console.log('Installing dependencies...');
  require('child_process').execSync('npm install tweetnacl tweetnacl-util', { stdio: 'inherit' });
  nacl = require('tweetnacl');
  naclUtil = require('tweetnacl-util');
}

const secrets = {
  'AZURE_CLIENT_ID': 'a5a79cb9-458d-454c-a66e-c2508835c921',
  'AZURE_TENANT_ID': 'ed27e9a3-1b1c-46c9-8a73-a4f3609d75c0',
  'AZURE_SUBSCRIPTION_ID': 'ba233460-2dbe-4603-a594-68f93ec9deb3'
};

function encryptSecret(publicKey, secretValue) {
  const keyBytes = naclUtil.decodeBase64(publicKey);
  const messageBytes = naclUtil.decodeUTF8(secretValue);
  const encrypted = nacl.box.seal(messageBytes, keyBytes);
  return naclUtil.encodeBase64(encrypted);
}

async function setSecret(name, value) {
  return new Promise((resolve, reject) => {
    const encryptedValue = encryptSecret(PUBLIC_KEY, value);
    const data = JSON.stringify({
      encrypted_value: encryptedValue,
      key_id: KEY_ID
    });

    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${name}`,
      method: 'PUT',
      headers: {
        'Authorization': `token ${GH_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'CitadelBuy-Setup'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Set secret: ${name}`);
          resolve();
        } else {
          console.error(`Failed to set ${name}: ${res.statusCode} ${body}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Setting GitHub repository secrets...\n');
  for (const [name, value] of Object.entries(secrets)) {
    await setSecret(name, value);
  }
  console.log('\nAll secrets configured!');
}

main().catch(console.error);
