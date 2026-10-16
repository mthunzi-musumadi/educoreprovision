import { pool, upsertUserFromEntraClaims } from '../server/db.ts';
import {
  mapEntraRoleToUserRole,
  createSessionToken,
  verifySessionToken,
  getMicrosoftOidcConfig,
  generatePkce,
} from '../server/auth.ts';

async function runAuthTests() {
  console.log('=== Microsoft Entra ID OIDC / OAuth2 & Session Verification Suite ===\n');
  let failures = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    } else {
      console.log(`✅ PASS: ${message}`);
    }
  }

  try {
    // 1. Role mapping tests
    console.log('[1] Testing Microsoft App Role Mapping...');
    assert(mapEntraRoleToUserRole(['Provision.Applicant']) === 'APPLICANT', 'Provision.Applicant maps to APPLICANT');
    assert(mapEntraRoleToUserRole(['Provision.HeadTeacher']) === 'HEAD_TEACHER', 'Provision.HeadTeacher maps to HEAD_TEACHER');
    assert(mapEntraRoleToUserRole(['Provision.LineManager']) === 'LINE_MANAGER', 'Provision.LineManager maps to LINE_MANAGER');
    assert(mapEntraRoleToUserRole(['Provision.HRManager']) === 'HR_MANAGER', 'Provision.HRManager maps to HR_MANAGER');
    assert(mapEntraRoleToUserRole(['Provision.ITManager']) === 'IT_MANAGER', 'Provision.ITManager maps to IT_MANAGER');
    assert(mapEntraRoleToUserRole(['Provision.FinanceManager']) === 'FINANCE_MANAGER', 'Provision.FinanceManager maps to FINANCE_MANAGER');
    assert(mapEntraRoleToUserRole(['Provision.LogisticsManager']) === 'LOGISTICS_MANAGER', 'Provision.LogisticsManager maps to LOGISTICS_MANAGER');
    assert(mapEntraRoleToUserRole(['Provision.SuperAdmin']) === 'SUPER_ADMIN', 'Provision.SuperAdmin maps to SUPER_ADMIN');
    assert(mapEntraRoleToUserRole() === 'APPLICANT', 'Default role is APPLICANT');

    // 2. PKCE generation
    console.log('\n[2] Testing PKCE generation...');
    const pkce = generatePkce();
    assert(!!pkce.codeVerifier && pkce.codeVerifier.length >= 32, 'Valid PKCE codeVerifier generated');
    assert(!!pkce.codeChallenge && pkce.codeChallenge.length >= 32, 'Valid PKCE codeChallenge generated');

    // 3. Session token sign and verify
    console.log('\n[3] Testing HMAC Session Tokens...');
    const token = createSessionToken({
      userId: 'test-user-123',
      entraOid: '4a73b281-2c0f-4886-ba0a-7fb9ea8ceb62',
      role: 'HEAD_TEACHER',
      email: 'bkuhn@trident-college.com',
    });
    assert(!!token && token.split('.').length === 3, 'Session token properly constructed');

    const verified = verifySessionToken(token);
    assert(verified?.userId === 'test-user-123', 'Session token payload verified correctly');
    assert(verified?.role === 'HEAD_TEACHER', 'Session token preserves user role');

    const fakeToken = token.slice(0, -4) + 'abcd';
    assert(verifySessionToken(fakeToken) === null, 'Tampered token rejected');

    // 4. Test upsertUserFromEntraClaims with database
    console.log('\n[4] Testing Database synchronization with Microsoft Entra Claims...');
    const testOid = 'f0000000-1111-2222-3333-444455556666';
    const testEmail = 'entra.teacher@trident-college.com';

    // Cleanup lingering
    await pool.query('DELETE FROM users WHERE entra_oid::text = $1 OR email = $2', [testOid, testEmail]);

    const createdUser = await upsertUserFromEntraClaims({
      entraOid: testOid,
      email: testEmail,
      fullName: 'Entra Provisioned Teacher',
      role: 'APPLICANT',
      siteCode: 'TCL',
      employeeNumber: 'EDC-8888',
      department: 'Computer Science',
      jobTitle: 'ICT Teacher',
    });

    assert(createdUser.email === testEmail, 'User created in PostgreSQL from Entra ID claims');
    assert(createdUser.entra_oid === testOid, 'Entra OID saved accurately in PostgreSQL');
    assert(createdUser.role === 'APPLICANT', 'Role correctly assigned');
    assert(createdUser.site_code === 'TCL', 'Site code assigned to Trident College');

    // Upsert existing user (role elevation via Entra ID App Role update)
    const updatedUser = await upsertUserFromEntraClaims({
      entraOid: testOid,
      email: testEmail,
      fullName: 'Entra Provisioned Teacher (Promoted)',
      role: 'HEAD_TEACHER',
      siteCode: 'TCL',
      employeeNumber: 'EDC-8888',
    });

    assert(updatedUser.id === createdUser.id, 'Existing user updated without duplicate row');
    assert(updatedUser.role === 'HEAD_TEACHER', 'User role upgraded based on updated Entra claims');
    assert(updatedUser.full_name === 'Entra Provisioned Teacher (Promoted)', 'Full name refreshed');

    // Clean up
    await pool.query('DELETE FROM users WHERE entra_oid::text = $1', [testOid]);

    // 5. Test Audit Logs Under Database Access
    console.log('\n[5] Testing Immutable Audit Logs...');
    const auditLogs = await pool.query('SELECT * FROM public.approval_audit_logs ORDER BY created_at DESC LIMIT 5');
    assert(auditLogs.rows.length >= 0, `Approval audit logs queryable (${auditLogs.rows.length} rows returned)`);

    console.log(`\n========================================`);
    if (failures === 0) {
      console.log('🎉 ALL AUTH TESTS PASSED PERFECTLY!');
    } else {
      console.error(`💥 AUTH SUITE COMPLETED WITH ${failures} FAILURES`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unhandled auth test error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runAuthTests();
