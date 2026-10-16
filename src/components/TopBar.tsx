import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronRight,
  Building2,
  Plus,
  Layers,
  ChevronDown,
  Users,
  ShieldCheck,
  Check,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { ActiveNavTab } from './Sidebar';
import { ROLE_LABELS, isAwaitingUserSignOff } from '../types';
import { DEMO_PERSONAS } from './auth/LoginView';

interface TopBarProps {
  activeTab: ActiveNavTab;
  onOpenNewModal?: () => void;
  onToggleSidebar?: () => void;
  onSelectTab: (tab: ActiveNavTab) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenNewModal,
  onToggleSidebar,
  onSelectTab,
}) => {
  const { currentUser, applications, setActiveEntraOid, logout } = useAppContext();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSwitcherOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Strict pending reviews count for current user's role & site
  const pendingCount = React.useMemo(() => {
    if (!currentUser || currentUser.role === 'APPLICANT') return 0;
    return applications.filter((a) => isAwaitingUserSignOff(a, currentUser)).length;
  }, [applications, currentUser]);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'MY_APPLICATIONS':
        return 'My Requests';
      case 'REVIEW_QUEUE':
        return 'Pending Approvals';
      case 'MASTER_SHEET':
        return 'Workflow Ledger';
      default:
        return 'Workflow Engine';
    }
  };

  const initials = React.useMemo(() => {
    if (!currentUser?.full_name) return 'U';
    const clean = currentUser.full_name.replace(/^Dr\.\s+/i, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }, [currentUser?.full_name]);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left: Contextual Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium min-w-0">
        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onToggleSidebar}
          aria-label="Toggle navigation sidebar"
          className="p-1.5 -ml-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition lg:hidden cursor-pointer"
          title="Toggle Navigation"
        >
          <Layers className="w-4 h-4" />
        </motion.button>

        <div className="hidden sm:flex items-center gap-1.5 text-slate-600 font-medium">
          <img src="/logo.png" alt="Educore Logo" className="w-4 h-4 object-contain" />
          <span>Educore Services</span>
        </div>
        <div className="sm:hidden flex items-center shrink-0">
          <img src="/logo.png" alt="Educore Logo" className="w-4 h-4 object-contain" />
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline shrink-0" />
        {currentUser?.site_code && (
          <>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-semibold border border-slate-200">
              {currentUser.site_code}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden md:inline shrink-0" />
          </>
        )}
        <span className="font-bold text-slate-900 truncate text-xs sm:text-sm">
          {getBreadcrumbTitle()}
        </span>
      </div>

      {/* Right: Primary CTA, Action Required Alert, Site Badge & Quick Persona Switcher */}
      <div className="flex items-center gap-2.5">
        {/* Pending Reviews Alert Pill */}
        {pendingCount > 0 && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSelectTab('REVIEW_QUEUE')}
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition cursor-pointer shadow-2xs"
            title={`${pendingCount} application(s) awaiting your sign-off`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="tabular-nums font-bold">{pendingCount} Awaiting Review</span>
          </motion.button>
        )}

        {/* Primary New Request CTA */}
        {onOpenNewModal && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenNewModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">New Request</span>
          </motion.button>
        )}

        {/* Assigned Site Chip */}
        {currentUser && (
          <div
            className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700"
            title={`Assigned Site: ${currentUser.site_name} (${currentUser.site_code || 'SITE'})`}
          >
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold truncate max-w-[180px]">
              {currentUser.site_name || 'Assigned Site'}
            </span>
          </div>
        )}

        {/* Interactive Persona & Site Switcher Dropdown */}
        {currentUser && (
          <div className="relative" ref={dropdownRef}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setSwitcherOpen((prev) => !prev)}
              aria-expanded={switcherOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition cursor-pointer"
              title="Switch active persona or site session"
            >
              <div className="w-7 h-7 rounded-md bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                  {currentUser.full_name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">
                  {ROLE_LABELS[currentUser.role]}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                  switcherOpen ? 'rotate-180' : ''
                }`}
              />
            </motion.button>

            <AnimatePresence>
              {switcherOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -6 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  role="menu"
                  aria-label="Persona and Site Switcher"
                  className="absolute right-0 mt-2 w-84 bg-white rounded-lg border border-slate-200 shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                        <span>Active Session Context</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {currentUser.site_name} ({currentUser.site_code})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[10px] font-semibold border border-slate-700">
                      {currentUser.employee_number}
                    </span>
                  </div>

                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span>Quick Switch Persona (Verify Site RLS)</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                    {DEMO_PERSONAS.map((p) => {
                      const isCurrent = p.entraOid === currentUser.entra_oid;
                      return (
                        <motion.button
                          key={p.entraOid}
                          type="button"
                          role="menuitem"
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => {
                            setSwitcherOpen(false);
                            if (!isCurrent) {
                              setActiveEntraOid(p.entraOid);
                            }
                          }}
                          className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition cursor-pointer ${
                            isCurrent ? 'bg-sky-50/90' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {p.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold border border-slate-200">
                                {p.siteCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {ROLE_LABELS[p.role]} · {p.site}
                            </div>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-sky-600 shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="p-2 bg-slate-50 border-t border-slate-200/80">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSwitcherOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Return to Full SSO Directory</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;
