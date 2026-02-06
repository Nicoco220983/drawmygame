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
const builtCorePath = join(ROOT_DIR, 'static/core/v1/index.mjs');
const builtStdPath = join(ROOT_DIR, 'static/catalogs/std/index.mjs');

if (!existsSync(builtCorePath)) {
  console.error(`${RED}ERROR:${RESET} Built core files not found at static/core/v1/`);
  console.error(`Run ${YELLOW}npm run build${RESET} first to transpile source files.`);
  process.exit(1);
}

if (!existsSync(builtStdPath)) {
  console.log(`${YELLOW}⚠${RESET} Built std catalog files not found at static/catalogs/std/`);
  console.log(`  Std catalog tests will be skipped.`);
  console.log(`  To install std catalog: npm run install_catalog <package-name>`);
}

console.log(`${GREEN}✓${RESET} Built files found\n`);

// Test 1: Import core module
console.log('--- Core Module Import ---');

try {
  const corePath = join(ROOT_DIR, 'static/core/v1/index.mjs');
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
if (existsSync(builtStdPath)) {
  console.log('--- Std Catalog Import ---');

  try {
    // First import core (required for std catalog)
    const corePath = join(ROOT_DIR, 'static/core/v1/index.mjs');
    const core = await import(corePath);
    
    const initialObjectCount = Object.keys(core.CATALOG.objects).length;
    console.log(`  Initial CATALOG.objects count: ${initialObjectCount}`);
    
    // Now import std catalog
    const stdPath = join(ROOT_DIR, 'static/catalogs/std/index.mjs');
    await import(stdPath);
    
    const afterObjectCount = Object.keys(core.CATALOG.objects).length;
    console.log(`  After std import CATALOG.objects count: ${afterObjectCount}`);
    
    assert(afterObjectCount > initialObjectCount, 'Std catalog registers objects');
    assert(afterObjectCount >= 50, `Std catalog registers at least 50 objects (found ${afterObjectCount})`);
    
    // Check specific objects exist
    const sword = core.CATALOG.objects['2Dside:std:v1:Sword'];
    assert(sword !== undefined, 'Sword object is registered');
    
    if (sword) {
      assertEqual(sword.key, 'std:Sword', 'Sword has correct key');
      assertEqual(sword.namespace, 'std', 'Sword has correct namespace');
      assertEqual(sword.perspective, '2Dside', 'Sword has correct perspective');
      assertEqual(sword.version, 'v1', 'Sword has correct version');
    }
    
    // Check scenes
    const afterSceneCount = Object.keys(core.CATALOG.scenes).length;
    console.log(`  After std import CATALOG.scenes count: ${afterSceneCount}`);
    assert(afterSceneCount > 0, 'Std catalog registers scenes');
    
  } catch (e) {
    assert(false, `Std catalog imports successfully: ${e.message}`);
    console.error(e);
  }

  console.log('');
}

// Test 3: Game class instantiation (basic)
console.log('--- Game Class Tests ---');

try {
  const corePath = join(ROOT_DIR, 'static/core/v1/index.mjs');
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
  'static/core/v1/index.mjs',
  'static/core/v1/game.mjs',
  'static/core/v1/catalog.mjs',
  'static/index.html',
  'static/room.html',
  'server.mjs'
];

// Optional files (std catalog)
const optionalFiles = [
  'static/catalogs/std/index.mjs',
  'static/catalogs/std/v1/2Dside/objects.mjs'
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
