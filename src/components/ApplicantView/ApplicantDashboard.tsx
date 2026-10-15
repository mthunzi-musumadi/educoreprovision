import React, { useState, useMemo } from 'react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  WorkflowApplication,
  DepartmentCode,
  LifecycleStatus,
} from '../../types';
import { StepperProgress } from '../common/StepperProgress';
import { NewRequestStepper } from './NewRequestStepper';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';

export const ApplicantDashboard: React.FC = () => {
  const { currentUser, applications, equipmentTiers, institutions } = useAppContext();

  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<WorkflowApplication | null>(null);
  const [deptFilter, setDeptFilter] = useState<DepartmentCode | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter down to the current user's applications (or all visible if testing across roles)
  const myApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesDept = deptFilter === 'ALL' || app.department === deptFilter;
      const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        app.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.form_title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [applications, deptFilter, statusFilter, searchQuery]);

  // KPI counts
  const stats = useMemo(() => {
    return {
      total: applications.length,
      inReview: applications.filter((a) => a.status === 'IN_REVIEW').length,
      actionRequired: applications.filter(
        (a) => a.status === 'REVISION_REQUIRED' || a.status === 'DRAFT'
      ).length,
      approved: applications.filter((a) => a.status === 'APPROVED').length,
    };
  }, [applications]);

  // Generate a human-readable 1-line summary for any of the 14 form payloads
  const formatPayloadSummary = (app: WorkflowApplication): string => {
    const p = app.payload as Record<string, any>;
    switch (app.form_code) {
      case 'ICT_PURCHASE': {
        const tier = equipmentTiers.find((t) => t.id === p.equipment_tier_id);
        return `${tier?.title || 'Laptop'} · ZMW ${Number(
          p.estimated_monthly_amount_zmw || 0
        ).toLocaleString()}/mo`;
      }
      case 'TRAVEL_REQUEST':
        return `Destination: ${p.destination || 'N/A'} (${p.departure_date || ''} →${
          p.return_date || ''
        })`;
      case 'SALARY_ADVANCE':
        return `Requested: ZMW ${Number(p.requested_amount_zmw || 0).toLocaleString()} (${
          p.repayment_months || 1
        } mos)`;
      case 'GRATUITY_ADVANCE':
        return `Gratuity Advance: ZMW ${Number(p.requested_amount_zmw || 0).toLocaleString()}`;
      case 'PROF_DEV':
        return `${p.course_title || 'Course'} · ${p.provider || ''} (ZMW${Number(
          p.cost_zmw || 0
        ).toLocaleString()})`;
      case 'BANK_CHANGE':
        return `${p.bank_name || 'Bank'} · ${p.branch_name || ''} (${p.account_type || 'CURRENT'})`;
      case 'CONTRACT_RENEWAL':
        return `Proposed Tenure: ${p.proposed_tenure_months || 0} Months (Ends${
          p.current_contract_end_date || 'N/A'
        })`;
      case 'CHILD_ADMISSION': {
        const count = Array.isArray(p.children) ? p.children.length : 1;
        return `${count} Child(ren) listed for Admission · Academic Year ${p.academic_year || ''}`;
      }
      case 'EXCULPATORY':
        return `Ref: ${p.charge_reference || 'N/A'} · Incident: ${p.incident_date || 'N/A'}`;
      case 'JOB_DESCRIPTION':
        return `${p.job_title || 'Role'} (${p.department || 'Department'})`;
      case 'MANPOWER_REQ':
        return `${p.position_title || 'Position'} · Headcount: ${p.headcount || 1}`;
      case 'EVENT_COMPLETION':
        return `${p.event_name || 'Event'} · Spend: ZMW ${Number(
          p.actual_spend_zmw || 0
        ).toLocaleString()}`;
      case 'STORES_REQ':
        return `${Array.isArray(p.items) ? p.items.length : 0} Line Item(s) · Cost Center: ${
          p.cost_center || 'N/A'
        }`;
      case 'STOCK_RETURN':
        return `${Array.isArray(p.items) ? p.items.length : 0} Returned Item(s) · ${
          p.return_reason || ''
        }`;
      default:
        return app.form_title;
    }
  };

  const renderStatusPill = (app: WorkflowApplication) => {
    switch (app.status) {
      case 'APPROVED':
        return (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Revision Required
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Awaiting {app.current_approver_role?.replace(/_/g, ' ') || 'Review'}
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
            Withdrawn / Closed
          </span>
        );
      default:
        return (
          <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
    }
  };

  if (showNewModal) {
    return (
      <div className="p-6">
        <NewRequestStepper
          onSuccess={() => setShowNewModal(false)}
          onCancel={() => setShowNewModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Top Breadcrumb Bar (Matches 1.png) */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span className="font-mono text-slate-400 font-bold">&lt;&gt;</span>
        <span className="text-slate-700 font-semibold">Staff Provision &amp; Personal Applications</span>
      </div>

      {/* Top Banner (Matches 1.png) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Staff Provision &amp; Workflow Portal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Logged in as <span className="font-semibold text-slate-700">{currentUser?.full_name}</span> · {currentUser?.institution_name || 'Educore Services'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Application Request
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Applications</span>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">In Review Pipeline</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inReview}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Action / Drafts</span>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.actionRequired}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Approved</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.approved}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Unified Search & Filter Toolbar (Matches 1.png) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, form title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:outline-hidden transition"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value as DepartmentCode | 'ALL')}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Category: All Departments</option>
          <option value="IT">IT</option>
          <option value="HR">Human Resources</option>
          <option value="FINANCE">Finance &amp; Stores</option>
          <option value="LOGISTICS">Logistics</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LifecycleStatus | 'ALL')}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Status: All Statuses</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="REVISION_REQUIRED">Revision Required</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DRAFT">Draft</option>
        </select>

        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs font-medium text-slate-700 ml-auto shrink-0">
          <span className="text-slate-500">Total Applications:</span>
          <span className="font-bold font-mono text-slate-900">{myApplications.length}</span>
        </div>
      </div>

      {/* Applications List */}
      <div className="space-y-3">
        {myApplications.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">No applications found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click "New Application Request" above to submit an IT, HR, Finance, or Logistics form.
            </p>
          </div>
        ) : (
          myApplications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-blue-500 hover:shadow-xs transition cursor-pointer space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {app.department}
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-600">
                      {app.reference_number}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs text-slate-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{app.form_title}</h3>
                  <p className="text-xs text-slate-600">{formatPayloadSummary(app)}</p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-center">
                  {renderStatusPill(app)}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Dynamic Approval Pipeline Bar */}
              <div className="pt-3 border-t border-slate-100">
                <StepperProgress
                  approvals={app.approvals}
                  lifecycleStatus={app.status}
                  currentStepOrder={app.current_step_order}
                  submittedAt={app.applicant_signed_at}
                />
              </div>
            </div>
          ))
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