import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Eye,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  WorkflowApplication,
  DepartmentCode,
  LifecycleStatus,
  FormCode,
} from '../../types';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { StepperProgress } from '../common/StepperProgress';

interface MasterSheetViewProps {
  mode?: 'REVIEW_QUEUE' | 'MASTER_SHEET';
}

export const MasterSheetView: React.FC<MasterSheetViewProps> = ({
  mode = 'MASTER_SHEET',
}) => {
  const { currentUser, applications, formDefinitions, institutions } =
    useAppContext();

  const [awaitingMyRoleOnly, setAwaitingMyRoleOnly] = useState<boolean>(
    mode === 'REVIEW_QUEUE'
  );
  const [deptFilter, setDeptFilter] = useState<DepartmentCode | 'ALL'>('ALL');
  const [formFilter, setFormFilter] = useState<FormCode | 'ALL'>('ALL');
  const [schoolFilter, setSchoolFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'ALL'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<WorkflowApplication | null>(
    null
  );

  // Sync tab default when switching between Review Queue and Master Sheet in Sidebar
  React.useEffect(() => {
    setAwaitingMyRoleOnly(mode === 'REVIEW_QUEUE');
  }, [mode]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      if (awaitingMyRoleOnly) {
        if (app.status !== 'IN_REVIEW') return false;
        if (
          currentUser?.role !== 'SUPER_ADMIN' &&
          app.current_approver_role !== currentUser?.role
        ) {
          return false;
        }
        if (
          currentUser &&
          ['HEAD_TEACHER', 'LINE_MANAGER'].includes(currentUser.role) &&
          app.institution_id !== currentUser.institution_id
        ) {
          return false;
        }
      }

      if (deptFilter !== 'ALL' && app.department !== deptFilter) return false;
      if (formFilter !== 'ALL' && app.form_code !== formFilter) return false;
      if (schoolFilter !== 'ALL' && app.institution_id !== schoolFilter)
        return false;
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRef = app.reference_number.toLowerCase().includes(q);
        const matchName = app.applicant_name.toLowerCase().includes(q);
        const matchEmp = app.applicant_employee_number.toLowerCase().includes(q);
        const matchTitle = app.form_title.toLowerCase().includes(q);
        if (!matchRef && !matchName && !matchEmp && !matchTitle) return false;
      }

      return true;
    });
  }, [
    applications,
    awaitingMyRoleOnly,
    currentUser,
    deptFilter,
    formFilter,
    schoolFilter,
    statusFilter,
    searchQuery,
  ]);

  // Quick KPI metrics for the current view
  const metrics = useMemo(() => {
    const myInboxCount = applications.filter(
      (a) =>
        a.status === 'IN_REVIEW' &&
        (currentUser?.role === 'SUPER_ADMIN' ||
          a.current_approver_role === currentUser?.role)
    ).length;

    return {
      myInboxCount,
      totalInReview: applications.filter((a) => a.status === 'IN_REVIEW').length,
      totalApproved: applications.filter((a) => a.status === 'APPROVED').length,
      totalRejected: applications.filter((a) => a.status === 'REJECTED').length,
    };
  }, [applications, currentUser]);

  const exportToCsv = () => {
    if (filteredApps.length === 0) return;

    const headers = [
      'Reference',
      'Department',
      'Form Title',
      'Applicant Name',
      'Employee #',
      'Institution',
      'Status',
      'Current Step Role',
      'Submitted Date',
      'Payload Summary (JSON)',
    ];

    const rows = filteredApps.map((a) => [
      a.reference_number,
      a.department,
      `"${a.form_title.replace(/"/g, '""')}"`,
      `"${a.applicant_name.replace(/"/g, '""')}"`,
      a.applicant_employee_number,
      `"${a.institution_name.replace(/"/g, '""')}"`,
      a.status,
      a.current_approver_role || 'NONE',
      new Date(a.created_at).toISOString().split('T')[0],
      `"${JSON.stringify(a.payload).replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `educore_workflows_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            {currentUser?.role.replace(/_/g, ' ')} WORKSPACE
          </span>
          <h1 className="text-2xl font-bold text-slate-900">
            {awaitingMyRoleOnly
              ? 'Action Required: Sign-off Queue'
              : 'Organization Master Workflow Ledger'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAwaitingMyRoleOnly(true)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              awaitingMyRoleOnly
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Awaiting My Sign-off ({metrics.myInboxCount})
          </button>
          <button
            type="button"
            onClick={() => setAwaitingMyRoleOnly(false)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              !awaitingMyRoleOnly
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Visible Records ({applications.length})
          </button>
          <button
            type="button"
            onClick={exportToCsv}
            disabled={filteredApps.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">My Pending Sign-offs</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.myInboxCount}</p>
          </div>
          <Inbox className="w-7 h-7 text-blue-500" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total In Review</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.totalInReview}</p>
          </div>
          <Clock className="w-7 h-7 text-amber-500" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Approved</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.totalApproved}</p>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Rejected</span>
            <p className="text-2xl font-bold text-red-600 mt-1">{metrics.totalRejected}</p>
          </div>
          <XCircle className="w-7 h-7 text-red-500" />
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search ref, staff name, emp #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value as DepartmentCode | 'ALL');
            setFormFilter('ALL');
          }}
          className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Departments (IT/HR/FIN/LOG)</option>
          <option value="IT">IT Department</option>
          <option value="HR">HR Department</option>
          <option value="FINANCE">Finance & Stores</option>
          <option value="LOGISTICS">Logistics</option>
        </select>

        <select
          value={formFilter}
          onChange={(e) => setFormFilter(e.target.value as FormCode | 'ALL')}
          className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All 14 Form Types</option>
          {formDefinitions
            .filter((f) => deptFilter === 'ALL' || f.department === deptFilter)
            .map((f) => (
              <option key={f.code} value={f.code}>
                {f.title} ({f.ref_prefix})
              </option>
            ))}
        </select>

        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Institutions / Schools</option>
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as LifecycleStatus | 'ALL')
          }
          className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700"
        >
          <option value="ALL">All Lifecycle Statuses</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REVISION_REQUIRED">Revision Required</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed / Withdrawn</option>
        </select>
      </div>

      {/* Master Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500">
                <th className="py-3.5 px-4">Reference & Dept</th>
                <th className="py-3.5 px-4">Form Type</th>
                <th className="py-3.5 px-4">Applicant & School</th>
                <th className="py-3.5 px-4">Pipeline Progress</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching workflow applications found.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isMyTurn =
                    app.status === 'IN_REVIEW' &&
                    (currentUser?.role === 'SUPER_ADMIN' ||
                      app.current_approver_role === currentUser?.role);

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="hover:bg-slate-50/80 transition cursor-pointer"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-600">
                          {app.reference_number}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {app.department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {app.form_title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Submitted {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">
                          {app.applicant_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {app.applicant_employee_number} · {app.institution_name}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[260px]">
                        <StepperProgress
                          approvals={app.approvals}
                          lifecycleStatus={app.status}
                          currentStepOrder={app.current_step_order}
                          compact
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : app.status === 'REVISION_REQUIRED'
                              ? 'bg-orange-100 text-orange-800'
                              : app.status === 'IN_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {app.status === 'IN_REVIEW'
                            ? `Wait: ${app.current_approver_role?.replace(/_/g, ' ')}`
                            : app.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApp(app);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            isMyTurn
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isMyTurn ? 'Review & Sign' : 'Inspect'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Detail & Sign-off Drawer */}
      {selectedApp && (
        <ApplicationDetailDrawer
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
        />
      )}
    </div>
  );
};

export default MasterSheetView;