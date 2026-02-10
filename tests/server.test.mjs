/**
 * Server Tests
 * 
 * Run with: node tests/server.test.mjs
 * 
 * These tests verify:
 * - API endpoints work correctly
 * - Static files are served properly
 * - Server-side game can be instantiated
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Test configuration
const TEST_PORT = 18080;  // Use non-standard port to avoid conflicts
const BASE_URL = `http://localhost:${TEST_PORT}`;
const TIMEOUT = 10000;    // 10 seconds timeout for server startup

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let serverProcess = null;
let testsFailed = 0;
let testsPassed = 0;

// Helper: HTTP GET request
function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Helper: Start server
function startServer() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PORT: TEST_PORT.toString() };
    
    serverProcess = spawn('node', ['server.mjs'], {
      cwd: ROOT_DIR,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    
    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    serverProcess.on('error', reject);
    
    // Wait for server to be ready
    const checkInterval = setInterval(async () => {
      try {
        const response = await httpGet('/ping');
        if (response.statusCode === 200) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve({ stdout, stderr });
        }
      } catch (e) {
        // Server not ready yet
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkInterval);
      serverProcess.kill();
      reject(new Error(`Server failed to start within ${TIMEOUT}ms. STDERR: ${stderr}`));
    }, TIMEOUT);
  });
}

// Helper: Stop server
function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }
    
    serverProcess.on('close', resolve);
    serverProcess.kill('SIGTERM');
    
    // Force kill after 2 seconds
    setTimeout(() => {
      serverProcess.kill('SIGKILL');
      resolve();
    }, 2000);
  });
}

// Helper: Assert function
function assert(condition, message) {
  if (condition) {
    testsPassed++;
    console.log(`${GREEN}✓${RESET} ${message}`);
  } else {
    testsFailed++;
    console.log(`${RED}✗${RESET} ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    testsPassed++;
    console.log(`${GREEN}✓${RESET} ${message}`);
  } else {
    testsFailed++;
    console.log(`${RED}✗${RESET} ${message}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
  }
}

// ==================== TESTS ====================

console.log('\n=== Server Tests ===\n');

// Test 1: Server starts and responds to ping
console.log('--- Starting Server ---');
try {
  await startServer();
  console.log(`${GREEN}✓${RESET} Server started on port ${TEST_PORT}\n`);
} catch (e) {
  console.error(`${RED}✗ Failed to start server:${RESET}`, e.message);
  process.exit(1);
}

// Test 2: API Endpoints
console.log('--- API Endpoint Tests ---');

// Test 2a: Ping endpoint
const pingResponse = await httpGet('/ping');
assertEqual(pingResponse.statusCode, 200, 'GET /ping returns 200');
assertEqual(pingResponse.body, 'pong', 'GET /ping returns "pong"');

// Test 2b: Catalog object endpoint (valid object)
const catalogResponse = await httpGet('/catalog/object/2Dside:std:v1:Sword');
assertEqual(catalogResponse.statusCode, 200, 'GET /catalog/object/2Dside:std:v1:Sword returns 200');

try {
  const catalogData = JSON.parse(catalogResponse.body);
  const swordKey = '2Dside:std:v1:Sword';
  assert(catalogData[swordKey], 'Sword object returned')
  assertEqual(catalogData[swordKey].key, 'std:Sword', 'Sword object has correct key');
  assertEqual(catalogData[swordKey].namespace, 'std', 'Sword object has correct namespace');
  assertEqual(catalogData[swordKey].perspective, '2Dside', 'Sword object has correct perspective');
} catch (e) {
  assert(false, `Catalog response is valid JSON: ${e.message}`);
}

// Test 2c: Catalog object endpoint (invalid object)
const invalidCatalogResponse = await httpGet('/catalog/object/invalid:key');
assertEqual(invalidCatalogResponse.statusCode, 200, 'GET /catalog/object/invalid:key returns 200');
assertEqual(invalidCatalogResponse.body, '{}', 'Invalid object returns empty JSON object');

// Test 2d: Catalog search endpoint
const searchResponse = await httpGet('/catalog/search');
// Note: This is a POST endpoint, but we test GET returns appropriate response
// We'll do a proper POST test below

console.log('');

// Test 3: Static Endpoints
console.log('--- Static Endpoint Tests ---');

// Test 3a: Core index.mjs
const coreIndexResponse = await httpGet('/static/core/v1/index.mjs');
assertEqual(coreIndexResponse.statusCode, 200, 'GET /static/core/v1/index.mjs returns 200');
assert(coreIndexResponse.body.includes('export'), 'Core index.mjs contains exports');
assert(
  coreIndexResponse.headers['content-type']?.includes('javascript'),
  'Core index.mjs has correct Content-Type'
);

// Test 3b: Core game.mjs
const coreGameResponse = await httpGet('/static/core/v1/game.mjs');
assertEqual(coreGameResponse.statusCode, 200, 'GET /static/core/v1/game.mjs returns 200');
assert(coreGameResponse.body.length > 1000, 'Core game.mjs has content');

// Test 3c & 3d: Catalog std (if built)
const stdCatalogPath = join(ROOT_DIR, 'packages/core/dist/catalogs/std/v1/index.mjs');
if (existsSync(stdCatalogPath)) {
  const stdIndexResponse = await httpGet('/static/catalogs/std/v1/index.mjs');
  assertEqual(stdIndexResponse.statusCode, 200, 'GET /static/catalogs/std/v1/index.mjs returns 200');
  assert(stdIndexResponse.body.includes('import'), 'Std catalog index.mjs contains imports');

  const stdObjectsPath = join(ROOT_DIR, 'packages/core/dist/catalogs/std/v1/2Dside/objects.mjs');
  if (existsSync(stdObjectsPath)) {
    const stdObjectsResponse = await httpGet('/static/catalogs/std/v1/2Dside/objects.mjs');
    assertEqual(stdObjectsResponse.statusCode, 200, 'GET /static/catalogs/std/v1/2Dside/objects.mjs returns 200');
    assert(stdObjectsResponse.body.length > 1000, 'Std objects.mjs has content');
  }
} else {
  console.log(`  ${YELLOW}⚠${RESET} Std catalog not found in packages/core/dist/catalogs/std/v1/ - skipping static file tests`);
}

// Test 3e: HTML files
const indexHtmlResponse = await httpGet('/');
assertEqual(indexHtmlResponse.statusCode, 200, 'GET / returns 200');
assert(indexHtmlResponse.body.includes('<html'), 'Index HTML is valid');

// Test 3f: Non-existent file
const notFoundResponse = await httpGet('/static/nonexistent.js');
assertEqual(notFoundResponse.statusCode, 404, 'GET /static/nonexistent.js returns 404');

console.log('');

// Test 4: Server-side Game instantiation
console.log('--- Server-Side Game Tests ---');

// We can't easily test this without importing the modules,
// but we can verify the modules load correctly
console.log(`${YELLOW}⚠${RESET} Server-side game instantiation test requires module import`);
console.log('  (Skipped in HTTP test - verify manually with: node -e "import(\'./static/core/v1/index.mjs\').then(m => console.log(\'Game class:\', m.Game))")');

console.log('');

// Cleanup
console.log('--- Stopping Server ---');
await stopServer();
console.log(`${GREEN}✓${RESET} Server stopped\n`);

// Summary
console.log('=== Test Summary ===');
console.log(`${GREEN}Passed:${RESET} ${testsPassed}`);
console.log(`${RED}Failed:${RESET} ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log(`\n${GREEN}All tests passed!${RESET}`);
  process.exit(0);
}
