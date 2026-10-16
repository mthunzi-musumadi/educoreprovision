import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('========================================================================');
console.log('Educore Provision v4.2 Master Automated Verification Suite');
console.log('========================================================================\n');

const testSuites = [
  { name: 'Entra ID OIDC & Session Verification Suite', file: path.join(__dirname, 'auth.test.ts') },
  { name: 'Form Required Fields Comprehensive Validation Suite', file: path.join(__dirname, 'form_validation.test.ts') },
  { name: 'Stepper Navigation & Stage Enforcement Suite', file: path.join(__dirname, 'stepper_navigation.test.ts') },
  { name: 'RFC-4180 CSV Export & Data Integrity Suite', file: path.join(__dirname, 'csv_export.test.ts') },
  { name: 'API, Dynamic Workflow & Attachment Integration Suite', file: path.join(__dirname, 'server_api.test.ts') },
];

let totalFailures = 0;

for (const suite of testSuites) {
  console.log(`\n>>> Executing ${suite.name}...`);
  const result = spawnSync('npx', ['tsx', suite.file], {
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    totalFailures++;
    console.error(`\n❌ ${suite.name} FAILED with exit code ${result.status}`);
  } else {
    console.log(`\n✅ ${suite.name} COMPLETED SUCCESSFULLY`);
  }
}

console.log('\n========================================================================');
if (totalFailures === 0) {
  console.log('🎉 ALL MASTER VERIFICATION SUITES PASSED (100%)!');
  console.log('========================================================================\n');
  process.exit(0);
} else {
  console.error(`💥 ${totalFailures} MASTER VERIFICATION SUITE(S) FAILED!`);
  console.log('========================================================================\n');
  process.exit(1);
}
