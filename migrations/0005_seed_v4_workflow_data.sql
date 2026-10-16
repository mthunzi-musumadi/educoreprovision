ROLLBACK;

BEGIN;

-- 1. WIPE STALE v3.0 SEED DATA SO UNIQUE CONSTRAINTS DON'T COLLIDE
TRUNCATE TABLE public.approval_audit_logs, public.application_approvals, public.applications, public.users CASCADE;

-- 2. ENSURE CORE EDUCORE INSTITUTIONS EXIST
INSERT INTO public.sites (code, name, location, is_active) VALUES
  ('TRIDENT_COLLEGE', 'Trident College', 'Solwezi, Northwestern Province', true),
  ('SENTINEL_KABITAKA', 'Sentinel Kabitaka', 'Solwezi, Northwestern Province', true),
  ('FRONTIER_SCHOOL', 'Frontier School', 'Kalumbila, Northwestern Province', true),
  ('EDUCORE_CENTRAL', 'Educore Central Administration', 'Solwezi / Lusaka HQ', true)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, location = EXCLUDED.location, is_active = true;

-- 3. ENSURE EQUIPMENT TIERS EXIST (For ICT_PURCHASE)
INSERT INTO public.equipment_tiers (
  tier_code, title, subtitle, price_zmw, processor, ram, storage, display, graphics, warranty, target_audience
) VALUES
  (
    'LEVEL_1',
    'Level 1 — Standard Productivity Laptop',
    'Dell Latitude 3540 / HP ProBook 450 G10',
    18500.00,
    'Intel Core i5-1335U (10 Cores)',
    '16GB DDR4',
    '512GB NVMe SSD',
    '15.6" FHD (1920x1080) Anti-Glare',
    'Intel Iris Xe Graphics',
    '3-Year Next Business Day Onsite Warranty',
    'Classroom Teachers, Administrative & Support Staff'
  ),
  (
    'LEVEL_2',
    'Level 2 — High-Performance Executive / STEM Laptop',
    'Dell Latitude 5540 / HP EliteBook 840 G10',
    28800.00,
    'Intel Core i7-1365U vPro (10 Cores)',
    '32GB DDR5',
    '1TB Gen4 NVMe SSD',
    '15.6" FHD+ IPS 400 nits Low Power',
    'Intel Iris Xe / Optional Discrete GPU',
    '3-Year ProSupport Plus with Accidental Damage',
    'Heads of Department, ICT/STEM Faculty, Senior Management'
  )
ON CONFLICT (tier_code) DO UPDATE
SET price_zmw = EXCLUDED.price_zmw, title = EXCLUDED.title, is_active = true;

-- 4. ENSURE BASE POLICY VERSION EXISTS (No semicolons inside text)
INSERT INTO public.policy_versions (version_tag, legal_text, effective_date, is_active) VALUES
  (
    'v4.0-2026',
    'By digitally signing this Educore Services application, I confirm that: (1) I have read and understood the governing policy for this scheme, (2) Where financial advances, fees, or equipment purchases apply, I authorize Educore Services Zambia to deduct the stipulated monthly installments directly from my payroll reflected on my payslip, and (3) Should my employment terminate prior to full settlement, any outstanding balance shall be recovered from my final terminal benefits or gratuity.',
    CURRENT_DATE,
    true
  )
ON CONFLICT (version_tag) DO UPDATE
SET is_active = true;

