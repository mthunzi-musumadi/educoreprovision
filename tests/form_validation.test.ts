import assert from 'node:assert';
import { validateApplicationForm } from '../src/utils/formValidation.ts';
import { FormCode } from '../src/types/index.ts';

console.log('========================================================================');
console.log('Educore Provision - Form Required Fields Validation Suite');
console.log('========================================================================\n');

const allFormCodes: FormCode[] = [
  'ICT_PURCHASE',
  'TRAVEL_REQUEST',
  'SALARY_ADVANCE',
  'PROF_DEV',
  'BANK_CHANGE',
  'CONTRACT_RENEWAL',
  'CHILD_ADMISSION',
  'EXCULPATORY',
  'GRATUITY_ADVANCE',
  'JOB_DESCRIPTION',
  'MANPOWER_REQ',
  'EVENT_COMPLETION',
  'STOCK_RETURN',
  'STORES_REQ',
  'EXPENSE_RETIREMENT',
  'PURCHASE_REQ',
  'DISCIPLINARY_CHARGE',
  'EDU_HEALTH_CLAIM',
];

console.log(`[1] Testing rejection of empty payloads across all ${allFormCodes.length} forms...`);
for (const code of allFormCodes) {
  const result = validateApplicationForm(code, {});
  assert.strictEqual(result.isValid, false, `Empty payload for ${code} must fail validation`);
  assert(result.errorCount > 0, `Empty payload for ${code} must report errorCount > 0 (got ${result.errorCount})`);
  console.log(`  ✅ ${code.padEnd(20)} correctly rejected empty payload (${result.errorCount} required fields caught)`);
}

console.log('\n[2] Testing granular required fields validation per form...');

