-- ============================================================================
-- MIGRATION: 0006_complete_18_forms_catalog.sql
-- PURPOSE: Register Finance Excel forms & additional HR forms (18 total forms)
-- ============================================================================

BEGIN;

-- Update Travel Request Step 1 to Line Manager as per Travel Request Form.docx
UPDATE public.form_definitions
SET workflow_pipeline = '[
  {"step_order": 1, "role": "LINE_MANAGER", "label": "Line Manager Approval", "site_scoped": true},
  {"step_order": 2, "role": "LOGISTICS_MANAGER", "label": "Logistics Travel Desk Booking", "site_scoped": false}
]'::jsonb
WHERE code = 'TRAVEL_REQUEST';

-- Insert the 4 additional Finance & HR forms
INSERT INTO public.form_definitions (code, ref_prefix, department, title, requires_policy, workflow_pipeline) VALUES
(
  'EXPENSE_RETIREMENT',
  'EDC-IMP',
  'FINANCE',
  'Cash Requisition & Expense Retirement Form',
  true,
  '[{"step_order":1,"role":"HEAD_TEACHER","label":"Line / School Head Approval","site_scoped":true},{"step_order":2,"role":"FINANCE_MANAGER","label":"Finance Imprest & Retirement Sign-off","site_scoped":false}]'::jsonb
),
(
  'PURCHASE_REQ',
  'EDC-PRQ',
  'FINANCE',
  'Purchase Requisition & Order Form (PR / PO)',
  false,
  '[{"step_order":1,"role":"HEAD_TEACHER","label":"Budget Holder / Head Approval","site_scoped":true},{"step_order":2,"role":"LOGISTICS_MANAGER","label":"Procurement PO Processing","site_scoped":false},{"step_order":3,"role":"FINANCE_MANAGER","label":"Finance Budget & PO Sign-off","site_scoped":false}]'::jsonb
),
(
  'DISCIPLINARY_CHARGE',
  'EDC-DCF',
  'HR',
  'Disciplinary Charge Form',
  false,
  '[{"step_order":1,"role":"LINE_MANAGER","label":"Charging Officer / Dept Head Filing","site_scoped":true},{"step_order":2,"role":"HR_MANAGER","label":"HR Disciplinary Case Registration","site_scoped":false}]'::jsonb
),
(
  'EDU_HEALTH_CLAIM',
  'EDC-EHC',
  'HR',
  'Edu-Health Claims Reimbursement Form',
  true,
  '[{"step_order":1,"role":"HR_MANAGER","label":"Edu-Health Committee Verification","site_scoped":false},{"step_order":2,"role":"FINANCE_MANAGER","label":"Finance Reimbursement / Membership Credit","site_scoped":false}]'::jsonb
)
ON CONFLICT (code) DO UPDATE
SET title = EXCLUDED.title,
    workflow_pipeline = EXCLUDED.workflow_pipeline,
    requires_policy = EXCLUDED.requires_policy;

COMMIT;