-- 5. SEED 10 DETERMINISTIC USER PERSONAS COVERING ALL 8 ROLES
INSERT INTO public.users (
  entra_oid, site_id, employee_number, full_name, email, role, department, job_title, is_active
) VALUES
  (
    '11111111-1111-4111-8111-111111111101'::uuid,
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'EDC-1042',
    'Chanda Mwamba',
    'cmwamba@trident-college.com',
    'APPLICANT'::public.user_role,
    'Academics - Mathematics',
    'Senior Mathematics Teacher',
    true
  ),
  (
    '11111111-1111-4111-8111-111111111102'::uuid,
    (SELECT id FROM public.sites WHERE code = 'SENTINEL_KABITAKA'),
    'EDC-2088',
    'Mutale Bwalya',
    'mbwalya@sentinel-kabitaka.com',
    'APPLICANT'::public.user_role,
    'Science & Lab Operations',
    'Physics Teacher',
    true
  ),
  (
    '22222222-2222-4222-8222-222222222201'::uuid,
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'EDC-1015',
    'Kelvin Zulu',
    'kzulu@trident-college.com',
    'LINE_MANAGER'::public.user_role,
    'Academics',
    'Head of Faculty - STEM',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333301'::uuid,
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'EDC-1001',
    'Blair Kuhn',
    'bkuhn@trident-college.com',
    'HEAD_TEACHER'::public.user_role,
    'School Leadership',
    'Headmaster — Trident College',
    true
  ),
  (
    '33333333-3333-4333-8333-333333333302'::uuid,
    (SELECT id FROM public.sites WHERE code = 'SENTINEL_KABITAKA'),
    'EDC-2001',
    'Jane Mwanza',
    'jmwanza@sentinel-kabitaka.com',
    'HEAD_TEACHER'::public.user_role,
    'School Leadership',
    'Head Teacher — Sentinel Kabitaka',
    true
  ),
  (
    '44444444-4444-4444-8444-444444444401'::uuid,
    (SELECT id FROM public.sites WHERE code = 'EDUCORE_CENTRAL'),
    'EDC-0012',
    'Thandiwe Phiri',
    'tphiri@educoreservices.com',
    'HR_MANAGER'::public.user_role,
    'Human Resources',
    'Group HR Manager',
    true
  ),
  (
    '55555555-5555-4555-8555-555555555501'::uuid,
    (SELECT id FROM public.sites WHERE code = 'EDUCORE_CENTRAL'),
    'EDC-0025',
    'Mulenga Banda',
    'mbanda@educoreservices.com',
    'IT_MANAGER'::public.user_role,
    'Information Technology',
    'Head of ICT & Infrastructure',
    true
  ),
  (
    '66666666-6666-4666-8666-666666666601'::uuid,
    (SELECT id FROM public.sites WHERE code = 'EDUCORE_CENTRAL'),
    'EDC-0031',
    'Lombe Kasonde',
    'lkasonde@educoreservices.com',
    'FINANCE_MANAGER'::public.user_role,
    'Finance & Payroll',
    'Group Finance Manager',
    true
  ),
  (
    '77777777-7777-4777-8777-777777777701'::uuid,
    (SELECT id FROM public.sites WHERE code = 'EDUCORE_CENTRAL'),
    'EDC-0044',
    'Dambo Simwanza',
    'dsimwanza@educoreservices.com',
    'LOGISTICS_MANAGER'::public.user_role,
    'Fleet & Logistics',
    'Logistics & Procurement Coordinator',
    true
  ),
  (
    '99999999-9999-4999-8999-999999999901'::uuid,
    (SELECT id FROM public.sites WHERE code = 'EDUCORE_CENTRAL'),
    'EDC-0001',
    'Mthunzi Musumadi',
    'admin@educoreservices.com',
    'SUPER_ADMIN'::public.user_role,
    'Platform Engineering',
    'Systems Architect',
    true
  );

-- 6. RESET REFERENCE SEQUENCE COUNTERS & SEED 4 MULTI-DEPT SAMPLE APPLICATIONS (PURE SQL, NO DO $$)
UPDATE public.form_definitions SET seq_counter = 0;

