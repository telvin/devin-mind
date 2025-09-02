#!/usr/bin/env node

import { startWorkflow } from './src/workflow-executor.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function printUsage() {
  console.log('Usage: devin-workflow --file <absolute path> [--pollingInterval N] [--timeout N] [--verbose true|false] [--mock true|false] [--apiKey KEY]');
}

function parseArgs(args) {
  const options = {};
  let filePath = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[i + 1];
      i++;
    } else if (args[i].startsWith('--')) {
      const key = args[i].replace('--', '');
      let value = args[i + 1];
      if (value && !value.startsWith('--')) {
        i++;
      } else {
        value = true;
      }
      // Convert to correct types
      if (key === 'pollingInterval' || key === 'timeout') {
        value = Number(value);
      } else if (key === 'verbose' || key === 'mock') {
        value = value === 'true' || value === true;
      }
      options[key === 'mock' ? 'useMockMode' : key] = value;
    }
  }
  return { filePath, options };
}

async function main() {
  const args = process.argv.slice(2);
  const { filePath, options } = parseArgs(args);
  if (!filePath) {
    printUsage();
    process.exit(1);
  }
  try {
    const absPath = resolve(filePath);
    const workflowContent = readFileSync(absPath, 'utf8');
    console.log(`🚀 Executing workflow from: ${absPath}\n`);
    const result = await startWorkflow(workflowContent, options);
    console.log('\n✅ Workflow execution result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();