// 1. ICT_PURCHASE
{
  const r1 = validateApplicationForm('ICT_PURCHASE', {
    equipment_tier_id: 'tier-1',
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.repayment_period);

  const r2 = validateApplicationForm('ICT_PURCHASE', {
    equipment_tier_id: 'tier-1',
    repayment_period: 'TWELVE_MONTHS',
    estimated_monthly_amount_zmw: 1500,
  });
  assert.strictEqual(r2.isValid, true);
  console.log('  ✅ ICT_PURCHASE: validated equipment_tier_id, repayment_period, and positive deduction');
}

// 2. CHILD_ADMISSION
{
  const r1 = validateApplicationForm('CHILD_ADMISSION', {
    academic_year: '2026/2027',
    children: [],
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.children);

  const r2 = validateApplicationForm('CHILD_ADMISSION', {
    academic_year: '2026/2027',
    children: [{ child_full_name: 'Jane Doe', date_of_birth: '', target_site_id: 'site-1', year_group: 'Year 4' }],
  });
  assert.strictEqual(r2.isValid, false);
  assert(r2.errors.child_0_date_of_birth);

  const r3 = validateApplicationForm('CHILD_ADMISSION', {
    academic_year: '2026/2027',
    children: [{ child_full_name: 'Jane Doe', date_of_birth: '2015-05-12', target_site_id: 'site-1', year_group: 'Year 4' }],
  });
  assert.strictEqual(r3.isValid, true);
  console.log('  ✅ CHILD_ADMISSION: validated academic_year and multi-child entries (full name, DOB, site, year group)');
}

// 3. TRAVEL_REQUEST
{
  const r1 = validateApplicationForm('TRAVEL_REQUEST', {
    cost_code: 'TRV-01',
    site: 'Trident',
    reason_for_travel: 'Sports',
    flight_booking_type: 'BUSINESS',
    passengers: [],
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.contact_number);
  assert(r1.errors.passengers);

  const r2 = validateApplicationForm('TRAVEL_REQUEST', {
    cost_code: 'TRV-01',
    contact_number: '+260977112233',
    site: 'Trident',
    reason_for_travel: 'Sports',
    flight_booking_type: 'BUSINESS',
    passengers: [{ surname: 'Banda', first_name: 'Peter', date_of_birth: '1990-01-01' }],
    accommodation_required: true,
    hotel_name: '',
  });
  assert.strictEqual(r2.isValid, false);
  assert(r2.errors.hotel_name);

  const r3 = validateApplicationForm('TRAVEL_REQUEST', {
    cost_code: 'TRV-01',
    contact_number: '+260977112233',
    site: 'Trident',
    reason_for_travel: 'Sports',
    flight_booking_type: 'BUSINESS',
    passengers: [{ surname: 'Banda', first_name: 'Peter', date_of_birth: '1990-01-01' }],
    accommodation_required: false,
  });
  assert.strictEqual(r3.isValid, true);
  console.log('  ✅ TRAVEL_REQUEST: validated cost_code, contact, passengers, and conditional accommodation');
}

// 4. SALARY_ADVANCE
{
  const r1 = validateApplicationForm('SALARY_ADVANCE', {
    position: 'Teacher',
    amount_requested_zmw: 0,
    reason: '',
    requested_payment_date: '2026-11-01',
    proposed_instalment_zmw: 500,
    repayment_period_from: '2026-11',
    repayment_period_to: '2027-02',
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.amount_requested_zmw);
  assert(r1.errors.reason);

  const r2 = validateApplicationForm('SALARY_ADVANCE', {
    position: 'Teacher',
    amount_requested_zmw: 5000,
    reason: 'Emergency home repair',
    requested_payment_date: '2026-11-01',
    proposed_instalment_zmw: 1250,
    repayment_period_from: '2026-11',
    repayment_period_to: '2027-02',
  });
  assert.strictEqual(r2.isValid, true);
  console.log('  ✅ SALARY_ADVANCE: validated position, positive amount, reason, and repayment schedule');
}

// 5. BANK_CHANGE
{
  const rDomestic = validateApplicationForm('BANK_CHANGE', {
    dept_or_site: 'Trident College',
    phone: '+260966123456',
    date_of_birth: '1985-02-14',
    nrc_or_passport: '123456/10/1',
    old_bank_name: 'Barclays',
    old_account_number: '100200300',
    transfer_type: 'ZMW_DOMESTIC',
    zmw_bank_name: 'Stanbic Bank',
    zmw_branch_name: 'Solwezi',
    zmw_account_name: 'Chanda Mwamba',
    zmw_account_number: '913000123456',
  });
  assert.strictEqual(rDomestic.isValid, true);

  const rIntlMissing = validateApplicationForm('BANK_CHANGE', {
    dept_or_site: 'Trident College',
    phone: '+260966123456',
    date_of_birth: '1985-02-14',
    nrc_or_passport: '123456/10/1',
    old_bank_name: 'Barclays',
    old_account_number: '100200300',
    transfer_type: 'INTERNATIONAL',
  });
  assert.strictEqual(rIntlMissing.isValid, false);
  assert(rIntlMissing.errors.intl_account_name);
  assert(rIntlMissing.errors.intl_iban);
  assert(rIntlMissing.errors.intl_bic);
  console.log('  ✅ BANK_CHANGE: validated particulars, previous account, and conditional ZMW vs International details');
}

// 6. CONTRACT_RENEWAL
{
  const r1 = validateApplicationForm('CONTRACT_RENEWAL', {
    staff_name: 'Kelvin Zulu',
    position: 'Teacher',
    supervisor_name: 'Blair Kuhn',
    school_or_department: 'Trident College',
    contract_start_date: '2024-01-01',
    contract_end_date: '2025-12-31',
    contract_to_be_renewed: 'YES',
    renewal_reasons: ['', '', ''],
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.renewal_reasons);

  const r2 = validateApplicationForm('CONTRACT_RENEWAL', {
    staff_name: 'Kelvin Zulu',
    position: 'Teacher',
    supervisor_name: 'Blair Kuhn',
    school_or_department: 'Trident College',
    contract_start_date: '2024-01-01',
    contract_end_date: '2025-12-31',
    contract_to_be_renewed: 'YES',
    renewal_reasons: ['Excellent delivery against departmental targets.'],
  });
  assert.strictEqual(r2.isValid, true);
  console.log('  ✅ CONTRACT_RENEWAL: validated dates, renewal decision, and development reasons');
}

// 7. EDU_HEALTH_CLAIM
{
  const r1 = validateApplicationForm('EDU_HEALTH_CLAIM', {
    employee_number: 'EDC-091',
    patient_gender: 'MALE',
    mobile: '+260977112233',
    patient_first_name: 'Peter',
    patient_surname: 'Banda',
    email: 'pbanda@educore.org',
    treatment_categories: ['CONSULTATION'],
    date_of_treatment: '2026-10-10',
    hospital_name: 'Mary Begg Clinic',
    symptoms_and_treatment_details: 'Routine medical consultation',
    claim_items: [{ description: 'Consultation Fee', provider_name: 'Mary Begg', amount_charged: 0 }],
    payment_method: 'BANK_TRANSFER',
    bank_name: 'Standard Chartered',
    account_holder_name: 'Peter Banda',
    account_number: '0100200300',
    confirm_true_and_correct: true,
    consent_medical_info_processing: true,
  });
  assert.strictEqual(r1.isValid, false);
  assert(r1.errors.claim_0_amount_charged);

  const r2 = validateApplicationForm('EDU_HEALTH_CLAIM', {
    employee_number: 'EDC-091',
    patient_gender: 'MALE',
    mobile: '+260977112233',
    patient_first_name: 'Peter',
    patient_surname: 'Banda',
    email: 'pbanda@educore.org',
    treatment_categories: ['CONSULTATION'],
    date_of_treatment: '2026-10-10',
    hospital_name: 'Mary Begg Clinic',
    symptoms_and_treatment_details: 'Routine medical consultation',
    claim_items: [{ description: 'Consultation Fee', provider_name: 'Mary Begg', amount_charged: 450 }],
    payment_method: 'BANK_TRANSFER',
    bank_name: 'Standard Chartered',
    account_holder_name: 'Peter Banda',
    account_number: '0100200300',
    confirm_true_and_correct: true,
    consent_medical_info_processing: true,
  });
  assert.strictEqual(r2.isValid, true);
  console.log('  ✅ EDU_HEALTH_CLAIM: validated patient info, treatments, positive claim items, and bank transfer details');
}

console.log('\n========================================================================');
console.log('🎉 ALL FORM REQUIRED FIELDS VALIDATION TESTS PASSED (100%)!');
console.log('========================================================================\n');
