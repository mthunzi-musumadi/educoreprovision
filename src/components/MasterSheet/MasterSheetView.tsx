import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  X,
  RotateCcw,
  CheckSquare,
  Building2,
  ShieldCheck,
  Lock,
  Printer,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import {
  WorkflowApplication,
  DepartmentCode,
  LifecycleStatus,
  FormCode,
  ROLE_LABELS,
  isUserInvolvedInApplication,
  isAwaitingUserSignOff,
} from '../../types';
import { ApplicationDetailDrawer } from '../ApplicationDetailDrawer';
import { StepperProgress } from '../common/StepperProgress';
import { StatusBadge } from '../common/StatusBadge';
import { NewRequestStepper } from '../ApplicantView/NewRequestStepper';
import { DocumentFacsimileModal } from '../DocumentFacsimile/DocumentFacsimileModal';
import { exportApplicationsToCsv } from '../../utils/csvExport';
import { useToast } from '../common/Toast';
import { motion, AnimatePresence } from 'motion/react';

interface MasterSheetViewProps {
  mode?: 'REVIEW_QUEUE' | 'MASTER_SHEET';
}

type SortField = 'reference' | 'title' | 'applicant' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

export const MasterSheetView: React.FC<MasterSheetViewProps> = ({
  mode = 'MASTER_SHEET',
}) => {
  const { currentUser, applications, formDefinitions, sites } = useAppContext();
  const { showToast } = useToast();

  const [awaitingMyRoleOnly, setAwaitingMyRoleOnly] = useState<boolean>(
    mode === 'REVIEW_QUEUE'
  );
  const [deptFilter, setDeptFilter] = useState<DepartmentCode | 'ALL'>('ALL');
  const [formFilter, setFormFilter] = useState<FormCode | 'ALL'>('ALL');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<LifecycleStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<WorkflowApplication | null>(null);
  const [printModalApp, setPrintModalApp] = useState<WorkflowApplication | null>(null);
  const [editingApp, setEditingApp] = useState<WorkflowApplication | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Row selection checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isCentralUser = currentUser?.site_code === 'CENTRAL';

  // Global "/" shortcut to focus search
  React.useEffect(() => {
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

  // Sync tab default when switching between Review Queue and Master Sheet in Sidebar
  React.useEffect(() => {
    setAwaitingMyRoleOnly(mode === 'REVIEW_QUEUE');
    setStatusFilter('ALL');
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [mode]);

  // 1. Strict Least-Privilege & Site-Bound Baseline:
  //    Users ONLY see applications that directly involve them and respect their Site boundary.
  const involvedApplications = useMemo(() => {
    if (!currentUser) return [];
    return applications.filter((app) =>
      isUserInvolvedInApplication(app, currentUser)
    );
  }, [applications, currentUser]);

  // 2. Role-Scoped Forms & Departments (Access-Control Scoping):
  //    Only show forms in the filter dropdown where this user's role is actually in the pipeline
  //    (or where they have an involved application, or all forms for Central SUPER_ADMIN).
  const permittedForms = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'SUPER_ADMIN' && isCentralUser) {
      return formDefinitions;
    }
    return formDefinitions.filter(
      (f) =>
        f.workflow_pipeline.some((step) => step.role === currentUser.role) ||
        involvedApplications.some((app) => app.form_code === f.code)
    );
  }, [formDefinitions, currentUser, isCentralUser, involvedApplications]);

  const permittedDepartments = useMemo(() => {
    const set = new Set<DepartmentCode>(permittedForms.map((f) => f.department));
    return Array.from(set);
  }, [permittedForms]);

  const hasActiveFilters =
    deptFilter !== 'ALL' ||
    formFilter !== 'ALL' ||
    (isCentralUser && siteFilter !== 'ALL') ||
    statusFilter !== 'ALL' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setDeptFilter('ALL');
    setFormFilter('ALL');
    setSiteFilter('ALL');
    setStatusFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredApps = useMemo(() => {
    const list = involvedApplications.filter((app) => {
      if (awaitingMyRoleOnly && !isAwaitingUserSignOff(app, currentUser)) {
        return false;
      }

      // Non-central users are strictly locked to their assigned site
      if (!isCentralUser && currentUser && app.site_id !== currentUser.site_id) {
        return false;
      }

      if (deptFilter !== 'ALL' && app.department !== deptFilter) return false;
      if (formFilter !== 'ALL' && app.form_code !== formFilter) return false;
      if (isCentralUser && siteFilter !== 'ALL' && app.site_id !== siteFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRef = app.reference_number.toLowerCase().includes(q);
        const matchName = app.applicant_name.toLowerCase().includes(q);
        const matchEmp = app.applicant_employee_number.toLowerCase().includes(q);
        const matchTitle = app.form_title.toLowerCase().includes(q);
        const matchSite = app.site_name.toLowerCase().includes(q);
        if (!matchRef && !matchName && !matchEmp && !matchTitle && !matchSite) {
          return false;
        }
      }

      return true;
    });

    return list.sort((a, b) => {
      // In Sign-off Queue or Ledger, prioritize items awaiting user's immediate sign-off when sorting by date
      let comparison = 0;
      switch (sortField) {
        case 'reference':
          comparison = a.reference_number.localeCompare(b.reference_number);
          break;
        case 'title':
          comparison = a.form_title.localeCompare(b.form_title);
          break;
        case 'applicant':
          comparison = a.applicant_name.localeCompare(b.applicant_name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'date':
        default:
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    involvedApplications,
    awaitingMyRoleOnly,
    currentUser,
    isCentralUser,
    deptFilter,
    formFilter,
    siteFilter,
    statusFilter,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  // Paginated applications slice
  const totalPages = Math.max(1, Math.ceil(filteredApps.length / pageSize));
  const paginatedApps = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredApps.slice(start, start + pageSize);
  }, [filteredApps, currentPage, pageSize]);

  // Strict Involved KPI metrics
  const metrics = useMemo(() => {
    const myInboxCount = involvedApplications.filter((a) =>
      isAwaitingUserSignOff(a, currentUser)
    ).length;

    return {
      myInboxCount,
      totalInvolved: involvedApplications.length,
      totalInReview: involvedApplications.filter((a) => a.status === 'IN_REVIEW')
        .length,
      totalApproved: involvedApplications.filter((a) => a.status === 'APPROVED')
        .length,
      totalRejected: involvedApplications.filter((a) => a.status === 'REJECTED')
        .length,
    };
  }, [involvedApplications, currentUser]);

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedApps.length && paginatedApps.length > 0) {
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

  const exportSelectedOrAllToCsv = (onlySelected: boolean = false) => {
    const targetApps = onlySelected
      ? involvedApplications.filter((a) => selectedIds.has(a.id))
      : filteredApps;

    if (targetApps.length === 0) {
      showToast('info', 'No Records to Export', 'There are no application records to export.');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `educore_site_workflow_export_${dateStr}.csv`;
    const result = exportApplicationsToCsv(targetApps, filename);

    if (result.success) {
      showToast(
        'success',
        'CSV Export Complete',
        `Successfully exported ${result.count} involved application record(s) to CSV.`
      );
    } else {
      showToast('error', 'Export Failed', result.error || 'Failed to generate CSV export.');
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
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Workspace Header */}
      <div className="corporate-card rounded-lg p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              {awaitingMyRoleOnly
                ? 'Pending Approvals'
                : 'Workflow Records & Ledger'}
            </h1>
            {currentUser && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200">
                <Building2 className="w-3 h-3 text-slate-500" />
                <span>
                  Site: {currentUser.site_name} ({currentUser.site_code || 'SITE'})
                </span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Displaying{' '}
            <strong className="text-slate-800 tabular-nums">
              {involvedApplications.length}
            </strong>{' '}
            record(s) involving{' '}
            <strong className="text-slate-800">
              {currentUser ? ROLE_LABELS[currentUser.role] : 'your role'}
            </strong>{' '}
            {isCentralUser
              ? 'across Central administrative workflows.'
              : `at ${currentUser?.site_name}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 rounded-md bg-slate-100 border border-slate-200 relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setAwaitingMyRoleOnly(true);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer relative z-0 transition-colors ${
                awaitingMyRoleOnly
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {awaitingMyRoleOnly && (
                <motion.div
                  layoutId="masterSheetTabPill"
                  className="absolute inset-0 bg-white rounded-sm -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Inbox className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Review ({metrics.myInboxCount})</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setAwaitingMyRoleOnly(false);
                setCurrentPage(1);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-semibold cursor-pointer relative z-0 transition-colors ${
                !awaitingMyRoleOnly
                  ? 'text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {!awaitingMyRoleOnly && (
                <motion.div
                  layoutId="masterSheetTabPill"
                  className="absolute inset-0 bg-white rounded-sm -z-10 shadow-xs"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span>All Records ({metrics.totalInvolved})</span>
            </motion.button>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => exportSelectedOrAllToCsv(false)}
            disabled={filteredApps.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>New Application</span>
          </motion.button>
        </div>
      </div>

      {/* Interactive KPI Filter Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setAwaitingMyRoleOnly(true);
            setStatusFilter('ALL');
            setCurrentPage(1);
          }}
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            awaitingMyRoleOnly
              ? 'bg-amber-50/40 border-amber-600 ring-1 ring-amber-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Awaiting My Sign-off
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-amber-700">
              {metrics.myInboxCount}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/80">
            <Inbox className="w-4 h-4" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setAwaitingMyRoleOnly(false);
            setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW');
            setCurrentPage(1);
          }}
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            !awaitingMyRoleOnly && statusFilter === 'IN_REVIEW'
              ? 'bg-blue-50/40 border-blue-600 ring-1 ring-blue-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              In Review
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-blue-700">
              {metrics.totalInReview}
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
          onClick={() => {
            setAwaitingMyRoleOnly(false);
            setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED');
            setCurrentPage(1);
          }}
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            !awaitingMyRoleOnly && statusFilter === 'APPROVED'
              ? 'bg-emerald-50/40 border-emerald-600 ring-1 ring-emerald-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Approved
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-emerald-700">
              {metrics.totalApproved}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/80">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </motion.button>

        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setAwaitingMyRoleOnly(false);
            setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED');
            setCurrentPage(1);
          }}
          className={`text-left p-4 rounded-lg border transition cursor-pointer flex items-center justify-between ${
            !awaitingMyRoleOnly && statusFilter === 'REJECTED'
              ? 'bg-rose-50/40 border-rose-600 ring-1 ring-rose-600/30 text-slate-900 shadow-sm'
              : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div>
            <span className="text-xs font-medium text-slate-500">
              Rejected
            </span>
            <p className="text-2xl font-bold tabular-nums mt-1 text-rose-700">
              {metrics.totalRejected}
            </p>
          </div>
          <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200/80">
            <XCircle className="w-4 h-4" />
          </div>
        </motion.button>
      </div>

      {/* Filter & Search Bar */}
      <div className="corporate-card p-2.5 rounded-lg flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            aria-label="Search involved applications"
            placeholder="Search by reference, applicant, employee #, or form... (Press / to focus)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
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

        {/* Department Filter (Only shows departments involving this role) */}
        <select
          aria-label="Filter by department"
          value={deptFilter}
          onChange={(e) => {
            setDeptFilter(e.target.value as DepartmentCode | 'ALL');
            setFormFilter('ALL');
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">
            Department: All Involved ({permittedDepartments.length})
          </option>
          {permittedDepartments.includes('IT') && (
            <option value="IT">ICT Infrastructure</option>
          )}
          {permittedDepartments.includes('HR') && (
            <option value="HR">Human Resources</option>
          )}
          {permittedDepartments.includes('FINANCE') && (
            <option value="FINANCE">Finance &amp; Stores</option>
          )}
          {permittedDepartments.includes('LOGISTICS') && (
            <option value="LOGISTICS">Logistics &amp; Fleet</option>
          )}
        </select>

        {/* Form Filter (Only shows forms involving this role) */}
        <select
          aria-label="Filter by form"
          value={formFilter}
          onChange={(e) => {
            setFormFilter(e.target.value as FormCode | 'ALL');
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer max-w-[200px] truncate"
        >
          <option value="ALL">Form: All Involved ({permittedForms.length})</option>
          {permittedForms
            .filter((f) => deptFilter === 'ALL' || f.department === deptFilter)
            .map((f) => (
              <option key={f.code} value={f.code}>
                {f.title}
              </option>
            ))}
        </select>

        {/* Site Filter: Locked for Site-Bound Roles, Selectable for Central Roles */}
        {isCentralUser ? (
          <select
            aria-label="Filter by site"
            value={siteFilter}
            onChange={(e) => {
              setSiteFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer max-w-[190px] truncate"
          >
            <option value="ALL">Site: All Sites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.code})
              </option>
            ))}
          </select>
        ) : (
          <div
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-slate-100 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            title="Your role is strictly bound to your assigned site"
          >
            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate max-w-[160px]">
              Site: {currentUser?.site_code || currentUser?.site_name}
            </span>
          </div>
        )}

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LifecycleStatus | 'ALL');
            setCurrentPage(1);
          }}
          className="border border-slate-200 bg-white hover:bg-slate-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Status: All</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REVISION_REQUIRED">Revision Required</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed / Withdrawn</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
            title="Reset All Filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 border border-slate-200 rounded-md px-2.5 py-1 bg-slate-50 text-xs font-medium text-slate-700 ml-auto shrink-0">
          <span className="text-slate-500">Showing:</span>
          <span className="font-bold font-mono tabular-nums text-slate-900">
            {filteredApps.length}
          </span>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between shadow-2xs overflow-hidden"
          >
            <div className="flex items-center gap-2 text-xs text-blue-950 font-semibold">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <span>{selectedIds.size} application(s) selected</span>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => exportSelectedOrAllToCsv(true)}
                className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
              >
                Export Selected ({selectedIds.size})
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 rounded-md border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
              >
                Clear Selection
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corporate Data Table */}
      <div className="corporate-card rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all visible rows"
                    checked={
                      paginatedApps.length > 0 &&
                      selectedIds.size === paginatedApps.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort('reference')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Reference &amp; Dept</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Form &amp; Submission</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort('applicant')}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Applicant &amp; Site</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Pipeline Progress</th>
                <th
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 transition select-none"
                  onClick={() => handleSort('status')}
                >
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
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-900 text-sm">
                        {awaitingMyRoleOnly
                          ? 'No sign-offs currently awaiting your action'
                          : 'No involved applications match your filters'}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {awaitingMyRoleOnly
                          ? `You are all caught up! Switch to "All Involved (${metrics.totalInvolved})" to inspect historical or in-flight applications involving your role at your site.`
                          : 'Try clearing your active search query or department filter.'}
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {awaitingMyRoleOnly && metrics.totalInvolved > 0 && (
                          <button
                            type="button"
                            onClick={() => setAwaitingMyRoleOnly(false)}
                            className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                          >
                            View All Involved ({metrics.totalInvolved})
                          </button>
                        )}
                        {hasActiveFilters && (
                          <button
                            type="button"
                            onClick={resetFilters}
                            className="px-3.5 py-2 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold hover:bg-slate-200 transition cursor-pointer"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app) => {
                  const isMyTurn = isAwaitingUserSignOff(app, currentUser);
                  const isSelected = selectedIds.has(app.id);

                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/60'
                          : isMyTurn
                          ? 'bg-amber-50/35 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => toggleSelectRow(app.id, e)}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${app.reference_number}`}
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{app.reference_number}</span>
                          {isMyTurn && (
                            <span
                              className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                              title="Awaiting your sign-off"
                            />
                          )}
                        </div>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {app.department}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 leading-snug">
                          {app.form_title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          Submitted {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {app.applicant_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">
                            {app.applicant_employee_number}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="truncate max-w-[160px] font-medium text-slate-700">
                            {app.site_name}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[180px]">
                        <StepperProgress
                          approvals={app.approvals}
                          lifecycleStatus={app.status}
                          currentStepOrder={app.current_step_order}
                          compact
                        />
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          status={app.status}
                          customLabel={
                            app.status === 'IN_REVIEW'
                              ? `Wait: ${
                                  app.current_approver_role
                                    ? ROLE_LABELS[app.current_approver_role]
                                    : 'Review'
                                }`
                              : undefined
                          }
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedApp(app);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer ${
                              isMyTurn
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-2xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isMyTurn ? 'Review & Sign' : 'Inspect'}</span>
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

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="tabular-nums">
            Showing{' '}
            <span className="font-bold text-slate-900">
              {filteredApps.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * pageSize, filteredApps.length)}
            </span>{' '}
            of{' '}
            <span className="font-bold text-slate-900">
              {filteredApps.length}
            </span>{' '}
            involved records
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1
              )
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
                      className={`min-w-[28px] h-7 px-2 rounded-md text-xs font-semibold tabular-nums transition cursor-pointer ${
                        currentPage === page
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
              className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <select
              aria-label="Rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 border border-slate-200 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white cursor-pointer"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Unified Detail & Decision Drawer */}
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

export default MasterSheetView;