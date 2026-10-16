import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvCell,
  formatPayloadSummaryForCsv,
  generateApplicationsCsv,
  exportApplicationsToCsv,
} from '../src/utils/csvExport';
import { WorkflowApplication } from '../src/types';

describe('CSV Export Utilities', () => {
  it('correctly escapes quotes, commas, newlines, and guards against formula injection', () => {
    assert.equal(escapeCsvCell(null), '""');
    assert.equal(escapeCsvCell(undefined), '""');
    assert.equal(escapeCsvCell('Simple'), '"Simple"');
    assert.equal(escapeCsvCell('Hello, World'), '"Hello, World"');
    assert.equal(escapeCsvCell('She said "Hello"'), '"She said ""Hello"""');
    assert.equal(escapeCsvCell("Line 1\nLine 2"), '"Line 1\nLine 2"');

    // Formula injection guard
    assert.equal(escapeCsvCell('=SUM(A1:A10)'), '"\'=SUM(A1:A10)"');
    assert.equal(escapeCsvCell('+44 123 456'), '"\'+44 123 456"');
    assert.equal(escapeCsvCell('@admin'), '"\'@admin"');

    // Ensure '#' in headers or values is never mangled
    assert.equal(escapeCsvCell('Employee #1234'), '"Employee #1234"');
  });

  it('formats payload summaries accurately across different forms', () => {
    const mockIctApp: Partial<WorkflowApplication> = {
      form_code: 'ICT_PURCHASE',
      payload: {
        equipment_tier_id: 'TIER-02',
        estimated_monthly_amount_zmw: 450,
        repayment_period: 'TWELVE_MONTHS',
      },
    };
    const ictSummary = formatPayloadSummaryForCsv(mockIctApp as WorkflowApplication);
    assert.ok(ictSummary.includes('TIER-02'));
    assert.ok(ictSummary.includes('450.00'));
    assert.ok(ictSummary.includes('TWELVE_MONTHS'));

    const mockTravelApp: Partial<WorkflowApplication> = {
      form_code: 'TRAVEL_REQUEST',
      payload: {
        destination: 'Ndola Campus',
        departure_date: '2026-11-01',
        return_date: '2026-11-05',
        travel_mode: 'ROAD',
        reason_for_travel: 'Curriculum inspection',
        passengers: [{ name: 'Teacher A' }, { name: 'Teacher B' }],
      },
    };
    const travelSummary = formatPayloadSummaryForCsv(mockTravelApp as WorkflowApplication);
    assert.ok(travelSummary.includes('Ndola Campus'));
    assert.ok(travelSummary.includes('Passengers: 2'));
  });

  it('generates well-formed RFC-4180 CSV with all required headers and rows', () => {
    const mockApps: WorkflowApplication[] = [
      {
        id: 'app-001',
        reference_number: 'EDC-ICT-2026-0001',
        form_code: 'ICT_PURCHASE',
        form_title: 'Application ICT Purchase Scheme',
        department: 'ICT',
        site_id: 'site-01',
        site_code: 'SOL',
        site_name: 'Solwezi Academy',
        applicant_id: 'user-01',
        applicant_name: 'Jane Doe',
        applicant_employee_number: 'EMP#9021',
        status: 'IN_REVIEW',
        current_step_order: 1,
        current_approver_role: 'HEAD_TEACHER',
        created_at: '2026-10-15T10:00:00.000Z',
        applicant_signed_at: '2026-10-15T10:05:00.000Z',
        applicant_digital_signature: 'Jane Doe',
        payload: {
          equipment_tier_id: 'TIER-01',
          estimated_monthly_amount_zmw: 350,
        },
        approvals: [
          {
            id: 'appr-01',
            application_id: 'app-001',
            step_order: 1,
            step_label: 'Head Teacher Endorsement',
            required_role: 'HEAD_TEACHER',
            site_scoped: true,
            status: 'APPROVED',
            comments: 'Endorsed',
            signed_at: '2026-10-15T10:10:00.000Z',
          },
        ],
      },
      {
        id: 'app-002',
        reference_number: 'EDC-SAL-2026-0002',
        form_code: 'SALARY_ADVANCE',
        form_title: 'Salary Advance Application',
        department: 'HR',
        site_id: 'site-01',
        site_code: 'SOL',
        site_name: 'Solwezi Academy',
        applicant_id: 'user-02',
        applicant_name: 'John Smith, Jr.',
        applicant_employee_number: 'EMP#9022',
        status: 'APPROVED',
        current_step_order: null,
        current_approver_role: null,
        created_at: '2026-10-14T08:00:00.000Z',
        applicant_signed_at: '2026-10-14T08:05:00.000Z',
        applicant_digital_signature: 'John Smith, Jr.',
        payload: {
          requested_amount_zmw: 5000,
          repayment_months: 2,
          reason: 'Emergency medical expenses, urgent',
        },
        approvals: [],
      },
    ];

    const csvOutput = generateApplicationsCsv(mockApps);

    // Verify headers exist
    assert.ok(csvOutput.includes('"Reference Number"'));
    assert.ok(csvOutput.includes('"Applicant Name"'));
    assert.ok(csvOutput.includes('"Form Details Summary"'));
    assert.ok(csvOutput.includes('"Payload JSON"'));

    // Verify row 1 contents
    assert.ok(csvOutput.includes('"EDC-ICT-2026-0001"'));
    assert.ok(csvOutput.includes('"Jane Doe"'));
    assert.ok(csvOutput.includes('"EMP#9021"'));

    // Verify row 2 comma escaping for "John Smith, Jr."
    assert.ok(csvOutput.includes('"John Smith, Jr."'));
    assert.ok(csvOutput.includes('"EDC-SAL-2026-0002"'));

    // Verify CRLF line separation
    const lines = csvOutput.split('\r\n');
    assert.equal(lines.length, 3); // 1 header row + 2 data rows
  });

  it('handles empty input safely', () => {
    const result = exportApplicationsToCsv([]);
    assert.equal(result.success, false);
    assert.equal(result.count, 0);
  });
});
