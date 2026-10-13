import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import {
  Laptop,
  Building,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  FileText,
  HardDrive,
  Cpu,
} from 'lucide-react';

export const ITProvisioningDashboard: React.FC = () => {
  const { institutions, users, getScopedApplications, openModal } = useApp();

  const [viewFilter, setViewFilter] = useState<'PENDING' | 'PROVISIONED'>('PENDING');

  const allApplications = getScopedApplications();

  const pendingITQueue = allApplications.filter((app) => app.status === 'PENDING_IT_SIGNOFF');
  const provisionedList = allApplications.filter((app) => app.status === 'APPROVED');

  const displayedList = viewFilter === 'PENDING' ? pendingITQueue : provisionedList;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1">
            <HardDrive className="w-4 h-4" />
            <span>Central Administration · Hardware & Scheme Ownership</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Central ICT Provisioning & Asset Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign device serial numbers / service tags, configure deduction schedules, and digitally seal purchase forms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
            <span className="text-slate-500 block text-[11px]">Awaiting IT Sign-off:</span>
            <span className="font-bold text-indigo-950 font-mono text-sm">
              {pendingITQueue.length} Device{pendingITQueue.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards for IT inventory */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Pending Asset Assignment</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {pendingITQueue.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Both GM & HR clearances successfully cleared
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Active Tagged Assets</span>
            <Laptop className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            {provisionedList.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Enrolled in Educore Intune & warranty tracked
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Standard Warranty Term</span>
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono">
            36 Months
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            On-site Educore campus hardware care
          </div>
        </div>
      </div>

      {/* View Switcher */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs">
          <button
            onClick={() => setViewFilter('PENDING')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              viewFilter === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Awaiting Hardware Sign-off ({pendingITQueue.length})
          </button>
          <button
            onClick={() => setViewFilter('PROVISIONED')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              viewFilter === 'PROVISIONED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sealed & Provisioned ({provisionedList.length})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          Showing {displayedList.length} application{displayedList.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No applications in this view</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no applications requiring IT provisioning actions right now.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="px-6 py-3">Reference No</th>
                  <th className="px-6 py-3">Recipient Staff</th>
                  <th className="px-6 py-3">Campus</th>
                  <th className="px-6 py-3">Hardware Tier</th>
                  <th className="px-6 py-3">Asset Serial / Tag</th>
                  <th className="px-6 py-3 text-right">Deduction Schedule</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {displayedList.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const school = institutions.find((i) => i.id === app.institutionId);
                  const isPendingIT = app.status === 'PENDING_IT_SIGNOFF';

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isPendingIT ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block">
                          {applicant?.fullName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {applicant?.employeeNumber} · {applicant?.department}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {school?.name}
                        </span>
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
                      <td className="px-6 py-4 font-mono">
                        {app.assetSerialNumber ? (
                          <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {app.assetSerialNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        <div className="font-bold text-slate-900">
                          ZMW{' '}
                          {(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                          )}
                          /mo
                        </div>
                        {app.deductionStartDate && (
                          <div className="text-[10px] text-slate-500">
                            {app.deductionStartDate} → {app.deductionEndDate}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {isPendingIT ? (
                            <button
                              onClick={() => openModal('SIGNOFF_PART4', app.id)}
                              className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-md font-semibold text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            >
                              <Laptop className="w-3.5 h-3.5" />
                              <span>Assign & Seal Part 4</span>
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
