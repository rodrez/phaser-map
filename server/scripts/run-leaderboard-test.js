// run-leaderboard-test.js
// This script runs the leaderboard test

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import path from 'path';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the test script
const testScriptPath = path.join(__dirname, 'test-leaderboard.js');

// Run the test script
console.log(`Running leaderboard test script: ${testScriptPath}`);

const testProcess = spawn('node', [testScriptPath], {
  stdio: 'inherit'
});

testProcess.on('close', (code) => {
  console.log(`Leaderboard test script exited with code ${code}`);
}); 