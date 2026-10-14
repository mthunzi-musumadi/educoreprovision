import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import { StatusBadge } from '../common/StatusBadge';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { PurchaseApplication } from '../../types';
import {
  Laptop,
  Plus,
  FileText,
  Clock,
  Check,
  Building,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Eye,
  Search,
  Filter,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface ApplicantDashboardProps {
  initialMode?: 'PERSONAL' | 'DIRECTORY';
}

export const ApplicantDashboard: React.FC<ApplicantDashboardProps> = ({ initialMode }) => {
  const {
    currentUser,
    users,
    institutions,
    applications,
    getScopedApplications,
    getTimelineForApplication,
    openModal,
    withdrawApplication,
  } = useApp();

  // Mode toggle for leadership roles (Head Teacher, HR, IT, Super Admin)
  const isPrivilegedUser = currentUser.role !== 'APPLICANT';
  const [viewMode, setViewMode] = useState<'PERSONAL' | 'DIRECTORY'>(() => {
    if (currentUser.role === 'APPLICANT') return 'PERSONAL';
    if (initialMode) return initialMode;
    return 'DIRECTORY';
  });

  // Ensure viewMode correctly reacts to persona or role switches
  React.useEffect(() => {
    if (!isPrivilegedUser) {
      setViewMode('PERSONAL');
    } else if (initialMode) {
      setViewMode(initialMode);
    }
  }, [currentUser.id, currentUser.role, isPrivilegedUser, initialMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedSchool, setSelectedSchool] = useState<string>('ALL');
  const [selectedDrawerApp, setSelectedDrawerApp] = useState<PurchaseApplication | null>(null);

  // 1. Personal Applications strictly for currentUser
  const myApplications = applications.filter((app) => app.applicantId === currentUser.id);

  // 2. Scoped Applicants (Campus for Head Teacher, Global for HR/IT/Admin)
  const scopedApplications = getScopedApplications();

  const currentSchool = institutions.find((i) => i.id === currentUser.institutionId);

  // Filtered lists based on active view mode
  const activeList = viewMode === 'PERSONAL' ? myApplications : scopedApplications;

  const filteredApplications = activeList.filter((app) => {
    const config = LAPTOP_CONFIGS[app.requestedLaptopTier];
    const applicant = users.find((u) => u.id === app.applicantId);
    const inst = institutions.find((i) => i.id === app.institutionId);

    const matchesSearch =
      app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (config?.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.repaymentPeriod || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inst?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || app.status === selectedStatus;
    const matchesTier = selectedTier === 'ALL' || app.requestedLaptopTier === selectedTier;
    const matchesSchool = selectedSchool === 'ALL' || app.institutionId === selectedSchool;

    return matchesSearch && matchesStatus && matchesTier && matchesSchool;
  });

  // Personal metrics strictly for currentUser
  const myActiveRequest = myApplications.find((app) =>
    ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'REVISION_REQUIRED'].includes(app.status)
  );
  const myPastRequests = myApplications.filter((app) =>
    ['APPROVED', 'CLOSED', 'REJECTED'].includes(app.status)
  );
  const myApprovedRequests = myApplications.filter((app) => app.status === 'APPROVED');

  // Leadership directory metrics
  const directoryPendingCount = scopedApplications.filter((a) => {
    if (currentUser.role === 'HEAD_TEACHER') return a.status === 'PENDING_GM_REVIEW';
    if (currentUser.role === 'HR_MANAGER') return a.status === 'PENDING_HR_REVIEW';
    if (currentUser.role === 'IT_MANAGER') return a.status === 'PENDING_IT_SIGNOFF';
    return ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(a.status);
  }).length;

  const directoryApprovedCount = scopedApplications.filter((a) => a.status === 'APPROVED').length;
  const uniqueApplicantsCount = new Set(scopedApplications.map((a) => a.applicantId)).size;

  return (
    <div className="space-y-6">
      {/* 1. Higher Privileged Context: Mode Switcher Banner */}
      {isPrivilegedUser && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 rounded-2xl p-4 text-white shadow-md border border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-600/50 border border-slate-400/40 flex items-center justify-center text-slate-200 shrink-0 mt-0.5">
              <Check className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Leadership Context Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {currentUser.role.replace(/_/g, ' ')}
                </span>
              </div>
              <h2 className="text-sm font-bold text-white mt-0.5">
                {viewMode === 'PERSONAL'
                  ? 'Viewing Personal Equipment Applications'
                  : `Staff Applicants Directory (${currentUser.role === 'HEAD_TEACHER' ? currentSchool?.name : 'All Campuses'})`}
              </h2>
              <p className="text-xs text-slate-200/80 mt-0.5">
                {viewMode === 'PERSONAL'
                  ? 'Apply for and track your own laptop purchase under the Educore staff scheme.'
                  : `Overview of staff applications submitted under your jurisdiction (${scopedApplications.length} total).`}
              </p>
            </div>
          </div>

          {/* Segmented View Switcher */}
          <div className="flex items-center bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <button
              onClick={() => setViewMode('PERSONAL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'PERSONAL'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>My Personal Applications</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${viewMode === 'PERSONAL' ? 'bg-slate-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {myApplications.length}
              </span>
            </button>

            <button
              onClick={() => setViewMode('DIRECTORY')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                viewMode === 'DIRECTORY'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'text-slate-200 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Applicants Directory</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono ${viewMode === 'DIRECTORY' ? 'bg-slate-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {scopedApplications.length}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Revision Required Alert Banner (Strictly for personal request) */}
      {viewMode === 'PERSONAL' && myActiveRequest?.status === 'REVISION_REQUIRED' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-xs text-amber-900 block">
                Action Required: Campus Leadership Requested Revision on {myActiveRequest.referenceNumber}
              </span>
              <p className="text-xs text-amber-800 mt-0.5 italic">
                "{myActiveRequest.gmComments || 'Please adjust your hardware tier or repayment period.'}"
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Per Educore purchase policy, please withdraw this request and re-apply with the updated selections.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Withdraw this application so you can re-apply?')) {
                withdrawApplication(myActiveRequest.id);
              }
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            Withdraw & Re-Apply
          </button>
        </div>
      )}

      {/* 2. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {viewMode === 'PERSONAL'
              ? 'My Equipment Applications'
              : `${currentUser.role === 'HEAD_TEACHER' ? currentSchool?.name : 'Educore Services'} · Staff Applicants`}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === 'PERSONAL' ? (
              <>
                Manage your personal ICT purchase scheme applications.{' '}
                <span className="text-slate-600 font-semibold">{myApplications.length} applications total</span>
              </>
            ) : (
              <>
                Direct directory of staff applicants within your institutional scope.{' '}
                <span className="text-slate-600 font-semibold">{scopedApplications.length} total applications</span>
              </>
            )}
          </p>
        </div>

        {/* Action Button: Personal Request Submission */}
        {viewMode === 'PERSONAL' && (
          <button
            onClick={() => openModal('NEW_REQUEST')}
            disabled={Boolean(myActiveRequest)}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 shrink-0 ${
              myActiveRequest
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-600 hover:bg-slate-700 text-white shadow-slate-100 hover:shadow-slate-200 cursor-pointer'
            }`}
            title={myActiveRequest ? 'You already have an active application in review' : 'Submit new request'}
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Request</span>
          </button>
        )}

        {viewMode === 'DIRECTORY' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Logged in as:</span>
            <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
              {currentUser.fullName} ({currentUser.employeeNumber})
            </span>
          </div>
        )}
      </div>

      {/* 3. KPI Summary Cards */}
      {viewMode === 'PERSONAL' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Active Request */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Active Request</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight truncate">
              {myActiveRequest ? myActiveRequest.referenceNumber : 'None Active'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {myActiveRequest ? (
                <span className={`font-bold px-2 py-0.5 rounded-md inline-block ${
                  myActiveRequest.status === 'REVISION_REQUIRED'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-slate-50 text-slate-700'
                }`}>
                  ● Status: {myActiveRequest.status.replace(/_/g, ' ')}
                </span>
              ) : (
                'Ready to submit a new equipment request'
              )}
            </div>
          </div>

          {/* Card 2: Past Requests */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Past Requests</span>
              <Laptop className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {myPastRequests.length} Record{myPastRequests.length === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {myApprovedRequests.length} approved under active payroll deductions
            </div>
          </div>

          {/* Card 3: Current Policy Version */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Current Policy Version</span>
              <Check className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
              v1.0-2026
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <span>✓ Legally Enforced & Active</span>
            </div>
          </div>
        </div>
      ) : (
        /* Directory Summary Cards for Higher Privileged Context */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Unique Staff Applicants</span>
              <Users className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {uniqueApplicantsCount} Staff Member{uniqueApplicantsCount === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across {currentUser.role === 'HEAD_TEACHER' ? currentSchool?.name : `${institutions.length} campuses`}
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Awaiting Stage Review</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {directoryPendingCount} Application{directoryPendingCount === 1 ? '' : 's'}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">
              Pending review at your operational clearance level
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-1.5">
              <span>Finalized & Active Units</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {directoryApprovedCount} Provisioned
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Active monthly deductions running in payroll
            </div>
          </div>
        </div>
      )}

      {/* 4. Search and Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={viewMode === 'PERSONAL' ? "Search reference, hardware tier, term..." : "Search applicant, employee number, reference..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-800"
            />
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 text-[11px] font-medium">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_GM_REVIEW">Pending GM</option>
              <option value="PENDING_HR_REVIEW">Pending HR</option>
              <option value="PENDING_IT_SIGNOFF">Pending IT</option>
              <option value="REVISION_REQUIRED">Revision Required</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Tier Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 text-[11px] font-medium">Tier:</span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Hardware</option>
              <option value="LEVEL_1">Level 1 (Standard)</option>
              <option value="LEVEL_2">Level 2 (STEM)</option>
            </select>
          </div>

          {/* Campus Filter for Central Admins */}
          {viewMode === 'DIRECTORY' && (currentUser.role === 'HR_MANAGER' || currentUser.role === 'IT_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
              <span className="text-slate-400 text-[11px] font-medium">Campus:</span>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[130px] truncate"
              >
                <option value="ALL">All Campuses</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name.split(' ')[0]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/60">
          <span>{viewMode === 'PERSONAL' ? 'Personal Applications' : 'Staff Records'}</span>
          <span className="px-2 py-0.5 rounded-lg bg-white font-mono font-bold text-slate-700 shadow-2xs">
            {filteredApplications.length}
          </span>
        </div>
      </div>

      {/* 5. Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <Laptop className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No applications found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {viewMode === 'PERSONAL'
                ? 'You have not submitted any applications matching the selected filters.'
                : 'No staff applications match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 w-8">
                    <input type="checkbox" className="rounded text-slate-600" />
                  </th>
                  <th className="px-5 py-3.5">Reference ID</th>
                  {viewMode === 'DIRECTORY' && <th className="px-5 py-3.5">Applicant (Staff)</th>}
                  {viewMode === 'DIRECTORY' && <th className="px-5 py-3.5">Campus / School</th>}
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5">Hardware Configuration</th>
                  <th className="px-5 py-3.5">Repayment Term</th>
                  <th className="px-5 py-3.5 text-right">Monthly Deduction</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last Event</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const config = LAPTOP_CONFIGS[app.requestedLaptopTier];
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const inst = institutions.find((i) => i.id === app.institutionId);
                  const appTimeline = getTimelineForApplication(app.id);
                  const lastEvent = appTimeline.length > 0 ? appTimeline[appTimeline.length - 1] : null;

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedDrawerApp(app)}
                      className="hover:bg-slate-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-slate-600" />
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 group-hover:text-slate-600 transition-colors">
                        {app.referenceNumber}
                      </td>

                      {/* Leadership Directory: Staff Applicant Column */}
                      {viewMode === 'DIRECTORY' && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700 shrink-0">
                              {(applicant?.fullName || 'ST')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block truncate max-w-[260px]">
                                {applicant?.fullName || 'Staff Applicant'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                {applicant?.employeeNumber || 'EDC-EMP'}
                              </span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Leadership Directory: Campus Column */}
                      {viewMode === 'DIRECTORY' && (
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/80 font-medium text-slate-700 text-[11px]" style={{ borderRadius: 0 }}>
                            {inst?.name || 'Assigned School'}
                          </span>
                        </td>
                      )}

                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                        {new Date(app.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900 block">
                          {app.requestedLaptopTier === 'LEVEL_1' ? 'Level 1: Faculty Standard' : 'Level 2: High Performance'}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[340px]">
                          {config?.specs?.processor || 'Standard Specs'} · {config?.specs?.ram || '16GB RAM'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-700 font-medium">
                        {app.repaymentPeriod === 'ONE_TO_TWO_MONTHS'
                          ? '1–2 Months'
                          : app.repaymentPeriod === 'TWELVE_MONTHS'
                          ? '12 Months'
                          : '24 Months'}
                      </td>

                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-900">
                        ZMW{' '}
                        {(app.deductedMonthlyAmount || app.estimatedMonthlyAmountZmw).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={app.status} size="sm" />
                      </td>

                      <td className="px-5 py-4">
                        {lastEvent ? (
                          <div className="max-w-[240px]">
                            <span className="font-medium text-slate-800 text-[11px] block truncate">
                              {lastEvent.actionType.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              by {lastEvent.actorName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Submitted</span>
                        )}
                      </td>

                      <td
                        className="px-5 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Fast Action Buttons in Leadership Directory */}
                          {viewMode === 'DIRECTORY' && app.status === 'PENDING_GM_REVIEW' && (currentUser.role === 'HEAD_TEACHER' || currentUser.role === 'SUPER_ADMIN') && (
                            <button
                              onClick={() => openModal('ENDORSE_PART2', app.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="Endorse Part 2"
                            >
                              Endorse
                            </button>
                          )}

                          {viewMode === 'DIRECTORY' && app.status === 'PENDING_HR_REVIEW' && (currentUser.role === 'HR_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
                            <button
                              onClick={() => openModal('CLEAR_PART3', app.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="HR Clearance"
                            >
                              Clearance
                            </button>
                          )}

                          {viewMode === 'DIRECTORY' && app.status === 'PENDING_IT_SIGNOFF' && (currentUser.role === 'IT_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
                            <button
                              onClick={() => openModal('SIGNOFF_PART4', app.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="IT Signoff"
                            >
                              Signoff
                            </button>
                          )}

                          {app.status === 'APPROVED' && (
                            <button
                              onClick={() => openModal('PHYSICAL_FORM', app.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Download Sealed PDF Scheme Document"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="hidden sm:inline">PDF</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedDrawerApp(app)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                            title="Open Slide-over Drawer (Logs & Details)"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
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

        {/* 6. Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing {filteredApplications.length === 0 ? 0 : 1}-{filteredApplications.length} of {activeList.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-2.5 py-1 rounded-lg bg-slate-600 text-white font-bold text-xs shadow-xs">
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

      {/* 7. Slide-Over Drawer Detail Panel */}
      {selectedDrawerApp && (
        <ApplicationDetailDrawer
          application={selectedDrawerApp}
          onClose={() => setSelectedDrawerApp(null)}
        />
      )}
    </div>
  );
};
