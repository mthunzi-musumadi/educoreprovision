import {
  pool,
  withRlsContext,
  getFormDefinitions,
  getApplicationsQueue,
  createApplication,
  updateApplication,
  processApprovalStep,
  withdrawApplication,
  addApplicationAttachment,
  getApplicationAttachments,
  deleteApplicationAttachment,
} from '../server/db.ts';

async function runTestSuite() {
  console.log('========================================================================');
  console.log('Educore Provision v4.2 Modernized API & Workflow Integration Suite');
  console.log('========================================================================\n');

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
    // ------------------------------------------------------------------------
    // 1. Verify Master Catalogs (All 9 Sites & 18 Forms)
    // ------------------------------------------------------------------------
    console.log('[1] Verifying Core Reference Data...');
    const sitesRes = await pool.query('SELECT * FROM public.sites WHERE is_active = true ORDER BY name');
    assert(sitesRes.rows.length === 9, `All 9 official Educore sites present in database (got ${sitesRes.rows.length})`);

    const forms = await getFormDefinitions();
    assert(forms.length === 18, `All 18 standard forms registered in catalog (got ${forms.length})`);

    const usersRes = await pool.query(
      `SELECT u.*, s.code AS site_code, s.name AS site_name 
       FROM public.users u 
       JOIN public.sites s ON u.site_id = s.id 
       WHERE u.is_active = true`
    );
    const users = usersRes.rows;
    assert(users.length >= 7, `Benchmark user directory populated (got ${users.length} users)`);

    const chanda = users.find((u) => u.email === 'cmwamba@trident-college.com')!;
    const lineManager = users.find((u) => u.email === 'kzulu@trident-college.com')!;
    const blair = users.find((u) => u.email === 'bkuhn@trident-college.com')!;
    const hr = users.find((u) => u.role === 'HR_MANAGER')!;
    const finance = users.find((u) => u.role === 'FINANCE_MANAGER')!;
    const logistics = users.find((u) => u.role === 'LOGISTICS_MANAGER')!;
    const superAdmin = users.find((u) => u.role === 'SUPER_ADMIN')!;

    assert(Boolean(chanda), 'Chanda Mwamba (Applicant @ Trident College) found');
    assert(Boolean(lineManager), 'Kelvin Zulu (Line Manager @ Trident College) found');
    assert(Boolean(blair), 'Blair Kuhn (Head Teacher @ Trident College) found');
    assert(Boolean(hr), 'Central HR Manager found');
    assert(Boolean(finance), 'Central Finance Manager found');
    assert(Boolean(logistics), 'Central Logistics Manager found');

    // ------------------------------------------------------------------------
    // 2. Draft Creation, Partial Payload & Editing Cycle
    // ------------------------------------------------------------------------
    console.log('\n[2] Testing Draft Creation and Editing (PUT /api/applications/:id)...');

    const draftApp = await createApplication({
      entraOid: chanda.entra_oid,
      formCode: 'TRAVEL_REQUEST',
      submitImmediately: false,
      termsAccepted: false,
      digitalSignature: 'Chanda Mwamba',
      payload: {
        cost_code: 'TRV-2026-TCL',
        contact_number: '+260977112233',
        site: 'Trident College',
        reason_for_travel: 'Official Sports & Academics Fixture',
        flight_booking_type: 'BUSINESS',
        department_school: 'Trident College Humanities',
        traveler_name: 'Chanda Mwamba',
        traveler_cell: '+260977112233',
        traveler_email: chanda.email,
        nature_of_travel: 'SPORTS',
        booking_type: 'BUSINESS',
        passengers: [
          {
            surname: 'Mwamba',
            first_name: 'Chanda',
            date_of_birth: '1988-04-12',
            id_passport: 'ZP-110293',
            special_needs: 'None',
          },
        ],
        flights: [
          {
            date: '2026-11-10',
            departure_airport: 'Solwezi (SLI)',
            arrival_airport: 'Lusaka (LUN)',
            carrier_pref: 'Proflight',
          },
        ],
      },
    });

    assert(draftApp.status === 'DRAFT', `Application created in DRAFT status`);
    assert(draftApp.current_step_order === null, `Draft has current_step_order = null`);
    assert(draftApp.current_approver_role === null, `Draft has current_approver_role = null`);
    assert(draftApp.reference_number.startsWith('EDC-TRV-'), `Reference number generated with EDC-TRV prefix (${draftApp.reference_number})`);

    // Applicant updates draft with an extra passenger and hotel booking
    const updatedDraft = await updateApplication({
      entraOid: chanda.entra_oid,
      applicationId: draftApp.id,
      submitImmediately: false,
      payload: {
        ...draftApp.payload,
        hotel_booking: {
          hotel_name: 'Taj Pamodzi Lusaka',
          check_in_date: '2026-11-10',
          check_out_date: '2026-11-12',
          meal_basis: 'BED_AND_BREAKFAST',
        },
      },
    });

    assert(updatedDraft.status === 'DRAFT', 'Updated draft maintains DRAFT status when submitImmediately = false');
    assert(Boolean(updatedDraft.payload.hotel_booking), 'Draft payload updated with hotel booking');

    // ------------------------------------------------------------------------
    // 3. Supporting Document Attachments & Secure Retrieval
    // ------------------------------------------------------------------------
    console.log('\n[3] Testing Supporting Document Attachments & RLS...');

    const attachment = await addApplicationAttachment(chanda.entra_oid, draftApp.id, {
      fileName: 'Travel_Conference_Brochure.pdf',
      fileSizeBytes: 204800,
      mimeType: 'application/pdf',
      storagePath: 'uploads/test_brochure.pdf',
    });

    assert(Boolean(attachment.id), `Attachment created with UUID (${attachment.id})`);
    assert(attachment.file_name === 'Travel_Conference_Brochure.pdf', 'Attachment file name preserved');
    assert(attachment.uploader_name === 'Chanda Mwamba', `Uploader name linked (${attachment.uploader_name})`);

    const attachmentsList = await getApplicationAttachments(chanda.entra_oid, draftApp.id);
    assert(attachmentsList.length === 1, `Applicant retrieves attached documents (expected 1, got ${attachmentsList.length})`);

    // Confidentiality check: non-applicants CANNOT view attachments on private drafts (RLS isolation)
    const blairDraftAttachments = await getApplicationAttachments(blair.entra_oid, draftApp.id);
    assert(blairDraftAttachments.length === 0, `Non-applicant cannot view private draft attachments (got 0)`);

    // ------------------------------------------------------------------------
    // 4. Submission & Step 1 Sign-off
    // ------------------------------------------------------------------------
    console.log('\n[4] Submitting Draft into Live Multi-Stage Approval Pipeline...');

    const submittedApp = await updateApplication({
      entraOid: chanda.entra_oid,
      applicationId: draftApp.id,
      submitImmediately: true,
      digitalSignature: 'Chanda Mwamba',
      payload: updatedDraft.payload,
    });

    assert(submittedApp.status === 'IN_REVIEW', `Submitted application transitioned to IN_REVIEW`);
    assert(submittedApp.current_step_order === 1, `current_step_order initialized to Step 1`);
    assert(submittedApp.current_approver_role === 'LINE_MANAGER', `current_approver_role assigned to LINE_MANAGER`);

    // Line Manager at same site can now view attachments once in-review
    const lmAttachments = await getApplicationAttachments(lineManager.entra_oid, submittedApp.id);
    assert(lmAttachments.length === 1, `Assigned Line Manager can view attachments for submitted application`);

    // ------------------------------------------------------------------------
    // 5. Revision Requested by Approver & Applicant Resubmission Loop
    // ------------------------------------------------------------------------
    console.log('\n[5] Testing Reviewer "Request Revision" and Applicant Resubmission...');

    // Step 1 Line Manager requests revision
    const revisionApp = await processApprovalStep({
      entraOid: lineManager.entra_oid,
      applicationId: submittedApp.id,
      decision: 'REVISION_REQUESTED',
      comments: 'Please attach secondary quote or clarify departure time preference.',
    });

    assert(revisionApp.status === 'REVISION_REQUIRED', `Application transitioned to REVISION_REQUIRED`);

    // Applicant addresses the comments, adds a second quote attachment, and resubmits
    await addApplicationAttachment(chanda.entra_oid, submittedApp.id, {
      fileName: 'Flight_Alternative_Quote.pdf',
      fileSizeBytes: 104800,
      mimeType: 'application/pdf',
      storagePath: 'uploads/test_flight_quote.pdf',
    });

    const resubmittedApp = await updateApplication({
      entraOid: chanda.entra_oid,
      applicationId: submittedApp.id,
      submitImmediately: true,
      payload: {
        ...updatedDraft.payload,
        preferred_departure_time: '14:00',
      },
    });

    assert(resubmittedApp.status === 'IN_REVIEW', `Resubmitted application returned to IN_REVIEW`);
    assert(resubmittedApp.current_step_order === 1, `Pipeline reset to Step 1 for re-endorsement`);
    assert(resubmittedApp.current_approver_role === 'LINE_MANAGER', `Approver role returned to LINE_MANAGER`);

    // ------------------------------------------------------------------------
    // 6. Complete End-to-End Approval Pipeline
    // ------------------------------------------------------------------------
    console.log('\n[6] Advancing Full Approval Pipeline (Step 1 -> Step 2 -> APPROVED)...');

    // Step 1: Line Manager Approves
    const step1Approved = await processApprovalStep({
      entraOid: lineManager.entra_oid,
      applicationId: submittedApp.id,
      decision: 'APPROVED',
      comments: 'Endorsed. Flights approved for department sports fixture.',
    });

    assert(step1Approved.status === 'IN_REVIEW', `Status remains IN_REVIEW after Step 1`);
    assert(step1Approved.current_step_order === 2, `Advanced to Step 2`);
    assert(step1Approved.current_approver_role === 'LOGISTICS_MANAGER', `Assigned to Central LOGISTICS_MANAGER`);

    // Step 2: Central Logistics Manager Approves & Books
    const finalizedApp = await processApprovalStep({
      entraOid: logistics.entra_oid,
      applicationId: submittedApp.id,
      decision: 'APPROVED',
      comments: 'Tickets issued via Proflight Zambia (PNR #EDC749).',
    });

    assert(finalizedApp.status === 'APPROVED', `Final stage approved: status is now APPROVED`);
    assert(finalizedApp.current_step_order === null, `Final approval clears current_step_order`);
    assert(finalizedApp.current_approver_role === null, `Final approval clears current_approver_role`);

    // ------------------------------------------------------------------------
    // 7. Test In-Flight Applicant Withdrawal & Stored Procedure
    // ------------------------------------------------------------------------
    console.log('\n[7] Testing In-Flight Application Withdrawal...');

    const blairPersonalApp = await createApplication({
      entraOid: blair.entra_oid,
      formCode: 'PROF_DEV',
      submitImmediately: true,
      termsAccepted: true,
      digitalSignature: 'Blair Kuhn',
      payload: {
        position: 'Head Teacher',
        description: 'Executive School Leadership Symposium 2026',
        training_provider_location: 'Cambridge University Press & Assessment, UK',
        total_costs_zmw: 24500,
        start_date: '2026-11-15',
        end_date: '2026-11-18',
        relevance_to_role: 'Continuous professional leadership development.',
      },
    });

    assert(blairPersonalApp.status === 'IN_REVIEW', 'Blair personal request created and IN_REVIEW');

    const withdrawnApp = await withdrawApplication(
      blair.entra_oid,
      blairPersonalApp.id,
      'Scheduling conflict with Board of Governors meeting.'
    );

    assert(withdrawnApp.status === 'CLOSED', `Application withdrawn and marked CLOSED`);

    // Also test withdrawing an unsubmitted DRAFT application (verifying chk_envelope_submission allows CLOSED with null signature)
    const testDraftWithdraw = await createApplication({
      entraOid: chanda.entra_oid,
      formCode: 'TRAVEL_REQUEST',
      submitImmediately: false,
      payload: updatedDraft.payload,
    });
    assert(testDraftWithdraw.status === 'DRAFT', 'Draft created without submission');
    const withdrawnDraft = await withdrawApplication(
      chanda.entra_oid,
      testDraftWithdraw.id,
      'Draft no longer required.'
    );
    assert(withdrawnDraft.status === 'CLOSED', 'Draft successfully withdrawn and marked CLOSED');

    // ------------------------------------------------------------------------
    // 8. Least-Privilege & Anti-Forgery Governance Enforcement
    // ------------------------------------------------------------------------
    console.log('\n[8] Testing Anti-Forgery & Least-Privilege Governance Guards...');

    // A: Applicant cannot approve their own request
    const testApp = await createApplication({
      entraOid: chanda.entra_oid,
      formCode: 'TRAVEL_REQUEST',
      submitImmediately: true,
      payload: updatedDraft.payload,
    });

    try {
      await processApprovalStep({
        entraOid: chanda.entra_oid,
        applicationId: testApp.id,
        decision: 'APPROVED',
      });
      assert(false, 'Applicant self-approval should be rejected');
    } catch (err: any) {
      const blocked =
        err.message.includes('Conflict of interest') ||
        err.message.includes('access denied under least-privilege policy');
      assert(blocked, `Self-approval blocked with: "${err.message}"`);
    }

    // B: Oversight role (Super Admin) cannot forge operational sign-offs
    try {
      await processApprovalStep({
        entraOid: superAdmin.entra_oid,
        applicationId: testApp.id,
        decision: 'APPROVED',
      });
      assert(false, 'Super Admin sign-off forgery should be rejected');
    } catch (err: any) {
      const blocked =
        err.message.includes('Oversight roles cannot act on approval steps') ||
        err.message.includes('access denied under least-privilege policy');
      assert(
        blocked,
        `Oversight role forgery blocked with: "${err.message}"`
      );
    }

    // Clean up test application
    await withdrawApplication(chanda.entra_oid, testApp.id, 'Test cleanup');

    // Clean up test attachments
    await deleteApplicationAttachment(chanda.entra_oid, attachment.id);

    console.log(`\n========================================================================`);
    if (failures === 0) {
      console.log('🎉 ALL INTEGRATION SUITE TESTS PASSED 100%!');
      console.log('========================================================================\n');
    } else {
      console.error(`💥 SUITE FINISHED WITH ${failures} FAILURE(S)`);
      process.exitCode = 1;
    }
  } catch (err: any) {
    console.error('Unhandled suite error:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runTestSuite();
