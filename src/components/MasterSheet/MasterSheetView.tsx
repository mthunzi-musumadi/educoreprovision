import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Building,
  DollarSign,
  Laptop,
  CheckCircle2,
  Eye,
  FileText,
} from 'lucide-react';

export const MasterSheetView: React.FC = () => {
  const { applications, institutions, users, openModal } = useApp();

  const [activeTab, setActiveTab] = useState<'PAYROLL' | 'ASSETS'>('PAYROLL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Filtered dataset
  const filteredApplications = applications.filter((app) => {
    const applicant = users.find((u) => u.id === app.applicantId);
    const school = institutions.find((i) => i.id === app.institutionId);

    const matchesSearch =
      app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.assetSerialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchool =
      selectedSchool === 'ALL' || app.institutionId === selectedSchool;

    const matchesStatus =
      selectedStatus === 'ALL' || app.status === selectedStatus;

    return matchesSearch && matchesSchool && matchesStatus;
  });

  // Calculate Metrics
  const approvedApps = applications.filter((app) => app.status === 'APPROVED');
  const totalMonthlyPayrollZmw = approvedApps.reduce(
    (sum, app) => sum + (app.deductedMonthlyAmount || 0),
    0
  );
  const totalCapitalValueZmw = approvedApps.reduce(
    (sum, app) => sum + LAPTOP_CONFIGS[app.requestedLaptopTier].priceZmw,
    0
  );

  // CSV Export for Payroll Batch
  const exportPayrollCSV = () => {
    const headers = [
      'Reference Number',
      'Employee Number',
      'Employee Name',
      'Institution',
      'Department',
      'Laptop Tier',
      'Repayment Plan',
      'Monthly Deduction (ZMW)',
      'Deduction Start Month',
      'Deduction End Month',
      'HR Approver',
      'IT Approver',
      'Status',
    ];

    const rows = filteredApplications.map((app) => {
      const applicant = users.find((u) => u.id === app.applicantId);
      const school = institutions.find((i) => i.id === app.institutionId);

      return [
        `"${app.referenceNumber}"`,
        `"${applicant?.employeeNumber || ''}"`,
        `"${applicant?.fullName || ''}"`,
        `"${school?.name || ''}"`,
        `"${applicant?.department || ''}"`,
        `"${app.requestedLaptopTier}"`,
        `"${app.repaymentPeriod}"`,
        `"${(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toFixed(2)}"`,
        `"${app.deductionStartDate || 'Pending'}"`,
        `"${app.deductionEndDate || 'Pending'}"`,
        `"${app.hrReviewerName || 'Pending'}"`,
        `"${app.itReviewerName || 'Pending'}"`,
        `"${app.status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `educore_payroll_deductions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Asset Register
  const exportAssetRegisterCSV = () => {
    const headers = [
      'Reference Number',
      'Asset Serial / Service Tag',
      'Staff Recipient',
      'Employee Number',
      'School',
      'Laptop Tier',
      'Hardware Specs',
      'Handover Date',
      'Warranty Expiration',
      'Status',
    ];

    const rows = filteredApplications
      .filter((app) => app.assetSerialNumber || app.status === 'APPROVED')
      .map((app) => {
        const applicant = users.find((u) => u.id === app.applicantId);
        const school = institutions.find((i) => i.id === app.institutionId);
        const config = LAPTOP_CONFIGS[app.requestedLaptopTier];

        return [
          `"${app.referenceNumber}"`,
          `"${app.assetSerialNumber || 'Unassigned'}"`,
          `"${applicant?.fullName || ''}"`,
          `"${applicant?.employeeNumber || ''}"`,
          `"${school?.name || ''}"`,
          `"${config.title}"`,
          `"${config.specs.processor} / ${config.specs.ram} / ${config.specs.storage}"`,
          `"${app.itSignedAt ? new Date(app.itSignedAt).toLocaleDateString('en-GB') : 'Pending'}"`,
          `"36 Months from Handover"`,
          `"${app.status}"`,
        ].join(',');
      });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `educore_asset_register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Educore Services · Central Administrative Single Source of Truth</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Master Scheme Ledger & Batch Export
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Unified multi-campus registry for monthly payroll deduction batches and hardware asset lifecycle management.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportPayrollCSV}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Payroll CSV</span>
          </button>
          <button
            onClick={exportAssetRegisterCSV}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Asset Register</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Active Monthly Payroll Deductions</div>
          <div className="text-lg font-bold text-emerald-700 font-mono">
            ZMW {totalMonthlyPayrollZmw.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sum across all active staff</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Total Hardware Asset Value</div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            ZMW {totalCapitalValueZmw.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gross capital outlay</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">Allocated Laptops</div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {approvedApps.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sealed & active deductions</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="text-xs text-slate-500 mb-1">In-Flight Queue</div>
          <div className="text-lg font-bold text-amber-700 font-mono">
            {applications.filter((a) => ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(a.status)).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Pending approval steps</div>
        </div>
      </div>

      {/* Controls Strip: Tabs, Search, Campus, Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('PAYROLL')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'PAYROLL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payroll Deduction Ledger
            </button>
            <button
              onClick={() => setActiveTab('ASSETS')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeTab === 'ASSETS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hardware & Asset Tag Registry
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, name, employee ID, serial..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Campus:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-md bg-white text-slate-700"
            >
              <option value="ALL">All Educore Campuses</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-1.5 border border-slate-300 rounded-md bg-white text-slate-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_GM_REVIEW">Pending GM Review</option>
              <option value="PENDING_HR_REVIEW">Pending HR Review</option>
              <option value="PENDING_IT_SIGNOFF">Pending IT Sign-off</option>
              <option value="APPROVED">Approved & Active</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <span className="text-slate-400 font-mono ml-auto">
            Showing {filteredApplications.length} of {applications.length} Records
          </span>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="px-5 py-3">Reference No</th>
                <th className="px-5 py-3">Staff Member</th>
                <th className="px-5 py-3">Campus</th>
                <th className="px-5 py-3">Hardware Tier</th>
                {activeTab === 'PAYROLL' ? (
                  <>
                    <th className="px-5 py-3">Repayment Term</th>
                    <th className="px-5 py-3 text-right">Monthly Deduction</th>
                    <th className="px-5 py-3">Deduction Schedule</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3">Asset Serial / Service Tag</th>
                    <th className="px-5 py-3">Warranty & MDM</th>
                    <th className="px-5 py-3">Handover Sign-off</th>
                  </>
                )}
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No matching records found in Master Sheet.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const school = institutions.find((i) => i.id === app.institutionId);

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {app.referenceNumber}
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-slate-900 block whitespace-nowrap">
                          {applicant?.fullName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {applicant?.employeeNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-800 whitespace-nowrap">
                        {school?.name}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1' : 'Level 2'}
                        </span>
                      </td>

                      {activeTab === 'PAYROLL' ? (
                        <>
                          <td className="px-5 py-3 whitespace-nowrap">
                            {app.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                              ? '1–2 Months'
                              : app.repaymentPeriod === 'TWELVE_MONTHS'
                              ? '12 Months'
                              : '24 Months'}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            ZMW{' '}
                            {(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {app.deductionStartDate ? (
                              <span>
                                {app.deductionStartDate} → {app.deductionEndDate}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending IT start date</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-3 font-mono whitespace-nowrap">
                            {app.assetSerialNumber ? (
                              <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                                {app.assetSerialNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                            3-Year Educore Warranty
                          </td>
                          <td className="px-5 py-3 text-[11px] text-slate-600 font-mono whitespace-nowrap">
                            {app.itSignedAt
                              ? new Date(app.itSignedAt).toLocaleDateString('en-GB')
                              : '—'}
                          </td>
                        </>
                      )}

                      <td className="px-5 py-3 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal('DETAIL', app.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openModal('PHYSICAL_FORM', app.id)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors cursor-pointer"
                            title="View Paper Form"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
};
