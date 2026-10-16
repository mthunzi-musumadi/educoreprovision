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
import { motion, AnimatePresence } from 'motion/react';
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
      className={`bg-slate-950 text-slate-200 border-r border-slate-800/90 flex flex-col justify-between min-h-screen shrink-0 z-20 transition-all duration-300 ease-in-out select-none ${
        collapsed ? 'w-20' : 'w-68'
      }`}
    >
      <div className="p-4 space-y-5">
        {/* Brand Identity Header */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <div className="flex items-center gap-3 min-w-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center p-1 shadow-xs shrink-0 cursor-default overflow-hidden"
            >
              <img
                src="/logo.png"
                alt="Educore Provision Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="min-w-0"
              >
                <h2 className="text-sm font-bold text-white tracking-tight leading-none truncate">
                  EDUCORE SERVICES
                </h2>
                <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                  Workflow &amp; Approvals Portal
                </p>
              </motion.div>
            )}
          </div>
          {onToggleCollapse && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onToggleCollapse}
              aria-label={collapsed ? 'Expand navigation sidebar' : 'Collapse navigation sidebar'}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </motion.button>
          )}
        </div>

        {/* User Session & Site Badge */}
        {currentUser && (
          <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-2.5 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-md bg-blue-600/20 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[11px] text-blue-400 font-medium truncate">
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

        {/* Navigation Section */}
        <div className="space-y-1.5">
          {!collapsed && (
            <div className="px-2.5 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace Views
            </div>
          )}

          <nav className="space-y-1 relative">
            <motion.button
              type="button"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              aria-current={activeTab === 'MY_APPLICATIONS' ? 'page' : undefined}
              onClick={() => onSelectTab('MY_APPLICATIONS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold cursor-pointer relative z-0 transition-colors ${
                activeTab === 'MY_APPLICATIONS'
                  ? 'text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
              }`}
              title="My Personal Requests"
            >
              {activeTab === 'MY_APPLICATIONS' && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 bg-blue-600 rounded-md -z-10 shadow-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="flex items-center gap-2.5 min-w-0">
                <LayoutDashboard
                  className={`w-4 h-4 shrink-0 ${
                    activeTab === 'MY_APPLICATIONS' ? 'text-white' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">My Requests</span>}
              </span>
              {!collapsed && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums shrink-0 transition-colors ${
                    activeTab === 'MY_APPLICATIONS'
                      ? 'bg-blue-700/80 text-blue-100'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {myApplicationsCount}
                </span>
              )}
            </motion.button>

            {isReviewer && (
              <>
                <motion.button
                  type="button"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  aria-current={activeTab === 'REVIEW_QUEUE' ? 'page' : undefined}
                  onClick={() => onSelectTab('REVIEW_QUEUE')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold cursor-pointer relative z-0 transition-colors ${
                    activeTab === 'REVIEW_QUEUE'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                  title="Pending Approvals (Awaiting Your Review)"
                >
                  {activeTab === 'REVIEW_QUEUE' && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute inset-0 bg-blue-600 rounded-md -z-10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Inbox
                      className={`w-4 h-4 shrink-0 ${
                        activeTab === 'REVIEW_QUEUE' ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    {!collapsed && <span className="truncate">Pending Approvals</span>}
                  </span>
                  {pendingMyReviewCount > 0 ? (
                    <span className="relative flex items-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
                      <span
                        className={`relative px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tabular-nums shrink-0 ${
                          activeTab === 'REVIEW_QUEUE'
                            ? 'bg-white text-blue-800'
                            : 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                        }`}
                      >
                        {pendingMyReviewCount}
                      </span>
                    </span>
                  ) : (
                    !collapsed && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900">
                        0
                      </span>
                    )
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  aria-current={activeTab === 'MASTER_SHEET' ? 'page' : undefined}
                  onClick={() => onSelectTab('MASTER_SHEET')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold cursor-pointer relative z-0 transition-colors ${
                    activeTab === 'MASTER_SHEET'
                      ? 'text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
                  }`}
                  title="Records & Workflow Ledger"
                >
                  {activeTab === 'MASTER_SHEET' && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute inset-0 bg-blue-600 rounded-md -z-10 shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
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
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums shrink-0 transition-colors ${
                        activeTab === 'MASTER_SHEET'
                          ? 'bg-blue-700/80 text-blue-100'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {involvedLedgerCount}
                    </span>
                  )}
                </motion.button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Tenancy Notice & Footer Actions */}
      <div className="p-4 border-t border-slate-800/90 space-y-3">
        {currentUser && !collapsed && (
          <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/90 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Site Tenancy Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {currentUser.site_code === 'CENTRAL' && currentUser.role === 'SUPER_ADMIN'
                ? 'Central Admin: Complete oversight across all 9 school sites.'
                : currentUser.site_code === 'CENTRAL'
                ? `Central Admin: Scope includes applications routed to ${ROLE_LABELS[currentUser.role]}.`
                : `Assigned to ${currentUser.site_name} (${currentUser.site_code}). Scoped strictly to your school.`}
            </p>
          </div>
        )}

        <motion.button
          type="button"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => logout()}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition cursor-pointer ${
            collapsed ? 'justify-center' : 'justify-start'
          }`}
          title="Switch Persona or Sign Out"
        >
          <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
          {!collapsed && <span>Switch Persona / Sign Out</span>}
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;