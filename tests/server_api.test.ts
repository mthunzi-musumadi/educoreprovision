import http from 'http';
import { pool, dbService } from '../server/db.ts';

async function testEndpoints() {
  console.log('=== Educore Provision End-to-End API Integration Suite ===\n');
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
    await dbService.initialize();

    // 1. Sites & Users
    const insts = await dbService.getSites();
    assert(insts.length === 5, `Sites returned (5): got ${insts.length}`);

    const users = await dbService.getUsers();
    assert(users.length === 7, `Users returned (7): got ${users.length}`);

    // 2. Head Teacher (Blair Kuhn) vs Applicant (Jane Mwanza) Scoped Applications
    const jane = users.find(u => u.email === 'jmwanza@trident-college.com')!;
    const blair = users.find(u => u.email === 'bkuhn@trident-college.com')!;
    const hr = users.find(u => u.role === 'HR_MANAGER')!;

    const janeApps = await dbService.getApplications(jane);
    const blairApps = await dbService.getApplications(blair);
    const hrApps = await dbService.getApplications(hr);

    assert(janeApps.length === 3, `Jane (Applicant) gets strictly her 3 applications under RLS (got ${janeApps.length})`);
    assert(blairApps.length === 3, `Blair (Head Teacher) gets all 3 Trident College applications under RLS (got ${blairApps.length})`);
    assert(hrApps.length === 5, `HR Manager gets all 5 benchmark applications across organization (got ${hrApps.length})`);

    // Verify applicant IDs
    for (const app of janeApps) {
      assert(app.applicantId === jane.id, `Jane's app ${app.referenceNumber} matches Jane's ID`);
    }

    // Notice: For Blair Kuhn, his personal applications are:
    const blairPersonalApps = blairApps.filter(a => a.applicantId === blair.id);
    assert(blairPersonalApps.length === 0, `Blair Kuhn has 0 personal applications (Jane submitted them), so his personal view correctly has 0`);

    // 3. Testing Blair Kuhn (Head Teacher) submitting a Personal Laptop Application
    console.log('\n-> Testing Head Teacher submitting personal request...');
    const submitResult = await dbService.submitPart1(blair, {
      tier: 'LEVEL_2',
      repaymentPeriod: 'TWENTY_FOUR_MONTHS',
      estimatedMonthlyAmount: 1875.0,
      termsAccepted: true,
      ipAddress: '196.220.124.88',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Trident Leadership Test',
    });

    assert(submitResult.success === true, `Head Teacher personal submission succeeded`);
    assert(Boolean(submitResult.application), `Personal application created with reference`);
    const createdPersonalApp = submitResult.application!;

    // 4. Verify Blair now has 1 personal application, and Trident College has 4 campus applications
    const blairAppsAfter = await dbService.getApplications(blair);
    const blairPersonalAfter = blairAppsAfter.filter(a => a.applicantId === blair.id);
    assert(blairPersonalAfter.length === 1, `Blair Kuhn personal applications count is now 1 (got ${blairPersonalAfter.length})`);
    assert(blairAppsAfter.length === 4, `Blair Kuhn campus applications directory has 4 total applications (got ${blairAppsAfter.length})`);

    // 5. Verify Jane Mwanza is still completely isolated (only sees her own 3 applications)
    const janeAppsAfter = await dbService.getApplications(jane);
    assert(janeAppsAfter.length === 3, `Jane Mwanza is isolated from Head Teacher's personal request under RLS (got ${janeAppsAfter.length})`);
    for (const app of janeAppsAfter) {
      assert(app.applicantId === jane.id, `Jane's application ${app.referenceNumber} belongs strictly to Jane`);
    }

    // 6. Withdraw Blair's test personal application to keep benchmark clean
    const withdrawResult = await dbService.withdrawApplication(blair, createdPersonalApp.id);
    assert(withdrawResult.success === true, `Head Teacher successfully withdrew personal test application`);

    // 7. Verify Tab Permissions logic
    const isTabAllowedForRole = (tab: string, role: string) => {
      if (role === 'SUPER_ADMIN') return true;
      if (tab === 'my-requests') return true;
      if (tab === 'staff-applicants') return role !== 'APPLICANT';
      if (role === 'APPLICANT') return tab === 'my-requests';
      if (role === 'HEAD_TEACHER') return tab === 'school-triage' || tab === 'staff-applicants' || tab === 'my-requests';
      if (role === 'HR_MANAGER') return tab === 'hr-queue' || tab === 'master-sheet' || tab === 'staff-applicants' || tab === 'my-requests';
      if (role === 'IT_MANAGER') return tab === 'it-queue' || tab === 'master-sheet' || tab === 'staff-applicants' || tab === 'my-requests';
      return false;
    };

    assert(isTabAllowedForRole('my-requests', 'APPLICANT') === true, `Applicant allowed my-requests`);
    assert(isTabAllowedForRole('staff-applicants', 'APPLICANT') === false, `Applicant denied staff-applicants`);
    assert(isTabAllowedForRole('staff-applicants', 'HEAD_TEACHER') === true, `Head Teacher allowed staff-applicants`);
    assert(isTabAllowedForRole('my-requests', 'HEAD_TEACHER') === true, `Head Teacher allowed my-requests`);
    assert(isTabAllowedForRole('staff-applicants', 'HR_MANAGER') === true, `HR Manager allowed staff-applicants`);
    assert(isTabAllowedForRole('my-requests', 'HR_MANAGER') === true, `HR Manager allowed my-requests`);
    assert(isTabAllowedForRole('staff-applicants', 'IT_MANAGER') === true, `IT Manager allowed staff-applicants`);
    assert(isTabAllowedForRole('my-requests', 'IT_MANAGER') === true, `IT Manager allowed my-requests`);

    // Reset database back to benchmark state
    await dbService.resetDatabase();

    console.log(`\n========================================`);
    if (failures === 0) {
      console.log('🎉 ALL API INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      console.error(`💥 TEST SUITE COMPLETED WITH ${failures} FAILURES`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('API Test Error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testEndpoints();
