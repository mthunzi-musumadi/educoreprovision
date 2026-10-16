import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronRight,
  Copy,
  RotateCcw,
  X,
  Building2,
  ShieldCheck,
  Download,
  Printer,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  WorkflowApplication,
  DepartmentCode,
  LifecycleStatus,
  ROLE_LABELS,
} from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { StepperProgress } from '../common/StepperProgress';
import { StatusBadge } from '../common/StatusBadge';
import { NewRequestStepper } from './NewRequestStepper';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { DocumentFacsimileModal } from '../DocumentFacsimile/DocumentFacsimileModal';
import { exportApplicationsToCsv } from '../../utils/csvExport';
import { useToast } from '../common/Toast';

export const ApplicantDashboard: React.FC = () => {
  const { currentUser, applications, equipmentTiers, sites } = useAppContext();
  const { showToast } = useToast();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editingApp, setEditingApp] = useState<WorkflowApplication | null>(null);
  const [selectedApp, setSelectedApp] = useState<WorkflowApplication | null>(null);
  const [printModalApp, setPrintModalApp] = useState<WorkflowApplication | null>(null);
  const [deptFilter, setDeptFilter] = useState<DepartmentCode | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'ACTION_REQUIRED' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global "/" shortcut to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Strict Least-Privilege Isolation: "My Applications" ONLY displays applications
  // where the logged-in user is the direct applicant at their assigned Site.
  const personalApplications = useMemo(() => {
    if (!currentUser) return [];
    return applications.filter(
      (app) => app.applicant_id === currentUser.id && app.site_id === currentUser.site_id
    );
  }, [applications, currentUser]);

  const myApplications = useMemo(() => {
    return personalApplications.filter((app) => {
      const matchesDept = deptFilter === 'ALL' || app.department === deptFilter;
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTION_REQUIRED'
          ? app.status === 'REVISION_REQUIRED' || app.status === 'DRAFT'
          : app.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        app.reference_number.toLowerCase().includes(q) ||
        app.form_title.toLowerCase().includes(q) ||
        app.site_name.toLowerCase().includes(q);
      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [personalApplications, deptFilter, statusFilter, searchQuery]);

  // Personal KPI counts
  const stats = useMemo(() => {
    return {
      total: personalApplications.length,
      inReview: personalApplications.filter((a) => a.status === 'IN_REVIEW').length,
      actionRequired: personalApplications.filter(
        (a) => a.status === 'REVISION_REQUIRED' || a.status === 'DRAFT'
      ).length,
      approved: personalApplications.filter((a) => a.status === 'APPROVED').length,
    };
  }, [personalApplications]);

  const hasActiveFilters =
    deptFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setDeptFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
  };

  const copyRefToClipboard = (ref: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    showToast('info', 'Reference Copied', `Copied ${ref} to clipboard`);
  };

  // Generate a human-readable 1-line summary for any of the 18 form payloads
  const formatPayloadSummary = (app: WorkflowApplication): string => {
    try {
      const p = (app.payload || {}) as Record<string, any>;
      switch (app.form_code) {
        case 'ICT_PURCHASE': {
          const tier = equipmentTiers.find((t) => t.id === p.equipment_tier_id);
          return `${tier?.title || 'Standard Laptop Tier'} · ZMW ${Number(
            p.estimated_monthly_amount_zmw || 0
          ).toLocaleString()}/mo (${String(p.repayment_period || '').replace(/_/g, ' ')})`;
        }
        case 'TRAVEL_REQUEST': {
          const paxCount = Array.isArray(p.passengers) ? p.passengers.length : 1;
          return `Site: ${p.site || app.site_name} · ${p.reason_for_travel || 'Official Travel'} · ${paxCount} Passenger(s) (${p.flight_booking_type || 'CONTRACT'})`;
        }
        case 'SALARY_ADVANCE':
          return `Requested: ZMW ${Number(
            p.requested_amount_zmw || p.amount_requested_zmw || 0
          ).toLocaleString()} · ${p.repayment_months || 1} Month(s) Repayment`;
        case 'GRATUITY_ADVANCE':
          return `Gratuity Advance: ZMW ${Number(
            p.requested_amount_zmw || p.amount_requested_zmw || 0
          ).toLocaleString()} · Accrued: ${p.accrued_months || 0} Months`;
        case 'PROF_DEV':
          return `${p.course_title || p.description || 'Professional Course'} · ${
            p.provider || p.training_provider_location || ''
          } (ZMW ${Number(p.cost_zmw || p.total_costs_zmw || 0).toLocaleString()})`;
        case 'BANK_CHANGE':
          return `${p.bank_name || p.zmw_bank_name || 'Bank Update'} · Branch: ${
            p.branch_name || p.zmw_branch_name || 'N/A'
          } (${p.account_type || p.transfer_type || 'CURRENT'})`;
        case 'CONTRACT_RENEWAL':
          return `Proposed Tenure: ${p.proposed_tenure_months || 24} Months · Current Ends: ${
            p.current_contract_end_date || p.contract_end_date || 'N/A'
          }`;
        case 'CHILD_ADMISSION': {
          const count = Array.isArray(p.children) ? p.children.length : 1;
          const firstSite =
            Array.isArray(p.children) && p.children[0]?.target_site_id
              ? sites.find((s) => s.id === p.children[0].target_site_id)?.name
              : undefined;
          return `${count} Child(ren) · Academic Year ${p.academic_year || '2026'}${
            firstSite ? ` · Target Site: ${firstSite}` : ''
          }`;
        }
        case 'EXCULPATORY':
          return `Charge Ref: ${p.charge_reference || 'N/A'} · Incident Date: ${
            p.incident_date || p.date_of_charge || 'N/A'
          }`;
        case 'JOB_DESCRIPTION':
          return `${p.job_title || p.position || 'Role Specification'} · Department: ${
            p.department || p.location || 'N/A'
          }`;
        case 'MANPOWER_REQ':
          return `${p.position_title || p.position_requested || 'Position'} · Headcount: ${
            p.headcount || p.number_of_staff_required || 1
          }`;
        case 'EVENT_COMPLETION':
          return `${p.event_name || 'Site Event'} · Site(s): ${
            p.sites || p.schools || app.site_name
          } · Date: ${p.event_date || 'N/A'}`;
        case 'STORES_REQ':
          return `${Array.isArray(p.items) ? p.items.length : 0} Line Item(s) · Department/Site: ${
            p.department || app.site_name
          } · ${p.purpose || ''}`;
        case 'STOCK_RETURN':
          return `${Array.isArray(p.items) ? p.items.length : 0} Returned Item(s) · Site Location: ${
            p.location || app.site_name
          }`;
        case 'EXPENSE_RETIREMENT':
          return `${p.requisition_type || 'IMPREST'} Retirement · Cost Centre: ${
            p.cost_centre || 'N/A'
          } · Retired: ${p.currency || 'ZMW'} ${Number(p.total_retired || 0).toLocaleString()}`;
        case 'PURCHASE_REQ':
          return `${Array.isArray(p.items) ? p.items.length : 0} Item(s) · Cost Centre: ${
            p.cost_centre || 'N/A'
          } · Total: ${p.currency || 'ZMW'} ${Number(p.total_cost || 0).toLocaleString()}`;
        case 'DISCIPLINARY_CHARGE':
          return `Accused: ${p.accused_name || 'N/A'} · Site: ${
            p.charging_site || p.charging_school || app.site_name
          } · Offence: ${p.nature_of_offence || 'N/A'}`;
        case 'EDU_HEALTH_CLAIM':
          return `Patient: ${p.patient_first_name || ''} ${p.patient_surname || ''} · Facility: ${
            p.hospital_name || 'N/A'
          } · ZMW ${Number(p.total_claim_amount || 0).toLocaleString()}`;
        default:
          return app.form_title;
      }
    } catch {
      return app.form_title;
    }
  };

  if (showNewModal) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <NewRequestStepper
          editApplication={editingApp}
          onSuccess={() => {
            setShowNewModal(false);
            setEditingApp(null);
          }}
          onCancel={() => {
            setShowNewModal(false);
            setEditingApp(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      {/* Workspace Header */}
      <div className="corporate-card rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              My Requests &amp; Requisitions
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
              <Building2 className="w-3 h-3 text-slate-500" />
              {currentUser?.site_name || 'Assigned Site'} ({currentUser?.site_code || 'SITE'})
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Submit, track, and manage all your statutory requisitions and advances across Educore schools.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              if (myApplications.length === 0) {
                showToast('info', 'No Records to Export', 'There are no requisition records to export.');
                return;
              }
              const dateStr = new Date().toISOString().slice(0, 10);
              const result = exportApplicationsToCsv(
                myApplications,
                `my_requisitions_${dateStr}.csv`
              );
              if (result.success) {
                showToast('success', 'CSV Export Complete', `Successfully exported ${result.count} requisition record(s) to CSV.`);
              } else {
                showToast('error', 'Export Failed', result.error || 'Failed to export CSV.');
              }
            }}
            disabled={myApplications.length === 0}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>New Requisition</span>
          </motion.button>
        </div>
      </div>

      {/* Interactive KPI Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setStatusFilter('ALL')}
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              My Submissions
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-slate-900">{stats.total}</p>
          </div>
          <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200/80">
            <FileText className="w-4 h-4" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')
          }
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'IN_REVIEW'
              ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              In Review
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-blue-700">
              {stats.inReview}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/80">
            <Clock className="w-4 h-4" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setStatusFilter(
              statusFilter === 'ACTION_REQUIRED' ? 'ALL' : 'ACTION_REQUIRED'
            )
          }
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'ACTION_REQUIRED'
              ? 'bg-amber-50/40 border-amber-600 ring-1 ring-amber-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Revision / Drafts
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-amber-700">
              {stats.actionRequired}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/80">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')
          }
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50/40 border-emerald-600 ring-1 ring-emerald-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Approved
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-700">
              {stats.approved}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* Unified Search & Filter Toolbar */}
      <div className="corporate-card p-2.5 rounded-lg flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            aria-label="Search my applications by reference or form title"
            placeholder="Search by reference number or form title... (Press / to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-14 py-1.5 border border-slate-200 rounded-md text-xs bg-slate-50/70 hover:bg-white focus:bg-white focus:border-blue-600 focus:outline-hidden transition"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                /
              </kbd>
            )}
          </div>
        </div>

        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value as DepartmentCode | 'ALL')}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Department: All</option>
          <option value="IT">ICT Infrastructure</option>
          <option value="HR">Human Resources</option>
          <option value="FINANCE">Finance &amp; Stores</option>
          <option value="LOGISTICS">Logistics &amp; Fleet</option>
        </select>

        <select
          aria-label="Filter by lifecycle status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value as LifecycleStatus | 'ACTION_REQUIRED' | 'ALL'
            )
          }
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Status: All</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="ACTION_REQUIRED">Action Required / Draft</option>
          <option value="REVISION_REQUIRED">Revision Required</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DRAFT">Draft</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            title="Reset active filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 border border-slate-200 rounded-md px-2.5 py-1 bg-slate-50 text-xs font-medium text-slate-700 ml-auto shrink-0">
          <span className="text-slate-500">Showing:</span>
          <span className="font-bold font-mono tabular-nums text-slate-900">
            {myApplications.length} of {personalApplications.length}
          </span>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {myApplications.length === 0 ? (
          <div className="corporate-card rounded-xl p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto border border-slate-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {hasActiveFilters
                  ? 'No matching personal applications'
                  : 'No personal applications submitted yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                {hasActiveFilters
                  ? 'No personal applications match your active search or status filters.'
                  : `You have not initiated any personal applications under ${currentUser?.full_name} at ${currentUser?.site_name}. Click "New Application Request" to submit any of the 18 statutory forms.`}
              </p>
            </div>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Start New Application</span>
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {myApplications.map((app) => {
              const needsRevision = app.status === 'REVISION_REQUIRED';
              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedApp(app)}
                  className={`corporate-card-interactive rounded-lg p-4 cursor-pointer space-y-3 group ${
                    needsRevision ? 'border-l-3 border-l-amber-500' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {app.department}
                        </span>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.92 }}
                          onClick={(e) => copyRefToClipboard(app.reference_number, e)}
                          className="font-mono text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition cursor-pointer"
                          title="Copy reference number"
                        >
                          <span>{app.reference_number}</span>
                          <Copy className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                        </motion.button>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-600 font-medium">
                          {app.site_name}
                        </span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-500 tabular-nums">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                        {app.form_title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {formatPayloadSummary(app)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {(needsRevision || app.status === 'DRAFT') && (
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingApp(app);
                            setShowNewModal(true);
                          }}
                          className="px-2 py-0.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200 transition flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          {needsRevision ? 'Edit & Resubmit' : 'Resume Draft'}
                        </motion.button>
                      )}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintModalApp(app);
                        }}
                        title="Print / Save Official PDF"
                        className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </motion.button>
                      <StatusBadge
                        status={app.status}
                        customLabel={
                          app.status === 'IN_REVIEW'
                            ? `Awaiting: ${
                                app.current_approver_role
                                  ? ROLE_LABELS[app.current_approver_role]
                                  : 'Review'
                              }`
                            : undefined
                        }
                      />
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition" />
                    </div>
                  </div>

                  {/* Approval Pipeline Stepper */}
                  <div className="border-t border-slate-100 bg-slate-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-lg">
                    <StepperProgress
                      approvals={app.approvals}
                      lifecycleStatus={app.status}
                      currentStepOrder={app.current_step_order}
                      submittedAt={app.applicant_signed_at}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Unified Detail & Review Drawer */}
      <AnimatePresence>
        {selectedApp && (
          <ApplicationDetailDrawer
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            onEdit={(app) => {
              setSelectedApp(null);
              setEditingApp(app);
              setShowNewModal(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Official Document Facsimile / Print PDF Modal */}
      <AnimatePresence>
        {printModalApp && (
          <DocumentFacsimileModal
            application={printModalApp}
            onClose={() => setPrintModalApp(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ApplicantDashboard;