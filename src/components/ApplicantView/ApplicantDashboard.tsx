import React from 'react';
import { useApp } from '../../context/AppContext';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import { StatusBadge } from '../common/StatusBadge';
import {
  Laptop,
  Plus,
  FileText,
  Clock,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const ApplicantDashboard: React.FC = () => {
  const { currentUser, institutions, getScopedApplications, openModal } = useApp();

  const applications = getScopedApplications();
  const school = institutions.find((i) => i.id === currentUser.institutionId);

  const activeRequest = applications.find((app) =>
    ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(app.status)
  );

  const approvedRequests = applications.filter((app) => app.status === 'APPROVED');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-1">
            <Building className="w-4 h-4" />
            <span>{school?.name || 'Educore School'} · Staff Portal</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome, {currentUser.fullName}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Apply for laptop equipment under the Educore Services Purchase Scheme with payroll deductions.
          </p>
        </div>

        <button
          onClick={() => openModal('NEW_REQUEST')}
          className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Equipment Request</span>
        </button>
      </div>

      {/* High-level summary KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>In-Flight Request</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-slate-900">
            {activeRequest ? activeRequest.referenceNumber : 'None Active'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activeRequest ? (
              <span className="text-amber-700 font-medium">Currently in approval workflow</span>
            ) : (
              'Ready to submit a new request'
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Allocated Laptops</span>
            <Laptop className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            {approvedRequests.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active under monthly payroll deduction
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Scheme Policy Version</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 font-mono">
            v1.0-2026
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Solwezi Headquarters Certified
          </div>
        </div>
      </div>

      {/* Applications Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">My Equipment Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Personal submissions scoped to employee ID {currentUser.employeeNumber}
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {applications.length} Record{applications.length === 1 ? '' : 's'}
          </div>
        </div>

        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">No applications on record</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't submitted an ICT purchase application yet. Click "+ New Equipment Request" to begin.
            </p>
            <button
              onClick={() => openModal('NEW_REQUEST')}
              className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply for Equipment</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="px-6 py-3">Reference No</th>
                  <th className="px-6 py-3">Submitted</th>
                  <th className="px-6 py-3">Hardware Tier</th>
                  <th className="px-6 py-3">Repayment Plan</th>
                  <th className="px-6 py-3 text-right">Monthly Deduction</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => {
                  const config = LAPTOP_CONFIGS[app.requestedLaptopTier];
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {app.referenceNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800 block">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1' : 'Level 2'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {config.title.split(':')[1] || config.title}
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
                          <button
                            onClick={() => openModal('DETAIL', app.id)}
                            className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="View Workflow Progress"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Progress</span>
                          </button>
                          <button
                            onClick={() => openModal('PHYSICAL_FORM', app.id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="View Physical Paper Form"
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
