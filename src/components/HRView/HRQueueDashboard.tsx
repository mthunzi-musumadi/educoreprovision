import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  FileCheck2,
  Building,
  Filter,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  FileText,
  User,
} from 'lucide-react';

export const HRQueueDashboard: React.FC = () => {
  const { institutions, users, getScopedApplications, openModal } = useApp();

  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [viewFilter, setViewFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  const allApplications = getScopedApplications();

  // Filter by campus
  const campusFiltered =
    selectedSchoolFilter === 'ALL'
      ? allApplications
      : allApplications.filter((app) => app.institutionId === selectedSchoolFilter);

  const pendingHRQueue = campusFiltered.filter((app) => app.status === 'PENDING_HR_REVIEW');
  const displayedList = viewFilter === 'PENDING' ? pendingHRQueue : campusFiltered;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Central Administration · People & Payroll Compliance</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Central HR Review & Debt Clearance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Statutory clearance across all Educore schools: verify employment contract, salary advances, and 33% debt threshold.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <span className="text-slate-500 block text-[11px]">Awaiting HR Review:</span>
            <span className="font-bold text-blue-950 font-mono text-sm">
              {pendingHRQueue.length} Request{pendingHRQueue.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Campus Filter Strip & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Campus Filter */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Campus:</span>
          </span>
          <button
            onClick={() => setSelectedSchoolFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              selectedSchoolFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Campuses
          </button>
          {institutions
            .filter((i) => i.code !== 'CENTRAL_ADMIN')
            .map((inst) => (
              <button
                key={inst.id}
                onClick={() => setSelectedSchoolFilter(inst.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                  selectedSchoolFilter === inst.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {inst.name}
              </button>
            ))}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs">
          <button
            onClick={() => setViewFilter('PENDING')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              viewFilter === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Clearance ({pendingHRQueue.length})
          </button>
          <button
            onClick={() => setViewFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              viewFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All History ({campusFiltered.length})
          </button>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No applications in this view</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no applications pending HR clearance matching your filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="px-6 py-3">Reference No</th>
                  <th className="px-6 py-3">School / Campus</th>
                  <th className="px-6 py-3">Staff Member</th>
                  <th className="px-6 py-3">Endorsed By (GM)</th>
                  <th className="px-6 py-3">Hardware Tier</th>
                  <th className="px-6 py-3 text-right">Monthly Deduction</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedList.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const school = institutions.find((i) => i.id === app.institutionId);
                  const isPendingHR = app.status === 'PENDING_HR_REVIEW';

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPendingHR ? 'bg-blue-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {school?.name || 'Educore School'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {school?.code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block">
                          {applicant?.fullName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {applicant?.employeeNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-800 block font-medium">
                          {app.gmReviewerName || '—'}
                        </span>
                        {app.gmSignedAt && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(app.gmSignedAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1' : 'Level 2'}
                        </span>
                        <span className="text-slate-500 block text-[11px]">
                          {app.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                            ? '1–2 Mo'
                            : app.repaymentPeriod === 'TWELVE_MONTHS'
                            ? '12 Mo'
                            : '24 Mo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        ZMW{' '}
                        {(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isPendingHR ? (
                            <button
                              onClick={() => openModal('CLEAR_PART3', app.id)}
                              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-md font-semibold text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <FileCheck2 className="w-3.5 h-3.5" />
                              <span>Clear Part 3</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openModal('DETAIL', app.id)}
                              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          )}
                          <button
                            onClick={() => openModal('PHYSICAL_FORM', app.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            <span>Form</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
