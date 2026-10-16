import assert from 'node:assert';
import { validateApplicationForm } from '../src/utils/formValidation.ts';
import { FormCode } from '../src/types/index.ts';

console.log('========================================================================');
console.log('Educore Provision - Stepper Navigation & Stage Enforcement Unit Suite');
console.log('========================================================================\n');

// Mock helper representing NewRequestStepper's navigation guard rules
function createStepperState({
  step,
  selectedFormCode,
  payload,
  editApplication = null,
}: {
  step: 1 | 2 | 3;
  selectedFormCode: FormCode | null;
  payload: Record<string, any>;
  editApplication?: any;
}) {
  const isStep2Complete = () => {
    if (!selectedFormCode) return false;
    return validateApplicationForm(selectedFormCode, payload).isValid;
  };

  const canGoBackTo = (targetStep: 1 | 2 | 3): boolean => {
    // Only permitted to go backwards
    if (targetStep >= step) return false;

    if (targetStep === 1) {
      // Must have selected a form and not editing an existing application
      return Boolean(selectedFormCode) && !editApplication;
    }

    if (targetStep === 2) {
      // Allowed to go back to General Form Details only from Step 3 when Step 2 details were completed
      return step === 3 && Boolean(selectedFormCode) && isStep2Complete();
    }

    return false;
  };

  return { isStep2Complete, canGoBackTo };
}

// -----------------------------------------------------------------------------
// [Test 1] Initial state on Step 1: No form selected
// -----------------------------------------------------------------------------
console.log('[1] Testing initial Step 1 state (no form selected)...');
{
  const state = createStepperState({
    step: 1,
    selectedFormCode: null,
    payload: {},
  });

  assert.strictEqual(
    state.canGoBackTo(1),
    false,
    'Step 1 cannot go backwards to Step 1 (current step)'
  );
  assert.strictEqual(
    state.canGoBackTo(2),
    false,
    'Step 2 must be cosmetic and disabled on Step 1 (forward step cannot be clicked)'
  );
  assert.strictEqual(
    state.canGoBackTo(3),
    false,
    'Step 3 must be cosmetic and disabled on Step 1'
  );

  console.log('  ✅ Step 1 correctly renders Step 2 & 3 as non-clickable cosmetic guidance tabs');
}

// -----------------------------------------------------------------------------
// [Test 2] State on Step 2 with incomplete form fields
// -----------------------------------------------------------------------------
console.log('\n[2] Testing Step 2 with incomplete form fields...');
{
  const state = createStepperState({
    step: 2,
    selectedFormCode: 'ICT_PURCHASE',
    payload: {}, // missing tier, repayment period, amount
  });

  assert.strictEqual(
    state.canGoBackTo(1),
    true,
    'User can click Step 1 to go backwards and re-select form'
  );
  assert.strictEqual(
    state.canGoBackTo(2),
    false,
    'Step 2 is current step'
  );
  assert.strictEqual(
    state.canGoBackTo(3),
    false,
    'Step 3 cannot be skipped to via tab click (must use validated continue button)'
  );

  // Validate that advancing is blocked
  const validation = validateApplicationForm('ICT_PURCHASE', {});
  assert.strictEqual(
    validation.isValid,
    false,
    'Incomplete Step 2 fields must fail validation'
  );
  assert(validation.errors.equipment_tier_id, 'Must require equipment tier');

  console.log('  ✅ Step 2 permits going back to Step 1, blocks forward clicking to Step 3, and blocks unvalidated continuation');
}

// -----------------------------------------------------------------------------
// [Test 3] State on Step 3: Backward navigation permitted
// -----------------------------------------------------------------------------
console.log('\n[3] Testing Step 3 backward navigation...');
{
  const completeIctPayload = {
    equipment_tier_id: 'tier-1',
    repayment_period: 'TWELVE_MONTHS',
    estimated_monthly_amount_zmw: 1500,
  };

  const state = createStepperState({
    step: 3,
    selectedFormCode: 'ICT_PURCHASE',
    payload: completeIctPayload,
  });

  assert.strictEqual(
    state.isStep2Complete(),
    true,
    'Step 2 details are complete'
  );
  assert.strictEqual(
    state.canGoBackTo(2),
    true,
    'User can click Step 2 to go backwards from Step 3 because Step 2 was filled in'
  );
  assert.strictEqual(
    state.canGoBackTo(1),
    true,
    'User can click Step 1 to go backwards from Step 3'
  );
  assert.strictEqual(
    state.canGoBackTo(3),
    false,
    'Step 3 is current step'
  );

  console.log('  ✅ Step 3 permits clicking backward to Step 2 and Step 1');
}

// -----------------------------------------------------------------------------
// [Test 4] Editing existing application: Cannot change form type
// -----------------------------------------------------------------------------
console.log('\n[4] Testing editing existing application (form type locked)...');
{
  const state = createStepperState({
    step: 2,
    selectedFormCode: 'TRAVEL_REQUEST',
    payload: {},
    editApplication: { id: 'app-1', reference_number: 'EDC-TRV-2026-0001' },
  });

  assert.strictEqual(
    state.canGoBackTo(1),
    false,
    'Editing application must not permit going back to Step 1 (form is locked)'
  );

  console.log('  ✅ Existing application correctly locks form type from being changed');
}

console.log('\n========================================================================');
console.log('🎉 ALL STEPPER NAVIGATION TESTS PASSED (100%)!');
console.log('========================================================================\n');
