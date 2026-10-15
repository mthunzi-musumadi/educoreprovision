import React from 'react';
import {
  LayoutDashboard,
  Inbox,
  Table2,
  LogOut,
  Shield,
  Building2,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export type ActiveNavTab = 'MY_APPLICATIONS' | 'REVIEW_QUEUE' | 'MASTER_SHEET';

interface SidebarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const { currentUser, applications, logout } = useAppContext();

  const isReviewer =
    currentUser && currentUser.role !== 'APPLICANT';

  // Count how many applications are currently sitting on this user's desk
  const pendingMyReviewCount = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'APPLICANT') return 0;
    return applications.filter((a) => {
      if (a.status !== 'IN_REVIEW') return false;
      if (currentUser.role === 'SUPER_ADMIN') return true;
      if (a.current_approver_role !== currentUser.role) return false;
      if (
        ['HEAD_TEACHER', 'LINE_MANAGER'].includes(currentUser.role) &&
        a.institution_id !== currentUser.institution_id
      ) {
        return false;
      }
      return true;
    }).length;
  }, [applications, currentUser]);

  // Get initials for avatar
  const initials = React.useMemo(() => {
    if (!currentUser?.full_name) return 'U';
    const parts = currentUser.full_name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser?.full_name]);

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between min-h-screen shrink-0 z-20">
      <div className="p-4 space-y-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-2 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-sm">
              E
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-none">
                EDUCORE
              </h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Multi-Dept Workflow
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            title="Toggle sidebar"
          >
            <span className="font-mono text-xs font-bold text-slate-400">&lt;&gt;</span>
          </button>
        </div>

        {/* User Profile Card (Matches 1.png) */}
        {currentUser && (
          <div
            onClick={() => logout()}
            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 hover:bg-slate-100/80 transition cursor-pointer group"
            title="Click to switch persona or log out"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {currentUser.full_name}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {currentUser.role.replace(/_/g, ' ')}
                </div>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition shrink-0 ml-1">
              ›
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <div className="space-y-1">
          <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Workflows & Queues
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectTab('MY_APPLICATIONS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'MY_APPLICATIONS'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <LayoutDashboard className={`w-4 h-4 ${activeTab === 'MY_APPLICATIONS' ? 'text-blue-600' : 'text-slate-400'}`} />
                My Applications
              </span>
            </button>

            {isReviewer && (
              <>
                <button
                  type="button"
                  onClick={() => onSelectTab('REVIEW_QUEUE')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'REVIEW_QUEUE'
                      ? 'bg-blue-50 text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Inbox className={`w-4 h-4 ${activeTab === 'REVIEW_QUEUE' ? 'text-blue-600' : 'text-slate-400'}`} />
                    Sign-off Queue
                  </span>
                  {pendingMyReviewCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                      {pendingMyReviewCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onSelectTab('MASTER_SHEET')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'MASTER_SHEET'
                      ? 'bg-blue-50 text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Table2 className={`w-4 h-4 ${activeTab === 'MASTER_SHEET' ? 'text-blue-600' : 'text-slate-400'}`} />
                    Master Ledger
                  </span>
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Active User Institution & Footer Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        {currentUser && (
          <div className="px-2 py-1.5 rounded-lg bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">{currentUser.institution_name || 'Educore Services'}</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center justify-start gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Switch Persona / Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;