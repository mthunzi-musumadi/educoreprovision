import { pool, dbService } from '../server/db.ts';
import { User, LaptopTier, RepaymentPlan, HRVettingChecklist } from '../src/types/index.ts';

async function runTests() {
  console.log('=== Educore Provision Integration & Verification Suite ===\n');
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
    // 1. Initialize and verify DB connection
    console.log('[1] Initializing database...');
    await dbService.initialize();
    assert(true, 'PostgreSQL database connected and initialized');

    // Clean up any lingering test applications & users
    await pool.query("DELETE FROM approval_audit_logs WHERE application_id IN (SELECT id FROM applications WHERE applicant_id IN (SELECT id FROM users WHERE email LIKE 'test.%'))");
    await pool.query("DELETE FROM applications WHERE applicant_id IN (SELECT id FROM users WHERE email LIKE 'test.%')");
    await pool.query("DELETE FROM users WHERE email LIKE 'test.%'");

    // 2. Verify Seed Data & Schema Tables
    console.log('\n[2] Verifying seed records and tables...');
    const institutions = await dbService.getInstitutions();
    assert(institutions.length === 5, `Found 5 institutions (got ${institutions.length})`);
    
    const users = await dbService.getUsers();
    assert(users.length === 7, `Found 7 benchmark users (got ${users.length})`);

    // Verify roles present
    const roles = new Set(users.map(u => u.role));
    assert(roles.has('APPLICANT'), 'Applicant role exists');
    assert(roles.has('HEAD_TEACHER'), 'Head Teacher role exists');
    assert(roles.has('HR_MANAGER'), 'HR Manager role exists');
    assert(roles.has('IT_MANAGER'), 'IT Manager role exists');
    assert(roles.has('SUPER_ADMIN'), 'Super Admin role exists');

    // Reset database to ensure clean baseline
    console.log('\n[3] Baseline Seed Verification...');
    await dbService.resetDatabase();
    
    // Check initial benchmark applications (all 5 cases)
    const superAdmin = users.find(u => u.role === 'SUPER_ADMIN')!;
    const allApps = await dbService.getApplications(superAdmin);
    assert(allApps.length === 5, `5 benchmark seed applications loaded (got ${allApps.length})`);

    const statuses = allApps.map(a => a.status);
    assert(statuses.includes('APPROVED'), 'Benchmark includes APPROVED case');
    assert(statuses.includes('PENDING_GM_REVIEW'), 'Benchmark includes PENDING_GM_REVIEW case');
    assert(statuses.includes('PENDING_HR_REVIEW'), 'Benchmark includes PENDING_HR_REVIEW case');
    assert(statuses.includes('PENDING_IT_SIGNOFF'), 'Benchmark includes PENDING_IT_SIGNOFF case');
    assert(statuses.includes('REJECTED'), 'Benchmark includes REJECTED case');

    // 4. Verify Row-Level Security (PostgreSQL SET ROLE educore_app & claim.sub)
    console.log('\n[4] Testing PostgreSQL 18 Row-Level Security (RLS)...');
    
    // Jane Mwanza (Applicant at Trident College)
    const jane = users.find(u => u.email === 'jmwanza@trident-college.com')!;
    const janeApps = await dbService.getApplications(jane);
    assert(janeApps.length === 3, `Jane Mwanza (Applicant) sees only her 3 applications (got ${janeApps.length})`);
    for (const app of janeApps) {
      assert(app.applicantId === jane.id, `App ${app.referenceNumber} matches Jane's applicantId`);
    }

    // Blair Kuhn (Head Teacher at Trident College)
    const blair = users.find(u => u.email === 'bkuhn@trident-college.com')!;
    const blairApps = await dbService.getApplications(blair);
    assert(blairApps.length === 3, `Blair Kuhn (Head Teacher) sees Trident College applications (expected 3, got ${blairApps.length})`);
    for (const app of blairApps) {
      assert(app.institutionId === blair.institutionId, `App ${app.referenceNumber} belongs to Trident College`);
    }

    // Direct Database client check with native RLS role
    const rlsClient = await pool.connect();
    try {
      await rlsClient.query('BEGIN');
      await rlsClient.query('SET ROLE educore_app');
      await rlsClient.query(`SET LOCAL request.jwt.claim.sub = '${jane.entraOid}'`);
      const directJaneRes = await rlsClient.query('SELECT count(*) FROM applications');
      assert(Number.parseInt(directJaneRes.rows[0].count, 10) === 3, `Native PostgreSQL RLS restricts SELECT to 3 rows for Jane's claim.sub`);
      
      // Test PRD Section 5 compatibility views under RLS
      const viewAppsRes = await rlsClient.query('SELECT count(*) FROM purchase_applications');
      assert(Number.parseInt(viewAppsRes.rows[0].count, 10) === 3, `PRD compatibility view purchase_applications returns 3 rows under Jane's RLS`);
      
      const viewTimelineRes = await rlsClient.query('SELECT count(*) FROM application_timeline_events');
      assert(Number.parseInt(viewTimelineRes.rows[0].count, 10) >= 3, `PRD compatibility view application_timeline_events queries successfully under RLS`);
      await rlsClient.query('COMMIT');
    } finally {
      rlsClient.release();
    }

    // 5. Audit Timeline Logs
    console.log('\n[5] Verifying Audit Timeline Logs...');
    const app1 = allApps.find(a => a.status === 'APPROVED')!;
    const timeline1 = await dbService.getTimelineForApplication(app1.id, superAdmin);
    assert(timeline1.length >= 4, `Approved application has full audit history (got ${timeline1.length} events)`);

    // 6. Test Workflow State Machine Lifecycle Transitions
    console.log('\n[6] Testing Full Application Workflow Lifecycle (Part 1 -> Part 2 -> Part 3 -> Part 4)...');
    
    // Create a temporary applicant user in Trident College with no active applications
    const tridentSchool = institutions.find(i => i.code === 'TRIDENT_COLLEGE')!;
    await pool.query(
      `INSERT INTO users (id, entra_oid, employee_number, full_name, email, role, institution_id, is_active)
       VALUES ('00000000-0000-0000-0004-000000000099', '00000000-0000-0000-0000-000000000099', 'EDC-9999', 'Test Staff Member', 'test.staff@trident-college.com', 'APPLICANT', $1, true)
       ON CONFLICT (id) DO UPDATE SET institution_id = EXCLUDED.institution_id, email = EXCLUDED.email, is_active = true`,
      [tridentSchool.id]
    );
    const testApplicant = (await dbService.getUsers()).find(u => u.email === 'test.staff@trident-college.com')!;
    assert(!!testApplicant, 'Created test applicant user');

    // PART 1: Applicant Submission
    console.log('-> Testing Part 1 submission validation...');
    const invalidSubmit = await dbService.submitPart1(testApplicant, {
      tier: 'LEVEL_2',
      repaymentPeriod: 'TWENTY_FOUR_MONTHS',
      estimatedMonthlyAmount: 1187.50,
      termsAccepted: false,
    });
    assert(!invalidSubmit.success, 'Fails when terms are not accepted');

    const validSubmit = await dbService.submitPart1(testApplicant, {
      tier: 'LEVEL_2',
      repaymentPeriod: 'TWENTY_FOUR_MONTHS',
      estimatedMonthlyAmount: 1187.50,
      termsAccepted: true,
      ipAddress: '196.220.124.99',
      userAgent: 'Integration Test Runner',
    });
    assert(validSubmit.success && !!validSubmit.application, 'Part 1 submission succeeded');
    const createdApp = validSubmit.application!;
    assert(createdApp.status === 'PENDING_GM_REVIEW', 'Application status is PENDING_GM_REVIEW');
    assert(createdApp.termsAccepted === true, 'Legal terms recorded as accepted');
    assert(!!createdApp.applicantDigitalSignature, 'Applicant digital signature generated');

    // Duplicate submission prevention
    const duplicateSubmit = await dbService.submitPart1(testApplicant, {
      tier: 'LEVEL_1',
      repaymentPeriod: 'TWELVE_MONTHS',
      estimatedMonthlyAmount: 1400.00,
      termsAccepted: true,
    });
    assert(!duplicateSubmit.success, 'Prevents duplicate in-flight application for same applicant');

    // Testing Head Teacher Request Revision flow
    console.log('-> Testing Part 2 Revision Request & Recovery flow...');
    const tridentHT = users.find(u => u.email === 'bkuhn@trident-college.com')!;
    const revisionResult = await dbService.endorsePart2(
      tridentHT,
      createdApp.id,
      'Staff selected 24 months, recommend 12 months for tenure alignment.',
      'REVISION'
    );
    assert(revisionResult.success, 'Head Teacher successfully requested revision');
    assert(revisionResult.application?.status === 'REVISION_REQUIRED', 'Application status changed to REVISION_REQUIRED');

    // Duplicate submission check while in REVISION_REQUIRED
    const submitDuringRevision = await dbService.submitPart1(testApplicant, {
      tier: 'LEVEL_1',
      repaymentPeriod: 'TWELVE_MONTHS',
      estimatedMonthlyAmount: 1400.00,
      termsAccepted: true,
    });
    assert(!submitDuringRevision.success, 'Prevents submitting new application while one requires revision');

    // Applicant withdraws the revision-required application to re-apply
    const withdrawRevisionResult = await dbService.withdrawApplication(testApplicant, createdApp.id);
    assert(withdrawRevisionResult.success, 'Applicant successfully withdrew REVISION_REQUIRED application');
    const withdrawnApp = await dbService.getApplicationById(createdApp.id, testApplicant);
    assert(withdrawnApp?.status === 'CLOSED', 'Withdrawn application status is CLOSED');

    // Applicant resubmits with 12 months plan
    console.log('-> Resubmitting Part 1 after revision withdrawal...');
    const resubmitResult = await dbService.submitPart1(testApplicant, {
      tier: 'LEVEL_2',
      repaymentPeriod: 'TWELVE_MONTHS',
      estimatedMonthlyAmount: 2375.00,
      termsAccepted: true,
      ipAddress: '196.220.124.99',
      userAgent: 'Integration Test Runner',
    });
    assert(resubmitResult.success && !!resubmitResult.application, 'Part 1 re-submission succeeded');
    const activeApp = resubmitResult.application!;

    // PART 2: Head Teacher Endorsement
    console.log('-> Testing Part 2 endorsement...');
    // Sentinel Kabitaka Head Teacher trying to endorse Trident College application must fail RLS
    const wrongSchoolHT = users.find(u => u.email === 'cmwape@sentinel-kabitaka.com')!;
    const unauthorizedEndorse = await dbService.endorsePart2(
      wrongSchoolHT,
      activeApp.id,
      'Unauthorized cross-school endorsement attempt',
      'ENDORSE'
    );
    assert(!unauthorizedEndorse.success, 'Fails when Head Teacher is from a different campus');

    // Trident College Head Teacher endorses
    const validEndorse = await dbService.endorsePart2(
      tridentHT,
      activeApp.id,
      'Academic need confirmed for STEM delivery. Staff member in good standing.',
      'ENDORSE'
    );
    if (!validEndorse.success) console.error('validEndorse error:', validEndorse.error);
    assert(validEndorse.success && !!validEndorse.application, 'Part 2 endorsement succeeded');
    assert(validEndorse.application?.status === 'PENDING_HR_REVIEW', 'Application status is now PENDING_HR_REVIEW');
    assert(validEndorse.application?.gmReviewerId === tridentHT.id, 'GM reviewer recorded accurately');

    // PART 3: HR Clearance
    console.log('-> Testing Part 3 HR clearance...');
    // Non-HR trying to clear Part 3 must fail
    const nonHR = testApplicant;
    const unauthorizedHR = await dbService.clearPart3(nonHR, activeApp.id, {
      comments: 'Hacking HR',
      isRejecting: false,
    });
    assert(!unauthorizedHR.success, 'Fails when non-HR attempts Part 3 clearance');

    const hrManager = users.find(u => u.role === 'HR_MANAGER')!;
    const checklist: HRVettingChecklist = {
      probationCleared: true,
      zeroSalaryAdvanceConflicts: true,
      debtRatioWithinThreshold: true,
      verifiedBy: hrManager.fullName,
      verifiedAt: new Date().toISOString(),
    };
    const validHR = await dbService.clearPart3(hrManager, activeApp.id, {
      checklist,
      comments: 'Full employment status and debt service ratio of 16.2% verified.',
      isRejecting: false,
    });
    assert(validHR.success && !!validHR.application, 'Part 3 HR clearance succeeded');
    assert(validHR.application?.status === 'PENDING_IT_SIGNOFF', 'Application status is now PENDING_IT_SIGNOFF');
    assert(validHR.application?.hrChecklist?.debtRatioWithinThreshold === true, 'HR checklist persisted in database');

    // PART 4: IT Provisioning and Asset Handover
    console.log('-> Testing Part 4 IT provisioning and signoff...');
    const itManager = users.find(u => u.role === 'IT_MANAGER')!;
    const validIT = await dbService.signoffPart4(itManager, activeApp.id, {
      serialNumber: 'LNV-TRD-2026-X99',
      monthlyAmount: 2375.00,
      startDate: '2026-04',
      endDate: '2027-03',
      comments: 'ThinkPad T14 STEM spec unboxed, asset tag affixed, Microsoft Intune enrolled.',
      isRejecting: false,
    });
    assert(validIT.success && !!validIT.application, 'Part 4 IT signoff succeeded');
    assert(validIT.application?.status === 'APPROVED', 'Application status is APPROVED');
    assert(validIT.application?.assetSerialNumber === 'LNV-TRD-2026-X99', 'Asset serial number recorded');
    assert(validIT.application?.deductionStartDate === '2026-04', 'Deduction start date formatted');
    assert(validIT.application?.deductionEndDate === '2027-03', 'Deduction end date formatted');

    // Verify all 4 audit events are present in database
    const finalTimeline = await dbService.getTimelineForApplication(activeApp.id, superAdmin);
    assert(finalTimeline.length === 4, `All 4 audit events logged in approval_audit_logs (got ${finalTimeline.length})`);
    const actionTypes = finalTimeline.map(e => e.actionType);
    assert(actionTypes.includes('SUBMITTED_PART_1'), 'Audit log has SUBMITTED_PART_1');
    assert(actionTypes.includes('ENDORSED_PART_2'), 'Audit log has ENDORSED_PART_2');
    assert(actionTypes.includes('CLEARED_PART_3'), 'Audit log has CLEARED_PART_3');
    assert(actionTypes.includes('FINALIZED_PART_4'), 'Audit log has FINALIZED_PART_4');

    // 7. Cleanup & Database Reset
    console.log('\n[7] Cleaning up test data & resetting database to benchmark seed...');
    await pool.query('DELETE FROM approval_audit_logs WHERE application_id IN (SELECT id FROM applications WHERE applicant_id = $1)', [testApplicant.id]);
    await pool.query('DELETE FROM applications WHERE applicant_id = $1', [testApplicant.id]);
    await pool.query("DELETE FROM users WHERE email LIKE 'test.%'");
    await dbService.resetDatabase();
    const cleanApps = await dbService.getApplications(superAdmin);
    assert(cleanApps.length === 5, 'Database successfully restored to 5 benchmark cases');

    console.log(`\n========================================`);
    if (failures === 0) {
      console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      console.error(`💥 TEST SUITE COMPLETED WITH ${failures} FAILURES`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Unhandled test error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTests();
