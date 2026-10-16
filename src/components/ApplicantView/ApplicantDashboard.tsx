import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  WorkflowApplication,
  DepartmentCode,
  LifecycleStatus,
  ROLE_LABELS,
} from '../../types';
import { StepperProgress } from '../common/StepperProgress';
import { StatusBadge } from '../common/StatusBadge';
import { NewRequestStepper } from './NewRequestStepper';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { useToast } from '../common/Toast';

export const ApplicantDashboard: React.FC = () => {
  const { currentUser, applications, equipmentTiers, sites } = useAppContext();
  const { showToast } = useToast();

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<WorkflowApplication | null>(null);
  const [deptFilter, setDeptFilter] = useState<DepartmentCode | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'ACTION_REQUIRED' | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  if (showNewModal) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        <NewRequestStepper
          onSuccess={() => setShowNewModal(false)}
          onCancel={() => setShowNewModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      {/* Executive Workspace Header */}
      <div className="corporate-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              My Personal Applications
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
              <Building2 className="w-3 h-3 text-slate-500" />
              {currentUser?.site_name || 'Assigned Site'} ({currentUser?.site_code || 'SITE'})
            </span>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Bound strictly to requests initiated by{' '}
              <strong className="text-slate-700">{currentUser?.full_name}</strong> (
              {currentUser?.employee_number}) at{' '}
              <strong className="text-slate-700">{currentUser?.site_name}</strong>.
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-sky-400" />
          <span>New Application Request</span>
        </button>
      </div>

      {/* Interactive KPI Filter Cards (Fitts's Law & Jakob's Law: Click card to filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`text-left p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span
              className={`text-xs font-medium ${
                statusFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'
              }`}
            >
              My Total Submissions
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1">{stats.total}</p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-sky-400'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <FileText className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')
          }
          className={`text-left p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'IN_REVIEW'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div>
            <span
              className={`text-xs font-medium ${
                statusFilter === 'IN_REVIEW' ? 'text-amber-100' : 'text-slate-500'
              }`}
            >
              In Approval Pipeline
            </span>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                statusFilter === 'IN_REVIEW' ? 'text-white' : 'text-amber-600'
              }`}
            >
              {stats.inReview}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              statusFilter === 'IN_REVIEW'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(
              statusFilter === 'ACTION_REQUIRED' ? 'ALL' : 'ACTION_REQUIRED'
            )
          }
          className={`text-left p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'ACTION_REQUIRED'
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-orange-300 shadow-2xs'
          }`}
        >
          <div>
            <span
              className={`text-xs font-medium ${
                statusFilter === 'ACTION_REQUIRED'
                  ? 'text-orange-100'
                  : 'text-slate-500'
              }`}
            >
              Revision / Drafts
            </span>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                statusFilter === 'ACTION_REQUIRED' ? 'text-white' : 'text-orange-600'
              }`}
            >
              {stats.actionRequired}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              statusFilter === 'ACTION_REQUIRED'
                ? 'bg-orange-700 text-white'
                : 'bg-orange-50 text-orange-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')
          }
          className={`text-left p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-900 border-slate-200/90 hover:border-emerald-300 shadow-2xs'
          }`}
        >
          <div>
            <span
              className={`text-xs font-medium ${
                statusFilter === 'APPROVED' ? 'text-emerald-100' : 'text-slate-500'
              }`}
            >
              Finalized &amp; Approved
            </span>
            <p
              className={`text-2xl font-bold tabular-nums mt-1 ${
                statusFilter === 'APPROVED' ? 'text-white' : 'text-emerald-600'
              }`}
            >
              {stats.approved}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* Unified Search & Filter Toolbar */}
      <div className="corporate-card p-3 rounded-xl flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search my applications by reference or form title"
            placeholder="Search my applications by reference or form title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/70 hover:bg-white focus:bg-white focus:border-sky-600 focus:outline-hidden transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value as DepartmentCode | 'ALL')}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
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
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
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
            className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            title="Reset active filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-xs font-medium text-slate-700 ml-auto shrink-0">
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
          myApplications.map((app) => {
            const needsRevision = app.status === 'REVISION_REQUIRED';
            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`corporate-card-interactive rounded-xl p-5 cursor-pointer space-y-4 group ${
                  needsRevision ? 'border-l-4 border-l-orange-500' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {app.department}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => copyRefToClipboard(app.reference_number, e)}
                        className="font-mono text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition cursor-pointer"
                        title="Copy reference number"
                      >
                        <span>{app.reference_number}</span>
                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-sky-600" />
                      </button>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {app.site_name}
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition">
                      {app.form_title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {formatPayloadSummary(app)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
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
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>

                {/* Dynamic Approval Pipeline Bar (Zeigarnik Effect) */}
                <div className="border-t border-slate-100 bg-slate-50/70 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                  <StepperProgress
                    approvals={app.approvals}
                    lifecycleStatus={app.status}
                    currentStepOrder={app.current_step_order}
                    submittedAt={app.applicant_signed_at}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Unified Detail & Review Drawer */}
      {selectedApp && (
        <ApplicationDetailDrawer
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </div>
  );
};

export default ApplicantDashboard;