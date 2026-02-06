/**
 * Test Runner
 * 
 * Run all tests with: node tests/run-all.mjs
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

async function runTest(name, script) {
  console.log(`\n${BLUE}========================================${RESET}`);
  console.log(`${BLUE}  Running: ${name}${RESET}`);
  console.log(`${BLUE}========================================${RESET}\n`);
  
  return new Promise((resolve) => {
    const proc = spawn('node', [script], {
      cwd: join(__dirname, '..'),
      stdio: 'inherit'
    });
    
    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

console.log(`${BLUE}`);
console.log('  _____         _     _                _   _                  ');
console.log(' |_   _|__  ___| |_  | |_ ___    _ __ | |_(_) ___  _ __  ___  ');
console.log('   | |/ _ \/ __| __| | __/ _ \  | \'_ \| __| |/ _ \| \\\_ \/ __| ');
console.log('   | |  __/\__ \ |_  | || (_) | | |_) | |_| | (_) | | | \__ \\ ');
console.log('   |_|\___||___/\__|  \__\___/  | .__/ \__|_|\___/|_| |_|___/ ');
console.log('                                |_|                           ');
console.log(`${RESET}`);

let allPassed = true;

// Test 1: Module imports
allPassed = await runTest('Module Import Tests', 'tests/modules.test.mjs') && allPassed;

// Test 2: Server endpoints
allPassed = await runTest('Server Endpoint Tests', 'tests/server.test.mjs') && allPassed;

console.log(`\n${BLUE}========================================${RESET}`);
console.log(`${BLUE}  Final Results${RESET}`);
console.log(`${BLUE}========================================${RESET}\n`);

if (allPassed) {
  console.log(`${GREEN}  ✓ All test suites passed!${RESET}\n`);
  process.exit(0);
} else {
  console.log(`${RED}  ✗ Some tests failed${RESET}\n`);
  process.exit(1);
}
