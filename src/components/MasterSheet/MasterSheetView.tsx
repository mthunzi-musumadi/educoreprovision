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
  Plus,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  ArrowUpDown,
  FileText,
  SlidersHorizontal,
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
import { NewRequestStepper } from '../ApplicantView/NewRequestStepper';

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
  const [showNewModal, setShowNewModal] = useState(false);

  // Pagination state (Matches 1.png)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection checkboxes (Matches 1.png)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sync tab default when switching between Review Queue and Master Sheet in Sidebar
  React.useEffect(() => {
    setAwaitingMyRoleOnly(mode === 'REVIEW_QUEUE');
    setCurrentPage(1);
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

  // Paginated applications slice
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / pageSize));
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

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

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedApps.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedApps.map((a) => a.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Breadcrumb Bar (Matches 1.png) */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <span className="font-mono text-slate-400 font-bold">&lt;&gt;</span>
        <span className="text-slate-700 font-semibold">
          {awaitingMyRoleOnly ? 'Action Required Sign-off Queue' : 'Master Ledger & Workflow Management'}
        </span>
      </div>

      {/* Main Header & Actions (Matches 1.png 'Product Listing' bar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {awaitingMyRoleOnly
              ? 'Sign-off Queue'
              : 'Workflow Master Ledger'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your multi-department applications and approvals.{' '}
            <span className="text-blue-600 font-semibold">
              {filteredApps.length} applications total
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAwaitingMyRoleOnly(true);
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              awaitingMyRoleOnly
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Inbox className="w-4 h-4" />
            My Sign-offs ({metrics.myInboxCount})
          </button>

          <button
            type="button"
            onClick={() => {
              setAwaitingMyRoleOnly(false);
              setCurrentPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              !awaitingMyRoleOnly
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Records ({applications.length})
          </button>

          <button
            type="button"
            onClick={exportToCsv}
            disabled={filteredApps.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>

          <button
            type="button"
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Application
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">My Pending Sign-offs</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.myInboxCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total In Review</span>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.totalInReview}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Approved</span>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.totalApproved}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Rejected</span>
            <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.totalRejected}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Unified Filter & Search Bar (Matches 1.png) */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by reference, staff name, employee #..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 hover:bg-white focus:bg-white focus:border-blue-500 focus:outline-hidden transition"
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value as DepartmentCode | 'ALL');
            setFormFilter('ALL');
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Category: All Departments</option>
          <option value="IT">IT Department</option>
          <option value="HR">HR Department</option>
          <option value="FINANCE">Finance & Stores</option>
          <option value="LOGISTICS">Logistics</option>
        </select>

        <select
          value={formFilter}
          onChange={(e) => {
            setFormFilter(e.target.value as FormCode | 'ALL');
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer max-w-[180px] truncate"
        >
          <option value="ALL">Form: All Forms</option>
          {formDefinitions
            .filter((f) => deptFilter === 'ALL' || f.department === deptFilter)
            .map((f) => (
              <option key={f.code} value={f.code}>
                {f.title}
              </option>
            ))}
        </select>

        <select
          value={schoolFilter}
          onChange={(e) => {
            setSchoolFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer max-w-[180px] truncate"
        >
          <option value="ALL">School: All Institutions</option>
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LifecycleStatus | 'ALL');
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Status: All Statuses</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REVISION_REQUIRED">Revision Required</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed / Withdrawn</option>
        </select>

        {/* Total Badge Box (Matches 1.png 'Total Products 534') */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-slate-50 text-xs font-medium text-slate-700 ml-auto shrink-0">
          <span className="text-slate-500">Total Records:</span>
          <span className="font-bold font-mono text-slate-900">{filteredApps.length}</span>
        </div>
      </div>

      {/* Master Table Card (Matches 1.png) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedApps.length > 0 &&
                      selectedIds.size === paginatedApps.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Reference & Dept</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Form Title</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Applicant & Institution</th>
                <th className="py-3.5 px-4">Pipeline Progress</th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500">
                    <p className="font-semibold text-slate-700">No applications found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try clearing filters or search query above.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app) => {
                  const isMyTurn =
                    app.status === 'IN_REVIEW' &&
                    (currentUser?.role === 'SUPER_ADMIN' ||
                      app.current_approver_role === currentUser?.role);
                  const isSelected = selectedIds.has(app.id);

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`hover:bg-slate-50/70 transition cursor-pointer ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => toggleSelectRow(app.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-blue-600">
                          {app.reference_number}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {app.department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {app.form_title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Submitted {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">
                          {app.applicant_name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {app.applicant_employee_number} · {app.institution_name}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[240px]">
                        <StepperProgress
                          approvals={app.approvals}
                          lifecycleStatus={app.status}
                          currentStepOrder={app.current_step_order}
                          compact
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                            app.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                              : app.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                              : app.status === 'REVISION_REQUIRED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                              : app.status === 'IN_REVIEW'
                              ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                              : 'bg-slate-50 text-slate-700 border-slate-200/60'
                          }`}
                        >
                          {app.status === 'IN_REVIEW'
                            ? `Wait: ${app.current_approver_role?.replace(/_/g, ' ')}`
                            : app.status === 'APPROVED'
                            ? 'Approved'
                            : app.status === 'REJECTED'
                            ? 'Rejected'
                            : app.status === 'REVISION_REQUIRED'
                            ? 'Revision'
                            : app.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isMyTurn
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {isMyTurn ? 'Review & Sign' : 'Inspect'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                            title="More options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modern Pagination Footer (Matches 1.png) */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {filteredApps.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * pageSize, filteredApps.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-800">{filteredApps.length}</span>{' '}
            entries
          </div>

          <div className="flex items-center gap-2">
            {/* Page navigation controls */}
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                // Show first, last, current, and immediate neighbours
                return (
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
                );
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && page - prev > 1;

                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="px-1 text-slate-400">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Page Size Dropdown (Matches 1.png '10 / page') */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 bg-white ml-2 cursor-pointer"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unified Detail & Sign-off Drawer (Matches 2.png) */}
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