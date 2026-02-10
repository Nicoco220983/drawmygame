/**
 * Module Import Tests
 * 
 * Run with: node tests/modules.test.mjs
 * 
 * These tests verify that core modules can be imported and basic functionality works.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsFailed = 0;
let testsPassed = 0;

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

console.log('\n=== Module Import Tests ===\n');

// Pre-flight check: Verify built files exist
console.log('--- Pre-flight Checks ---');
const builtCorePath = join(ROOT_DIR, 'packages/core/dist/core/v1/index.mjs');
const stdCatalogPath = join(ROOT_DIR, 'packages/std/dist/v1/index.mjs');

if (!existsSync(builtCorePath)) {
  console.error(`${RED}ERROR:${RESET} Built core files not found at packages/core/dist/`);
  console.error(`Run ${YELLOW}npm run build${RESET} first to transpile source files.`);
  process.exit(1);
}

if (!existsSync(stdCatalogPath)) {
  console.log(`${YELLOW}⚠${RESET} Std catalog dist not found at packages/std/dist/v1/`);
  console.log(`  Std catalog tests will be skipped.`);
  console.log(`  Run 'npm run build' to build the std catalog.`);
}

console.log(`${GREEN}✓${RESET} Built files found\n`);

// Test 1: Import core module
console.log('--- Core Module Import ---');

try {
  const corePath = join(ROOT_DIR, 'packages/core/dist/core/v1/index.mjs');
    const core = await import(corePath);
  
  assert(typeof core.Game !== 'undefined', 'Game class is exported');
  assert(typeof core.Scene !== 'undefined', 'Scene class is exported');
  assert(typeof core.GameObject !== 'undefined', 'GameObject class is exported');
  assert(typeof core.CATALOG !== 'undefined', 'CATALOG is exported');
  assert(typeof core.pack !== 'undefined', 'pack function is exported');
  assert(typeof core.unpack !== 'undefined', 'unpack function is exported');
  
  // Test CATALOG structure
  assert(typeof core.CATALOG.objects === 'object', 'CATALOG.objects exists');
  assert(typeof core.CATALOG.scenes === 'object', 'CATALOG.scenes exists');
  assert(typeof core.CATALOG.registerObject === 'function', 'CATALOG.registerObject is a function');
  assert(typeof core.CATALOG.registerScene === 'function', 'CATALOG.registerScene is a function');
  
} catch (e) {
  assert(false, `Core module imports successfully: ${e.message}`);
}

console.log('');

// Test 2: Import std catalog (if available)
// NOTE: Direct file import of std catalog doesn't work because the transpiled files
// use relative imports (../../../../core/v1/index.mjs) that resolve to the wrong path
// after transpilation. The packages are designed to be served via HTTP where paths
// resolve correctly. The server tests verify this functionality.
console.log('--- Std Catalog Import ---');
console.log(`${YELLOW}⚠${RESET} Skipping direct std catalog import test`);
console.log('  Reason: Transpiled files have relative imports that do not resolve correctly');
console.log('  when imported directly as files. The catalog is tested via server tests.');
console.log('');

// Test 3: Game class instantiation (basic)
console.log('--- Game Class Tests ---');

try {
  const corePath = join(ROOT_DIR, 'packages/core/dist/core/v1/index.mjs');
  const core = await import(corePath);
  
  // Test that Game class can be referenced (can't easily instantiate without full setup)
  assert(typeof core.Game === 'function', 'Game is a class/constructor');
  
  // Test MODE constants (they are numeric enums)
  assertEqual(core.MODE_LOCAL, 0, 'MODE_LOCAL constant exists');
  assertEqual(core.MODE_CLIENT, 2, 'MODE_CLIENT constant exists');
  assertEqual(core.MODE_SERVER, 1, 'MODE_SERVER constant exists');
  
} catch (e) {
  assert(false, `Game class tests pass: ${e.message}`);
}

console.log('');

// Test 4: Verify file paths
console.log('--- File Path Verification ---');

import { existsSync } from 'fs';

const criticalFiles = [
  'packages/core/dist/core/v1/index.mjs',
  'packages/core/dist/core/v1/game.mjs',
  'packages/core/dist/core/v1/catalog.mjs',
  'packages/core/dist/core/index.html',
  'packages/core/dist/core/room.html',
  'server.mjs'
];

// Optional files (std catalog in monorepo)
const optionalFiles = [
  'packages/std/dist/v1/index.mjs',
  'packages/std/dist/v1/2Dside/objects.mjs',
  'packages/core/dist/catalogs/std/v1/index.mjs',
  'packages/core/dist/catalogs/std/v1/2Dside/objects.mjs'
];

for (const file of criticalFiles) {
  const fullPath = join(ROOT_DIR, file);
  assert(existsSync(fullPath), `File exists: ${file}`);
}

// Check optional files (warn but don't fail)
for (const file of optionalFiles) {
  const fullPath = join(ROOT_DIR, file);
  if (existsSync(fullPath)) {
    console.log(`${GREEN}✓${RESET} Optional file exists: ${file}`);
    testsPassed++;
  } else {
    console.log(`${YELLOW}⚠${RESET} Optional file missing: ${file}`);
    // Don't count as failure
  }
}

console.log('');

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
