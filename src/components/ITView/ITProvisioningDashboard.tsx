import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { PurchaseApplication } from '../../types';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Server,
  Hash,
} from 'lucide-react';

export const ITProvisioningDashboard: React.FC = () => {
  const { institutions, users, getScopedApplications, openModal } = useApp();

  const [viewFilter, setViewFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrawerApp, setSelectedDrawerApp] = useState<PurchaseApplication | null>(null);

  const allApplications = getScopedApplications();

  const pendingITQueue = allApplications.filter((app) => app.status === 'PENDING_IT_SIGNOFF');
  const provisionedList = allApplications.filter((app) => app.status === 'APPROVED');

  const displayedList = (viewFilter === 'PENDING' ? pendingITQueue : allApplications).filter((app) => {
    const applicant = users.find((u) => u.id === app.applicantId);
    const config = LAPTOP_CONFIGS[app.requestedLaptopTier];
    return (
      app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.assetSerialNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header (Matching 1.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">
            <Server className="w-4 h-4" />
            <span>Central IT Operations · Asset Allocation & Digital Seals</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            IT Provisioning & Asset Lifecycle
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign device serial numbers / service tags, configure deduction schedules, and digitally seal purchase forms.{' '}
            <span className="text-purple-700 font-semibold">{pendingITQueue.length} awaiting final sign-off</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs">
            <span className="text-purple-600 block text-[10px] uppercase font-bold tracking-wider">
              Awaiting IT Allocation:
            </span>
            <span className="font-mono font-black text-purple-950 text-sm">
              {pendingITQueue.length} Device{pendingITQueue.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
            <span>Pending Asset Assignment</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
            {pendingITQueue.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Cleared both GM endorsement and HR debt compliance
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
            <span>Active Sealed Assets</span>
            <Laptop className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
            {provisionedList.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Enrolled in Educore Intune MDM & 3-Year warranty
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
            <span>Standard Warranty Term</span>
            <ShieldCheck className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
            36 Months
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            On-site Educore campus hardware care certified
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Bar Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewFilter === 'PENDING'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Action Queue ({pendingITQueue.length})
            </button>
            <button
              onClick={() => setViewFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewFilter === 'ALL'
                  ? 'bg-white text-purple-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Registry ({allApplications.length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search serial number, staff recipient, reference ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-800"
            />
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/60">
          <span>Displayed</span>
          <span className="px-2 py-0.5 rounded-lg bg-white font-mono font-bold text-purple-800 shadow-2xs">
            {displayedList.length}
          </span>
        </div>
      </div>

      {/* 4. Applications Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {displayedList.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-purple-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Queue is clear!</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are no pending applications requiring hardware assignment or sign-off.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 w-8">
                    <input type="checkbox" className="rounded text-purple-600" />
                  </th>
                  <th className="px-5 py-3.5">Reference ID</th>
                  <th className="px-5 py-3.5">Asset Serial / Service Tag</th>
                  <th className="px-5 py-3.5">Staff Recipient</th>
                  <th className="px-5 py-3.5">Hardware Tier</th>
                  <th className="px-5 py-3.5 text-right">Deduction Schedule</th>
                  <th className="px-5 py-3.5">Current Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedList.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const school = institutions.find((i) => i.id === app.institutionId);
                  const config = LAPTOP_CONFIGS[app.requestedLaptopTier];
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedDrawerApp(app)}
                      className="hover:bg-purple-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-purple-600" />
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                        {app.referenceNumber}
                      </td>
                      <td className="px-5 py-4">
                        {app.assetSerialNumber ? (
                          <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/70">
                            {app.assetSerialNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {applicant?.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{applicant?.fullName}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {school?.name.split(' ')[0]} · {applicant?.employeeNumber}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800 block">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1: Faculty Standard' : 'Level 2: High Performance'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[340px]">
                          {config.specs.processor}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-mono font-bold text-slate-900">
                          ZMW {(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toFixed(2)}/mo
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {app.deductionStartDate ? `${app.deductionStartDate} to ${app.deductionEndDate}` : `${app.repaymentPeriod}`}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>
                      <td
                        className="px-5 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status === 'PENDING_IT_SIGNOFF' ? (
                            <button
                              onClick={() => openModal('SIGNOFF_PART4', app.id)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                            >
                              Sign-off Part 4
                            </button>
                          ) : (
                            <button
                              onClick={() => setSelectedDrawerApp(app)}
                              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                          )}
                          <button
                            onClick={() => openModal('PHYSICAL_FORM', app.id)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                            title="Official Paper Form"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
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

        {/* 5. Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing 1-{displayedList.length} of {allApplications.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold text-xs shadow-xs">
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
