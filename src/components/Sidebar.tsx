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

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col justify-between min-h-screen shrink-0">
      <div className="p-5 space-y-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-lg">
            E
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Educore Provision
            </h2>
            <p className="text-[11px] text-slate-400">
              Multi-Dept Workflow Engine
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5">
          <button
            type="button"
            onClick={() => onSelectTab('MY_APPLICATIONS')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
              activeTab === 'MY_APPLICATIONS'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
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
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  Sign-off Queue
                </span>
                {pendingMyReviewCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                    {pendingMyReviewCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onSelectTab('MASTER_SHEET')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'MASTER_SHEET'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Table2 className="w-4 h-4" />
                  Master Ledger
                </span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Active User Footer */}
      {currentUser && (
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="space-y-1">
            <div className="text-xs font-bold text-white truncate">
              {currentUser.full_name}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-medium">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              {currentUser.role.replace(/_/g, ' ')}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              {currentUser.institution_name || 'Educore Services'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-600/90 text-xs font-semibold text-slate-200 hover:text-white transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Switch / Sign Out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;