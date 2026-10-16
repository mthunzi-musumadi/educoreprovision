import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Table2,
  LogOut,
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import {
  ROLE_LABELS,
  isAwaitingUserSignOff,
  isUserInvolvedInApplication,
} from '../types';

export type ActiveNavTab = 'MY_APPLICATIONS' | 'REVIEW_QUEUE' | 'MASTER_SHEET';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
}) => {
  const { currentUser, applications, logout } = useAppContext();

  const isReviewer = Boolean(currentUser && currentUser.role !== 'APPLICANT');

  // Strict personal applications count (applicant_id === currentUser.id AND site_id === currentUser.site_id)
  const myApplicationsCount = React.useMemo(() => {
    if (!currentUser) return 0;
    return applications.filter(
      (a) => a.applicant_id === currentUser.id && a.site_id === currentUser.site_id
    ).length;
  }, [applications, currentUser]);

  // Strict action-required sign-off count (site-bound & role-bound)
  const pendingMyReviewCount = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'APPLICANT') return 0;
    return applications.filter((a) => isAwaitingUserSignOff(a, currentUser)).length;
  }, [applications, currentUser]);

  // Strict involved ledger count (only applications involving this user & bound to their site)
  const involvedLedgerCount = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'APPLICANT') return 0;
    return applications.filter((a) => isUserInvolvedInApplication(a, currentUser)).length;
  }, [applications, currentUser]);

  const initials = React.useMemo(() => {
    if (!currentUser?.full_name) return 'U';
    const clean = currentUser.full_name.replace(/^Dr\.\s+/i, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser?.full_name]);

  return (
    <aside
      aria-label="Primary Workspace Navigation"
      className={`bg-slate-950 text-slate-200 border-r border-slate-800/90 flex flex-col justify-between min-h-screen shrink-0 z-20 transition-all duration-200 select-none ${
        collapsed ? 'w-20' : 'w-68'
      }`}
    >
      <div className="p-4 space-y-5">
        {/* Brand Identity Header */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center font-black text-white text-sm shadow-xs border border-sky-400/30 shrink-0">
              EP
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white tracking-tight leading-none truncate">
                  EDUCORE PROVISION
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                  Site Governance Engine
                </p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Active Identity & Site Context Card (Law of Common Region) */}
        {currentUser && (
          <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[11px] text-sky-400 font-medium truncate">
                    {ROLE_LABELS[currentUser.role]}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                <span className="flex items-center gap-1.5 text-slate-300 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentUser.site_name || 'Assigned Site'}</span>
                </span>
                {currentUser.site_code && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-semibold border border-slate-700 shrink-0">
                    {currentUser.site_code}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation Section (Fitts's Law: Full-width 42px high buttons) */}
        <div className="space-y-1.5">
          {!collapsed && (
            <div className="px-2.5 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace Views
            </div>
          )}

          <nav className="space-y-1">
            <button
              type="button"
              aria-current={activeTab === 'MY_APPLICATIONS' ? 'page' : undefined}
              onClick={() => onSelectTab('MY_APPLICATIONS')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer relative ${
                activeTab === 'MY_APPLICATIONS'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
              title="My Personal Applications"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'MY_APPLICATIONS' ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">My Applications</span>}
              </span>
              {!collapsed && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums shrink-0 ${
                    activeTab === 'MY_APPLICATIONS'
                      ? 'bg-sky-700 text-sky-100'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {myApplicationsCount}
                </span>
              )}
            </button>

            {isReviewer && (
              <>
                <button
                  type="button"
                  aria-current={activeTab === 'REVIEW_QUEUE' ? 'page' : undefined}
                  onClick={() => onSelectTab('REVIEW_QUEUE')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'REVIEW_QUEUE'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                  title="Sign-off Queue (Awaiting Your Action)"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Inbox
                      className={`w-4 h-4 shrink-0 ${
                        activeTab === 'REVIEW_QUEUE' ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate">Sign-off Queue</span>}
                  </span>
                  {pendingMyReviewCount > 0 ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums shrink-0 ${
                        activeTab === 'REVIEW_QUEUE'
                          ? 'bg-white text-sky-700'
                          : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {pendingMyReviewCount}
                    </span>
                  ) : (
                    !collapsed && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-slate-400 bg-slate-900">
                        0
                      </span>
                    )
                  )}
                </button>

                <button
                  type="button"
                  aria-current={activeTab === 'MASTER_SHEET' ? 'page' : undefined}
                  onClick={() => onSelectTab('MASTER_SHEET')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'MASTER_SHEET'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`}
                  title="Involved Workflow Ledger"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Table2
                      className={`w-4 h-4 shrink-0 ${
                        activeTab === 'MASTER_SHEET' ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate">Workflow Ledger</span>}
                  </span>
                  {!collapsed && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tabular-nums shrink-0 ${
                        activeTab === 'MASTER_SHEET'
                          ? 'bg-sky-700 text-sky-100'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {involvedLedgerCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Least-Privilege Security Notice & Footer Actions */}
      <div className="p-4 border-t border-slate-800/90 space-y-3">
        {currentUser && !collapsed && (
          <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Least-Privilege Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {currentUser.site_code === 'CENTRAL' && currentUser.role === 'SUPER_ADMIN'
                ? 'Central Admin: Oversight across all 9 sites.'
                : currentUser.site_code === 'CENTRAL'
                ? `Scoped strictly to workflows involving ${ROLE_LABELS[currentUser.role]}.`
                : `Strictly bound to ${currentUser.site_code} site workflows involving you.`}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => logout()}
          className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
          title="Switch Persona or Sign Out"
        >
          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
          {!collapsed && <span>Switch Persona / Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;