-- Sample 1: ICT Laptop Purchase (Awaiting Head Teacher Step 1)
INSERT INTO public.applications (
    form_definition_id, applicant_id, site_id, status,
    current_step_order, current_approver_role,
    policy_version_id, legal_text_snapshot, terms_accepted, terms_accepted_at,
    applicant_signed_at, applicant_digital_signature, payload
) VALUES (
    (SELECT id FROM public.form_definitions WHERE code = 'ICT_PURCHASE'),
    (SELECT id FROM public.users WHERE entra_oid = '11111111-1111-4111-8111-111111111101'::uuid),
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'IN_REVIEW'::public.lifecycle_status,
    1,
    'HEAD_TEACHER'::public.user_role,
    (SELECT id FROM public.policy_versions WHERE version_tag = 'v4.0-2026'),
    (SELECT legal_text FROM public.policy_versions WHERE version_tag = 'v4.0-2026'),
    true,
    NOW(),
    NOW(),
    'Chanda Mwamba',
    jsonb_build_object(
        'equipment_tier_id', (SELECT id FROM public.equipment_tiers WHERE tier_code = 'LEVEL_1'),
        'repayment_period', 'TWELVE_MONTHS',
        'estimated_monthly_amount_zmw', 1541.67
    )
);

-- Sample 2: Travel Request Form (Awaiting Head Teacher Step 1)
INSERT INTO public.applications (
    form_definition_id, applicant_id, site_id, status,
    current_step_order, current_approver_role,
    terms_accepted, applicant_signed_at, applicant_digital_signature, payload
) VALUES (
    (SELECT id FROM public.form_definitions WHERE code = 'TRAVEL_REQUEST'),
    (SELECT id FROM public.users WHERE entra_oid = '11111111-1111-4111-8111-111111111101'::uuid),
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'IN_REVIEW'::public.lifecycle_status,
    1,
    'HEAD_TEACHER'::public.user_role,
    true,
    NOW(),
    'Chanda Mwamba',
    '{
        "destination": "Lusaka — ISAZ National Debate Championship",
        "departure_date": "2026-11-04",
        "return_date": "2026-11-08",
        "transport_mode": "VEHICLE",
        "estimated_cost_zmw": 6400,
        "purpose": "Accompanying 6 Trident College debate students to national finals."
    }'::jsonb
);

-- Sample 3: Change of Bank Details (Awaiting HR Manager Step 1 directly)
INSERT INTO public.applications (
    form_definition_id, applicant_id, site_id, status,
    current_step_order, current_approver_role,
    terms_accepted, applicant_signed_at, applicant_digital_signature, payload
) VALUES (
    (SELECT id FROM public.form_definitions WHERE code = 'BANK_CHANGE'),
    (SELECT id FROM public.users WHERE entra_oid = '11111111-1111-4111-8111-111111111101'::uuid),
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'IN_REVIEW'::public.lifecycle_status,
    1,
    'HR_MANAGER'::public.user_role,
    true,
    NOW(),
    'Chanda Mwamba',
    '{
        "bank_name": "Stanbic Bank Zambia",
        "branch_name": "Solwezi Branch",
        "account_number": "9130004829102",
        "account_type": "CURRENT"
    }'::jsonb
);

-- Sample 4: Exculpatory Form (Awaiting Line Manager Step 1)
INSERT INTO public.applications (
    form_definition_id, applicant_id, site_id, status,
    current_step_order, current_approver_role,
    terms_accepted, applicant_signed_at, applicant_digital_signature, payload
) VALUES (
    (SELECT id FROM public.form_definitions WHERE code = 'EXCULPATORY'),
    (SELECT id FROM public.users WHERE entra_oid = '11111111-1111-4111-8111-111111111101'::uuid),
    (SELECT id FROM public.sites WHERE code = 'TRIDENT_COLLEGE'),
    'IN_REVIEW'::public.lifecycle_status,
    1,
    'LINE_MANAGER'::public.user_role,
    true,
    NOW(),
    'Chanda Mwamba',
    '{
        "incident_date": "2026-10-10",
        "charge_reference": "DISC-TRD-2026-09",
        "employee_statement": "Late submission of Term 3 mock exam marks was caused by a power outage at the faculty block and marks were uploaded at 07:15 the following morning."
    }'::jsonb
);

COMMIT;