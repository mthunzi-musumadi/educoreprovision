import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { LAPTOP_CONFIGS } from '../../data/mockData';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { PurchaseApplication } from '../../types';
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
  Search,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export const HRQueueDashboard: React.FC = () => {
  const { institutions, users, getScopedApplications, openModal } = useApp();

  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrawerApp, setSelectedDrawerApp] = useState<PurchaseApplication | null>(null);

  const allApplications = getScopedApplications();

  const filteredApplications = allApplications.filter((app) => {
    const applicant = users.find((u) => u.id === app.applicantId);
    const school = institutions.find((i) => i.id === app.institutionId);

    const matchesSearch =
      app.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (applicant?.employeeNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (school?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSchool = selectedSchoolFilter === 'ALL' || app.institutionId === selectedSchoolFilter;
    const matchesStatus = selectedStatusFilter === 'ALL' || app.status === selectedStatusFilter;

    return matchesSearch && matchesSchool && matchesStatus;
  });

  const pendingHRQueue = allApplications.filter((app) => app.status === 'PENDING_HR_REVIEW');

  return (
    <div className="space-y-6">
      {/* 1. Header (Matching 1.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Central Administration · Global Organization Visibility</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Central HR Review & Debt Clearance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Verify statutory HR criteria, zero salary advance conflicts, and the Educore 33% maximum debt threshold.{' '}
            <span className="text-sky-700 font-semibold">{pendingHRQueue.length} awaiting HR sign-off</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 bg-sky-50 border border-sky-200 rounded-xl text-xs">
            <span className="text-sky-600 block text-[10px] uppercase font-bold tracking-wider">
              Pending Part 3 Triage:
            </span>
            <span className="font-mono font-black text-sky-950 text-sm">
              {pendingHRQueue.length} Request{pendingHRQueue.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Bar Container (Matching 1.png) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff, employee number, reference ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 text-slate-800"
            />
          </div>

          {/* Campus Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
            <span className="text-slate-400 text-[11px] font-medium">Campus:</span>
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Educore Schools</option>
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
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_HR_REVIEW">Pending HR Review</option>
              <option value="PENDING_IT_SIGNOFF">Pending IT Sign-off</option>
              <option value="APPROVED">Approved / Active Deduction</option>
              <option value="REJECTED">Rejected by HR</option>
            </select>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl text-xs font-semibold text-slate-700 border border-slate-200/60">
          <span>Total Applications</span>
          <span className="px-2 py-0.5 rounded-lg bg-white font-mono font-bold text-sky-800 shadow-2xs">
            {filteredApplications.length}
          </span>
        </div>
      </div>

      {/* 3. Applications Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-sky-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No applications found</h3>
            <p className="text-xs text-slate-500 mt-1">
              No applications match your active search or campus filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 w-8">
                    <input type="checkbox" className="rounded text-sky-600" />
                  </th>
                  <th className="px-5 py-3.5">Reference ID</th>
                  <th className="px-5 py-3.5">Staff Recipient</th>
                  <th className="px-5 py-3.5">School / Campus</th>
                  <th className="px-5 py-3.5">Endorsing GM</th>
                  <th className="px-5 py-3.5 text-right">Monthly Deduction</th>
                  <th className="px-5 py-3.5">Current Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((app) => {
                  const applicant = users.find((u) => u.id === app.applicantId);
                  const school = institutions.find((i) => i.id === app.institutionId);
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedDrawerApp(app)}
                      className="hover:bg-sky-50/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 w-8" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-sky-600" />
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                        {app.referenceNumber}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {applicant?.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{applicant?.fullName}</span>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {applicant?.employeeNumber}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-800 border border-slate-200/70 inline-block">
                          {school?.name || 'Educore School'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {app.gmReviewerName ? (
                          <span className="font-medium text-slate-800">
                            {app.gmReviewerName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Pending GM</span>
                        )}
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
                      <td
                        className="px-5 py-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {app.status === 'PENDING_HR_REVIEW' ? (
                            <button
                              onClick={() => openModal('CLEAR_PART3', app.id)}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                            >
                              Clear Part 3
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

        {/* 4. Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing 1-{filteredApplications.length} of {allApplications.length} entries
          </div>

          <div className="flex items-center gap-1">
            <button className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="px-2.5 py-1 rounded-lg bg-sky-600 text-white font-bold text-xs shadow-xs">
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

      {/* 5. Slide-Over Drawer Detail Panel (design_inspiration/2.png) */}
      {selectedDrawerApp && (
        <ApplicationDetailDrawer
          application={selectedDrawerApp}
          onClose={() => setSelectedDrawerApp(null)}
        />
      )}
    </div>
  );
};
