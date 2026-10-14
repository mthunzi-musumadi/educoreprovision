import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { PurchaseApplication } from '../../types';
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
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const MasterSheetView: React.FC = () => {
  const { applications, institutions, users, openModal } = useApp();

  const [activeTab, setActiveTab] = useState<'PAYROLL' | 'ASSETS'>('PAYROLL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDrawerApp, setSelectedDrawerApp] = useState<PurchaseApplication | null>(null);

  // Filtered dataset
  const filteredApplications = applications.filter((app) => {
    const applicant = users.find((u) => u.id === app.applicantId);
    const school = institutions.find((i) => i.id === app.institutionId);

    const matchesSearch =
      app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.assetSerialNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchool = selectedSchool === 'ALL' || app.institutionId === selectedSchool;
    const matchesStatus = selectedStatus === 'ALL' || app.status === selectedStatus;

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
      {/* 1. Header (Matching 1.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Single Source of Truth · Organization-wide Ledger</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Master Sheet & Payroll Deductions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centrally audit approved equipment allocations and generate payroll batch deduction files.{' '}
            <span className="text-emerald-700 font-semibold">{approvedApps.length} active deduction streams</span>
          </p>
        </div>

        {/* Action Buttons for Export */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={exportPayrollCSV}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Payroll CSV</span>
          </button>
          <button
            onClick={exportAssetRegisterCSV}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Asset Register</span>
          </button>
        </div>
      </div>

      {/* 2. Executive Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-400 font-medium mb-1">Monthly Payroll Deduction</div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ZMW {totalMonthlyPayrollZmw.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active gross deductions/mo</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-400 font-medium mb-1">Total Scheme Capital Value</div>
          <div className="text-xl font-black text-slate-900 font-mono">
            ZMW {totalCapitalValueZmw.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Gross equipment outlay</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-400 font-medium mb-1">Active Sealed Laptops</div>
          <div className="text-xl font-black text-emerald-700 font-mono">
            {approvedApps.length} Units
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Sealed & tagged assets</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="text-xs text-slate-400 font-medium mb-1">In-Flight Queue</div>
          <div className="text-xl font-black text-amber-700 font-mono">
            {applications.filter((a) => ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(a.status)).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">In approval workflow</div>
        </div>
      </div>

      {/* 3. Search and Filter Bar Container (Matching 1.png) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('PAYROLL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'PAYROLL'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payroll Deduction Ledger
            </button>
            <button
              onClick={() => setActiveTab('ASSETS')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'ASSETS'
                  ? 'bg-white text-emerald-800 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hardware & Asset Tag Registry
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, staff name, employee ID, serial..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-800"
            />
          </div>

          {/* Campus Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 text-[11px] font-medium">Campus:</span>
            <select
              value={selectedSchool}
              onChange={(e) => setSelectedSchool(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Educore Campuses</option>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 text-[11px] font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_GM_REVIEW">Pending GM Review</option>
              <option value="PENDING_HR_REVIEW">Pending HR Review</option>
              <option value="PENDING_IT_SIGNOFF">Pending IT Sign-off</option>
              <option value="APPROVED">Approved & Active</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/60">
          <span>Total Records</span>
          <span className="px-2 py-0.5 rounded-lg bg-white font-mono font-bold text-emerald-800 shadow-2xs">
            {filteredApplications.length}
          </span>
        </div>
      </div>

      {/* 4. High-Density Master Sheet Table (Matching 1.png) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5 w-8">
                  <input type="checkbox" className="rounded text-emerald-600" />
                </th>
                <th className="px-5 py-3.5">Reference ID</th>
                <th className="px-5 py-3.5">Staff Recipient</th>
                <th className="px-5 py-3.5">School / Campus</th>
                <th className="px-5 py-3.5">Hardware Tier</th>
                {activeTab === 'PAYROLL' ? (
                  <>
                    <th className="px-5 py-3.5">Repayment Term</th>
                    <th className="px-5 py-3.5 text-right">Monthly Deduction</th>
                    <th className="px-5 py-3.5">Deduction Schedule</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3.5">Asset Serial / Service Tag</th>
                    <th className="px-5 py-3.5">Warranty & MDM</th>
                    <th className="px-5 py-3.5">Handover Sign-off</th>
                  </>
                )}
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    No matching records found in Master Sheet.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const school = institutions.find((i) => i.id === app.institutionId);

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedDrawerApp(app)}
                      className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-emerald-600" />
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 group-hover:text-emerald-700 transition-colors whitespace-nowrap">
                        {app.referenceNumber}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {applicant?.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block whitespace-nowrap">
                              {applicant?.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {applicant?.employeeNumber} · {applicant?.department}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-800 border border-slate-200/70 inline-block">
                          {school?.name}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1' : 'Level 2'}
                        </span>
                      </td>

                      {activeTab === 'PAYROLL' ? (
                        <>
                          <td className="px-5 py-4 whitespace-nowrap text-slate-700">
                            {app.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                              ? '1–2 Months'
                              : app.repaymentPeriod === 'TWELVE_MONTHS'
                              ? '12 Months'
                              : '24 Months'}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            ZMW{' '}
                            {(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toLocaleString(
                              undefined,
                              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                            {app.deductionStartDate ? (
                              <span className="font-semibold text-slate-800">
                                {app.deductionStartDate} → {app.deductionEndDate}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Pending IT start date</span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-4 font-mono whitespace-nowrap">
                            {app.assetSerialNumber ? (
                              <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                {app.assetSerialNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-[11px] text-slate-600 whitespace-nowrap">
                            3-Year Educore Campus Care
                          </td>
                          <td className="px-5 py-4 text-[11px] text-slate-600 font-mono whitespace-nowrap">
                            {app.itSignedAt
                              ? new Date(app.itSignedAt).toLocaleDateString('en-GB')
                              : '—'}
                          </td>
                        </>
                      )}

                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td
                        className="px-5 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDrawerApp(app)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                            title="Open Detail Drawer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            onClick={() => openModal('PHYSICAL_FORM', app.id)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                            title="View Official Facsimile Form"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing 1-{filteredApplications.length} of {applications.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold text-xs shadow-xs">
              1
            </button>
            <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50 text-slate-700 focus:outline-none">
              <option>10 / page</option>
              <option>25 / page</option>
              <option>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. Slide-Over Drawer Detail Panel (design_inspiration/2.png) */}
      {selectedDrawerApp && (
        <ApplicationDetailDrawer
          application={selectedDrawerApp}
          onClose={() => setSelectedDrawerApp(null)}
        />
      )}
    </div>
  );
};
