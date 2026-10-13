import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Eye,
  ShieldAlert,
} from 'lucide-react';

export const SchoolTriageDashboard: React.FC = () => {
  const { currentUser, institutions, users, getScopedApplications, openModal } = useApp();

  const [filterTab, setFilterTab] = useState<'PENDING' | 'ALL'>('PENDING');

  const school = institutions.find((i) => i.id === currentUser.institutionId);
  const applications = getScopedApplications();

  const pendingQueue = applications.filter((app) => app.status === 'PENDING_GM_REVIEW');
  const pastArchive = applications.filter((app) => app.status !== 'PENDING_GM_REVIEW');

  const displayedList = filterTab === 'PENDING' ? pendingQueue : applications;

  return (
    <div className="space-y-6">
      {/* Institutional Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
            <Building className="w-4 h-4" />
            <span>Campus Leadership Portal · Row-Level Security Scoped</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            {school?.name || 'Assigned Campus'} — Equipment Triage
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and endorse Part 2 operational justifications for staff members strictly within your institution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
            <span className="text-slate-500 block text-[11px]">Head Teacher / GM:</span>
            <span className="font-semibold text-emerald-950">{currentUser.fullName}</span>
          </div>
        </div>
      </div>

      {/* RLS Scoping Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0" />
        <span>
          <strong>Security Scope Enforcement:</strong> You can only view and endorse applications originating from{' '}
          <strong className="text-slate-900">{school?.name}</strong>. Applications from other Educore campuses are hidden at the data layer.
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilterTab('PENDING')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              filterTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Action Queue ({pendingQueue.length} Pending)
          </button>
          <button
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Campus Archive ({applications.length} Total)
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {displayedList.length} of {applications.length}
        </span>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">Queue is clear!</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending staff applications from {school?.name} requiring your endorsement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="px-6 py-3">Reference No</th>
                  <th className="px-6 py-3">Staff Member</th>
                  <th className="px-6 py-3">Hardware Tier</th>
                  <th className="px-6 py-3">Repayment Plan</th>
                  <th className="px-6 py-3 text-right">Monthly Deduction</th>
                  <th className="px-6 py-3">Current Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedList.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const config = LAPTOP_CONFIGS[app.requestedLaptopTier];
                  const isPendingThisGM = app.status === 'PENDING_GM_REVIEW';

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPendingThisGM ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block">
                          {applicant?.fullName || 'Staff Member'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {applicant?.employeeNumber} · {applicant?.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1' : 'Level 2'}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block max-w-[170px]">
                          {config.title}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {app.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                          ? '1–2 Months'
                          : app.repaymentPeriod === 'TWELVE_MONTHS'
                          ? '12 Months'
                          : '24 Months'}
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
                          {isPendingThisGM ? (
                            <button
                              onClick={() => openModal('ENDORSE_PART2', app.id)}
                              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Endorse Part 2</span>
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
