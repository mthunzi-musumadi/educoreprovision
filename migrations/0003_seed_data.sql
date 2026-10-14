-- ============================================================================
-- Educore Provision: ICT Equipment Purchase Scheme Portal
-- Migration 0003: Seed Benchmark Data (All 5 Workflow Stages)
-- Target: PostgreSQL 18
-- ============================================================================

-- 1. Seed Institutions (Campuses)
INSERT INTO institutions (id, code, name, location, is_active) VALUES
    ('00000000-0000-0000-0001-000000000001', 'TRIDENT_COLLEGE', 'Trident College', 'Solwezi, North-Western Province, Zambia', true),
    ('00000000-0000-0000-0001-000000000002', 'SENTINEL_KABITAKA', 'Sentinel Kabitaka', 'Solwezi, North-Western Province, Zambia', true),
    ('00000000-0000-0000-0001-000000000003', 'FRONTIER_SCHOOL', 'Frontier School', 'Solwezi, North-Western Province, Zambia', true),
    ('00000000-0000-0000-0001-000000000004', 'EDUCORE_ACADEMY', 'Educore Academy', 'Solwezi, North-Western Province, Zambia', true),
    ('00000000-0000-0000-0001-000000000005', 'CENTRAL_ADMIN', 'Central Administration', 'Educore Services HQ, Solwezi, Zambia', true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location;

-- 2. Seed Equipment Tiers (Hardware Catalog)
INSERT INTO equipment_tiers (
    id, tier_code, title, subtitle, price_zmw, processor, ram, storage, display, graphics, warranty, target_audience, is_active
) VALUES
    (
        '00000000-0000-0000-0002-000000000001',
        'LEVEL_1',
        'Level 1: Faculty Standard Productivity',
        'Optimized for lesson delivery, LMS management, and administrative tasks',
        16800.00,
        'Intel Core i5-1335U (10 Cores, up to 4.6GHz)',
        '16GB DDR5 5200MHz',
        '512GB PCIe 4.0 NVMe SSD',
        '14.0" FHD (1920x1080) Anti-Glare IPS 300 nits',
        'Intel Iris Xe Integrated Graphics',
        '3-Year On-Site Educore Campus Hardware Care',
        'Primary & Secondary Teachers, School Administrators, Pastoral Care Staff',
        true
    ),
    (
        '00000000-0000-0000-0002-000000000002',
        'LEVEL_2',
        'Level 2: High Performance & STEM Computational',
        'Engineered for STEM instructors, multimedia creators, and heavy computational loads',
        28500.00,
        'Intel Core i7-13700H (14 Cores, up to 5.0GHz)',
        '32GB DDR5 5200MHz Dual-Channel',
        '1TB PCIe 4.0 NVMe High-Speed SSD',
        '15.6" QHD (2560x1440) 100% sRGB 400 nits',
        'NVIDIA GeForce RTX 3050 6GB GDDR6 Dedicated',
        '3-Year On-Site Educore Campus Hardware Care + Accidental Damage Protection',
        'STEM Department Heads, ICT & Robotics Teachers, Science Labs, Digital Media',
        true
    )
ON CONFLICT (tier_code) DO UPDATE SET title = EXCLUDED.title, price_zmw = EXCLUDED.price_zmw;

-- 3. Seed Policy Legal Versions
INSERT INTO policy_versions (id, version_tag, legal_text, is_active, effective_date) VALUES
    (
        '00000000-0000-0000-0003-000000000001',
        'v1.0-2026',
        'I have read and understood the ICT Equipment purchase scheme and it''s related policies as specified in the current policy document.

By signing this application I agree to:
1. The terms and conditions of the ICT Equipment and it''s related policies.
2. Deductions being made through payroll and reflected on my payslip.',
        true,
        '2026-01-01'
    )
ON CONFLICT (version_tag) DO NOTHING;

-- 4. Seed Users (Directory Personas mapped to Entra ID Object IDs)
INSERT INTO users (
    id, entra_oid, institution_id, employee_number, full_name, email, role, department, job_title, is_active
) VALUES
    -- Applicant 1: Jane Mwanza (Trident College)
    (
        '00000000-0000-0000-0004-000000000001',
        '4a73b281-2c0f-4886-ba0a-7fb9ea8ceb62',
        '00000000-0000-0000-0001-000000000001',
        'EDC-1042',
        'Jane Mwanza',
        'jmwanza@trident-college.com',
        'APPLICANT',
        'Mathematics & Computing',
        'Senior Mathematics Teacher',
        true
    ),
    -- Applicant 2: Patrick Banda (Sentinel Kabitaka)
    (
        '00000000-0000-0000-0004-000000000002',
        '8d21a993-9e45-4221-a1b2-132d0ffbc731',
        '00000000-0000-0000-0001-000000000002',
        'EDC-2051',
        'Patrick Banda',
        'pbanda@sentinel-kabitaka.com',
        'APPLICANT',
        'Science & Physics',
        'Physics Instructor',
        true
    ),
    -- Head Teacher: Blair Kuhn (Trident College)
    (
        '00000000-0000-0000-0004-000000000003',
        '1c94e012-3f19-48cb-8a4e-660c238b975e',
        '00000000-0000-0000-0001-000000000001',
        'EDC-0110',
        'Blair Kuhn',
        'bkuhn@trident-college.com',
        'HEAD_TEACHER',
        'Executive Leadership',
        'Head Teacher (Trident College)',
        true
    ),
    -- Head Teacher / GM: Chileshe Mwape (Sentinel Kabitaka)
    (
        '00000000-0000-0000-0004-000000000004',
        '2f88d120-7a31-41ee-9892-b43e5a201c89',
        '00000000-0000-0000-0001-000000000002',
        'EDC-0118',
        'Chileshe Mwape',
        'cmwape@sentinel-kabitaka.com',
        'HEAD_TEACHER',
        'Executive Leadership',
        'General Manager (Sentinel Kabitaka)',
        true
    ),
    -- Central HR Manager: Kasonde Phiri (Central Administration)
    (
        '00000000-0000-0000-0004-000000000005',
        '9b33a761-419b-43d9-9528-72e2cf6a1d44',
        '00000000-0000-0000-0001-000000000005',
        'EDC-0034',
        'Kasonde Phiri',
        'kphiri@educoreservices.com',
        'HR_MANAGER',
        'People & Payroll Compliance',
        'Central HR Operations Manager',
        true
    ),
    -- Central ICT Manager: Chola Musonda (Central Administration)
    (
        '00000000-0000-0000-0004-000000000006',
        '3a44c982-1209-4091-bb21-99af08d4b311',
        '00000000-0000-0000-0001-000000000005',
        'EDC-0012',
        'Chola Musonda',
        'cmusonda@educoreservices.com',
        'IT_MANAGER',
        'Central ICT Infrastructure',
        'Central ICT Infrastructure Manager',
        true
    ),
    -- Super Admin: Mthunzi Musumadi
    (
        '00000000-0000-0000-0004-000000000007',
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0001-000000000005',
        'EDC-0001',
        'Mthunzi Musumadi',
        'musumadimthunzi@gmail.com',
        'SUPER_ADMIN',
        'Central Administration',
        'System Administrator & Governance Lead',
        true
    )
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

-- 5. Seed Benchmark Applications Across the 5 Cases
INSERT INTO applications (
    id, reference_number, applicant_id, institution_id, status,
    policy_version_id, legal_text_snapshot, terms_accepted, terms_accepted_at,
    applicant_ip_address, applicant_user_agent, equipment_tier_id,
    repayment_period, estimated_monthly_amount_zmw, applicant_signed_at, applicant_digital_signature,
    gm_reviewer_id, gm_reviewer_name, gm_comments, gm_signed_at, gm_digital_signature,
    hr_reviewer_id, hr_reviewer_name, hr_comments, hr_signed_at, hr_vetting_checklist, hr_digital_signature,
    it_reviewer_id, it_reviewer_name, asset_serial_number, deducted_monthly_amount_zmw,
    deduction_start_date, deduction_end_date, it_comments, it_signed_at, it_digital_signature,
    created_at, updated_at
) VALUES 
-- Case 1: APPROVED & Finalized (Jane Mwanza, Level 1, Trident College)
(
    '00000000-0000-0000-0005-000000000001', 'EDC-ICT-2026-0001',
    '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001', 'APPROVED',
    '00000000-0000-0000-0003-000000000001',
    'I have read and understood the ICT Equipment purchase scheme and it''s related policies as specified in the current policy document. By signing this application I agree to: 1. The terms and conditions of the ICT Equipment and it''s related policies. 2. Deductions being made through payroll and reflected on my payslip.',
    true, '2026-10-01 08:30:00+00', '196.220.124.18', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    '00000000-0000-0000-0002-000000000001', 'TWELVE_MONTHS', 1400.00,
    '2026-10-01 08:32:00+00', 'SIG-MWA-4a73b281-20261001-OK',
    '00000000-0000-0000-0004-000000000003', 'Blair Kuhn',
    'Strongly endorsed. Essential for digital curriculum delivery in Grade 11 & 12 Mathematics.',
    '2026-10-01 11:15:00+00', 'SIG-KUH-1c94e012-20261001-GM',
    '00000000-0000-0000-0004-000000000005', 'Kasonde Phiri',
    'Full payroll clearance verified. Debt ratio sits at 18.2% (under 33% max limit). Zero active salary advances.',
    '2026-10-02 09:40:00+00', '{"probation_cleared": true, "zero_advances": true, "debt_ratio_cleared": true, "verified_by": "Kasonde Phiri"}'::jsonb,
    'SIG-PHI-9b33a761-20261002-HR',
    '00000000-0000-0000-0004-000000000006', 'Chola Musonda',
    'DELL-LAT-5540-0891', 1400.00, '2026-11-01', '2027-10-31',
    'Device unboxed, enrolled into Educore Intune MDM, asset tagged, and verified. 3-Year warranty logged.',
    '2026-10-03 14:20:00+00', 'SIG-MUS-3a44c982-20261003-IT',
    '2026-10-01 08:30:00+00', '2026-10-03 14:20:00+00'
),
-- Case 2: PENDING_GM_REVIEW (Patrick Banda, Level 2, Sentinel Kabitaka)
(
    '00000000-0000-0000-0005-000000000002', 'EDC-ICT-2026-0002',
    '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0001-000000000002', 'PENDING_GM_REVIEW',
    '00000000-0000-0000-0003-000000000001',
    'I have read and understood the ICT Equipment purchase scheme and it''s related policies as specified in the current policy document. By signing this application I agree to: 1. The terms and conditions of the ICT Equipment and it''s related policies. 2. Deductions being made through payroll and reflected on my payslip.',
    true, '2026-10-12 14:10:00+00', '196.220.124.99', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '00000000-0000-0000-0002-000000000002', 'TWENTY_FOUR_MONTHS', 1187.50,
    '2026-10-12 14:12:00+00', 'SIG-BAN-8d21a993-20261012-OK',
    NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '2026-10-12 14:10:00+00', '2026-10-12 14:12:00+00'
),
-- Case 3: PENDING_HR_REVIEW (Jane Mwanza, Level 1, Trident College - endorsed by Blair Kuhn)
(
    '00000000-0000-0000-0005-000000000003', 'EDC-ICT-2026-0003',
    '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001', 'PENDING_HR_REVIEW',
    '00000000-0000-0000-0003-000000000001',
    'I have read and understood the ICT Equipment purchase scheme and it''s related policies as specified in the current policy document. By signing this application I agree to: 1. The terms and conditions of the ICT Equipment and it''s related policies. 2. Deductions being made through payroll and reflected on my payslip.',
    true, '2026-10-10 10:00:00+00', '196.220.124.18', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    '00000000-0000-0000-0002-000000000001', 'TWELVE_MONTHS', 1400.00,
    '2026-10-10 10:05:00+00', 'SIG-MWA-4a73b281-20261010-OK',
    '00000000-0000-0000-0004-000000000003', 'Blair Kuhn',
    'Endorsed for faculty curriculum revision. Teacher is in good standing.',
    '2026-10-11 09:30:00+00', 'SIG-KUH-1c94e012-20261011-GM',
    NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '2026-10-10 10:00:00+00', '2026-10-11 09:30:00+00'
),
-- Case 4: PENDING_IT_SIGNOFF (Patrick Banda, Level 1, Sentinel Kabitaka - cleared by HR)
(
    '00000000-0000-0000-0005-000000000004', 'EDC-ICT-2026-0004',
    '00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0001-000000000002', 'PENDING_IT_SIGNOFF',
    '00000000-0000-0000-0003-000000000001',
    'I have read and understood the ICT Equipment purchase scheme and it''s related policies as specified in the current policy document. By signing this application I agree to: 1. The terms and conditions of the ICT Equipment and it''s related policies. 2. Deductions being made through payroll and reflected on my payslip.',
    true, '2026-10-08 08:00:00+00', '196.220.124.99', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '00000000-0000-0000-0002-000000000001', 'ONE_TO_TWO_MONTHS', 8400.00,
    '2026-10-08 08:05:00+00', 'SIG-BAN-8d21a993-20261008-OK',
    '00000000-0000-0000-0004-000000000004', 'Chileshe Mwape',
    'Supported. Fast repayment requested.',
    '2026-10-08 15:00:00+00', 'SIG-MWA-2f88d120-20261008-GM',
    '00000000-0000-0000-0004-000000000005', 'Kasonde Phiri',
    'Salary threshold accommodates accelerated 2-month deduction. Approved.',
    '2026-10-09 11:20:00+00', '{"probation_cleared": true, "zero_advances": true, "debt_ratio_cleared": true, "verified_by": "Kasonde Phiri"}'::jsonb,
    'SIG-PHI-9b33a761-20261009-HR',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '2026-10-08 08:00:00+00', '2026-10-09 11:20:00+00'
),
-- Case 5: REJECTED by HR (Jane Mwanza, Level 2, Trident College - SACCO debt ratio exceeded)
(
    '00000000-0000-0000-0005-000000000005', 'EDC-ICT-2026-0005',
    '00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0001-000000000001', 'REJECTED',
    '00000000-0000-0000-0003-000000000001',
    'I have read and understood the ICT Equipment purchase scheme and it''s related policies as specified in the current policy document. By signing this application I agree to: 1. The terms and conditions of the ICT Equipment and it''s related policies. 2. Deductions being made through payroll and reflected on my payslip.',
    true, '2026-09-15 09:00:00+00', '196.220.124.18', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    '00000000-0000-0000-0002-000000000002', 'TWELVE_MONTHS', 2375.00,
    '2026-09-15 09:04:00+00', 'SIG-MWA-4a73b281-20260915-OK',
    '00000000-0000-0000-0004-000000000003', 'Blair Kuhn',
    'Endorsed provisionally.',
    '2026-09-16 10:00:00+00', 'SIG-KUH-1c94e012-20261011-GM',
    '00000000-0000-0000-0004-000000000005', 'Kasonde Phiri',
    'REJECTED: Existing SACCO emergency loan deduction puts employee aggregate debt at 38.4%, exceeding the Educore 33% maximum payroll deduction threshold.',
    '2026-09-17 14:30:00+00', '{"probation_cleared": true, "zero_advances": false, "debt_ratio_cleared": false, "verified_by": "Kasonde Phiri"}'::jsonb,
    'SIG-PHI-9b33a761-20260917-HR',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    '2026-09-15 09:00:00+00', '2026-09-17 14:30:00+00'
)
ON CONFLICT (reference_number) DO UPDATE SET 
    status = EXCLUDED.status, 
    gm_reviewer_id = EXCLUDED.gm_reviewer_id,
    gm_comments = EXCLUDED.gm_comments,
    hr_reviewer_id = EXCLUDED.hr_reviewer_id,
    hr_comments = EXCLUDED.hr_comments,
    it_reviewer_id = EXCLUDED.it_reviewer_id,
    it_comments = EXCLUDED.it_comments;

-- 6. Seed Audit Trail for Benchmark Applications
INSERT INTO approval_audit_logs (
    id, application_id, actor_id, actor_name, actor_role, action_type, from_status, to_status, comments, is_internal, created_at
) VALUES
    ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000001', 'Jane Mwanza', 'APPLICANT', 'SUBMITTED_PART_1', 'DRAFT', 'PENDING_GM_REVIEW', 'Part 1 submitted with legal acceptance for Level 1 laptop (12 months).', false, '2026-10-01 08:32:00+00'),
    ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000003', 'Blair Kuhn', 'HEAD_TEACHER', 'ENDORSED_PART_2', 'PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'Endorsed by Head Teacher for Grade 11-12 curriculum.', false, '2026-10-01 11:15:00+00'),
    ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000005', 'Kasonde Phiri', 'HR_MANAGER', 'CLEARED_PART_3', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'HR clearance completed: Debt ratio 18.2% (under 33% limit). Passed vetting.', false, '2026-10-02 09:40:00+00'),
    ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0004-000000000006', 'Chola Musonda', 'IT_MANAGER', 'FINALIZED_PART_4', 'PENDING_IT_SIGNOFF', 'APPROVED', 'Serial DELL-LAT-5540-0891 allocated. Deduction schedule ZMW 1,400.00/mo confirmed.', false, '2026-10-03 14:20:00+00'),
    
    ('00000000-0000-0000-0006-000000000005', '00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0004-000000000002', 'Patrick Banda', 'APPLICANT', 'SUBMITTED_PART_1', 'DRAFT', 'PENDING_GM_REVIEW', 'Part 1 submitted for Level 2 laptop (24 months). Awaiting GM review.', false, '2026-10-12 14:12:00+00'),

    ('00000000-0000-0000-0006-000000000006', '00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0004-000000000001', 'Jane Mwanza', 'APPLICANT', 'SUBMITTED_PART_1', 'DRAFT', 'PENDING_GM_REVIEW', 'Part 1 submitted for Level 1 laptop.', false, '2026-10-10 10:05:00+00'),
    ('00000000-0000-0000-0006-000000000007', '00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0004-000000000003', 'Blair Kuhn', 'HEAD_TEACHER', 'ENDORSED_PART_2', 'PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'Endorsed for faculty curriculum revision. Teacher is in good standing.', false, '2026-10-11 09:30:00+00'),

    ('00000000-0000-0000-0006-000000000008', '00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0004-000000000002', 'Patrick Banda', 'APPLICANT', 'SUBMITTED_PART_1', 'DRAFT', 'PENDING_GM_REVIEW', 'Part 1 submitted with accelerated 1-2 month deduction.', false, '2026-10-08 08:05:00+00'),
    ('00000000-0000-0000-0006-000000000009', '00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0004-000000000004', 'Chileshe Mwape', 'HEAD_TEACHER', 'ENDORSED_PART_2', 'PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'Supported. Fast repayment requested.', false, '2026-10-08 15:00:00+00'),
    ('00000000-0000-0000-0006-000000000010', '00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0004-000000000005', 'Kasonde Phiri', 'HR_MANAGER', 'CLEARED_PART_3', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'Salary threshold accommodates accelerated 2-month deduction. Approved.', false, '2026-10-09 11:20:00+00'),

    ('00000000-0000-0000-0006-000000000011', '00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0004-000000000001', 'Jane Mwanza', 'APPLICANT', 'SUBMITTED_PART_1', 'DRAFT', 'PENDING_GM_REVIEW', 'Submitted request for Level 2 laptop.', false, '2026-09-15 09:04:00+00'),
    ('00000000-0000-0000-0006-000000000012', '00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0004-000000000003', 'Blair Kuhn', 'HEAD_TEACHER', 'ENDORSED_PART_2', 'PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'Endorsed provisionally.', false, '2026-09-16 10:00:00+00'),
    ('00000000-0000-0000-0006-000000000013', '00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0004-000000000005', 'Kasonde Phiri', 'HR_MANAGER', 'REJECTED_PART_3', 'PENDING_HR_REVIEW', 'REJECTED', 'REJECTED: Existing SACCO emergency loan deduction puts employee aggregate debt at 38.4%, exceeding the Educore 33% maximum payroll deduction threshold.', false, '2026-09-17 14:30:00+00')
ON CONFLICT (id) DO NOTHING;
