import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Laptop,
  Building,
  UserCheck,
  ShieldCheck,
  Server,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  Bell,
  Database,
  Users,
  CheckCircle2,
  Sparkles,
  Settings,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const {
    currentUser,
    users,
    switchUser,
    institutions,
    applications,
    getScopedApplications,
    resetDemoData,
    openModal,
    isDbConnected,
    lastDbSyncTime,
    refreshData,
    authConfig,
    loginWithMicrosoft,
    logout,
  } = useApp();

  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentInstitution = institutions.find((i) => i.id === currentUser.institutionId);

  // Compute pending notification counts for the current persona's leadership action queue
  const getLeadershipPendingCount = () => {
    if (currentUser.role === 'HEAD_TEACHER') {
      return applications.filter(
        (a) => a.institutionId === currentUser.institutionId && a.status === 'PENDING_GM_REVIEW'
      ).length;
    }
    if (currentUser.role === 'HR_MANAGER') {
      return applications.filter((a) => a.status === 'PENDING_HR_REVIEW').length;
    }
    if (currentUser.role === 'IT_MANAGER') {
      return applications.filter((a) => a.status === 'PENDING_IT_SIGNOFF').length;
    }
    if (currentUser.role === 'SUPER_ADMIN') {
      return applications.filter((a) =>
        ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(a.status)
      ).length;
    }
    return 0;
  };

  // Personal active applications count for the logged-on user
  const personalActiveCount = applications.filter(
    (a) =>
      a.applicantId === currentUser.id &&
      ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'REVISION_REQUIRED'].includes(a.status)
  ).length;

  const leadershipPendingCount = getLeadershipPendingCount();
  const scopedApplications = getScopedApplications();

  const getRoleBadgeLabel = (role: UserRole) => {
    switch (role) {
      case 'APPLICANT':
        return 'Staff / Teacher';
      case 'HEAD_TEACHER':
        return 'Head Teacher';
      case 'HR_MANAGER':
        return 'Central HR';
      case 'IT_MANAGER':
        return 'Central IT';
      case 'SUPER_ADMIN':
        return 'Super Admin';
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 select-none min-h-screen shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
      {/* 1. Corporate Brand Mark */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        {/* Square flat brand mark — no gradient, no rounded corners */}
        <div className="w-14 h-16 bg-slate-200 flex items-center justify-center text-orange-500 font-black text-5xl tracking-widest shrink-0"
          style={{ borderRadius: 0 }}>
          E
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-black text-[13px] text-slate-900 tracking-tight leading-tight">
            EDUCORE <span className="text-slate-700">PROVISION</span>
          </span>
          <span className="text-[10px] font-medium text-slate-500 tracking-wider uppercase">
            ICT Purchase Scheme
          </span>
        </div>
      </div>

      {/* 2. User Identity Block — square avatar, monospaced role tag */}
      <div className="px-3 py-3 border-b border-slate-200">
        <div
          onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
          className="flex items-center justify-between px-2.5 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
          style={{ borderRadius: 0 }}
          title="Switch Microsoft Entra ID persona"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Square initial block */}
            <div
              className="w-8 h-8 bg-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0"
              style={{ borderRadius: 0 }}
            >
              {currentUser.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate leading-tight">
                {currentUser.fullName}
              </span>
              <span className="text-[10px] text-slate-500 truncate font-mono leading-tight">
                {currentUser.email}
              </span>
              {/* Corporate role tag — rectangular, monospaced, uppercase */}
              <span
                className="mt-0.5 inline-flex self-start items-center px-1.5 py-px text-[9px] font-mono font-bold uppercase tracking-widest text-slate-700 border border-slate-300 bg-white"
                style={{ borderRadius: 0 }}
              >
                {getRoleBadgeLabel(currentUser.role)}
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${personaDropdownOpen ? 'rotate-180' : ''}`}
          />
        </div>

        {/* Persona Dropdown — sharp border, no rounded corners */}
        {personaDropdownOpen && (
          <div
            className="mt-1 bg-white border border-slate-200 shadow-lg overflow-hidden"
            style={{ borderRadius: 0 }}
          >
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 flex items-center justify-between">
              <span>Entra Directory</span>
              <span className="text-slate-600">OIDC/OAuth2</span>
            </div>
            {users.map((u) => {
              const isSelected = u.id === currentUser.id;
              const inst = institutions.find((i) => i.id === u.institutionId);
              return (
                <button
                  key={u.id}
                  onClick={() => { switchUser(u.id); setPersonaDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer border-b border-slate-100 last:border-0 ${
                    isSelected ? 'bg-slate-700 text-white' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="truncate">
                    <span className="font-semibold block">{u.fullName}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                      {getRoleBadgeLabel(u.role)} · {inst?.name.split(' ')[0]}
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-slate-200" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Action Queue Indicator — sharp rectangular counter, no pulse animation */}
      {currentUser.role !== 'APPLICANT' && (
        <div className="px-3 pt-3">
          <div
            className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-600"
            style={{ borderRadius: 0 }}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono uppercase tracking-wide text-[11px]">Action Queue</span>
            </div>
            {/* Square counter badge */}
            <span
              className={`px-2 py-0.5 text-[11px] font-mono font-bold ${
                leadershipPendingCount > 0
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
              style={{ borderRadius: 0 }}
            >
              {leadershipPendingCount}
            </span>
          </div>
        </div>
      )}

      {/* 4. Primary Navigation — sharp active indicator, left-border accent */}
      <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
        {/* Staff / Teacher: My Applications */}
        {currentUser.role === 'APPLICANT' && (
          <NavItem
            icon={<Laptop className="w-4 h-4" />}
            label="My Applications"
            active={currentTab === 'my-requests'}
            onClick={() => setCurrentTab('my-requests')}
            count={personalActiveCount}
          />
        )}

        {/* Leadership: Staff Applicants Directory */}
        {currentUser.role !== 'APPLICANT' && (
          <NavItem
            icon={<Users className="w-4 h-4" />}
            label="Staff Applicants"
            active={currentTab === 'staff-applicants'}
            onClick={() => setCurrentTab('staff-applicants')}
            count={scopedApplications.length}
          />
        )}

        {/* Head Teacher / Admin: School Triage */}
        {(currentUser.role === 'HEAD_TEACHER' || currentUser.role === 'SUPER_ADMIN') && (
          <NavItem
            icon={<Building className="w-4 h-4" />}
            label="School Triage Queue"
            active={currentTab === 'school-triage'}
            onClick={() => setCurrentTab('school-triage')}
            count={currentUser.role === 'HEAD_TEACHER' ? leadershipPendingCount : 0}
            countColor="bg-amber-500"
          />
        )}

        {/* HR Clearance Queue */}
        {(currentUser.role === 'HR_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
          <NavItem
            icon={<UserCheck className="w-4 h-4" />}
            label="HR Clearance Queue"
            active={currentTab === 'hr-queue'}
            onClick={() => setCurrentTab('hr-queue')}
            count={currentUser.role === 'HR_MANAGER' ? leadershipPendingCount : 0}
            countColor="bg-sky-600"
          />
        )}

        {/* IT Provisioning Queue */}
        {(currentUser.role === 'IT_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
          <NavItem
            icon={<Server className="w-4 h-4" />}
            label="IT Provisioning Queue"
            active={currentTab === 'it-queue'}
            onClick={() => setCurrentTab('it-queue')}
            count={currentUser.role === 'IT_MANAGER' ? leadershipPendingCount : 0}
            countColor="bg-violet-600"
          />
        )}

        {/* Master Sheet */}
        {(currentUser.role === 'HR_MANAGER' || currentUser.role === 'IT_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
          <NavItem
            icon={<FileSpreadsheet className="w-4 h-4" />}
            label="Master Sheet & Payroll"
            active={currentTab === 'master-sheet'}
            onClick={() => setCurrentTab('master-sheet')}
          />
        )}

        {/* Privileged roles: Personal applications */}
        {currentUser.role !== 'APPLICANT' && (
          <NavItem
            icon={<Laptop className="w-4 h-4" />}
            label="My Applications"
            active={currentTab === 'my-requests'}
            onClick={() => setCurrentTab('my-requests')}
            count={personalActiveCount}
          />
        )}

        {/* Settings & Logout */}
        <div className="pt-3 mt-1 border-t border-slate-100 space-y-0.5">
          <NavItem
            icon={<Settings className="w-4 h-4" />}
            label="Settings & Info"
            active={false}
            onClick={() =>
              alert(
                `Educore Provision Portal Security\n` +
                `Active Tenant: ${currentInstitution?.name}\n` +
                `User: ${currentUser.fullName} (${currentUser.role})\n` +
                `Microsoft Entra OID: ${currentUser.entraOid}\n` +
                `Auth Provider: Microsoft Entra ID (OIDC / OAuth 2.0 with PKCE)\n` +
                `Database: PostgreSQL 18 Live DB`
              )
            }
          />
          <button
            onClick={() => {
              if (window.confirm(`Log out of active Microsoft Entra session for ${currentUser.fullName}?`)) {
                logout();
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-l-2 border-transparent hover:border-rose-400"
            style={{ borderRadius: 0 }}
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Logout Session</span>
          </button>
        </div>
      </nav>

      {/* 5. System Status Footer — sleek outlined tech labels */}
      <div className="border-t border-slate-200 bg-slate-50">

        {/* PostgreSQL status row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 shrink-0 ${isDbConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ borderRadius: 0 }}
            />
            <span className="text-[11px] font-mono text-slate-600 font-semibold">PostgreSQL 18</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="text-[10px] font-mono font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 flex items-center gap-1 cursor-pointer transition-colors"
            style={{ borderRadius: 0 }}
            title="Refresh live data from PostgreSQL"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>SYNC</span>
          </button>
        </div>

        {/* Quick persona switcher grid */}
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400">
            Directory Personas
          </div>
          <div className="grid grid-cols-2 gap-1">
            {users.slice(0, 8).map((u) => {
              const isSelected = u.id === currentUser.id;
              return (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={`px-2 py-1.5 text-left truncate cursor-pointer transition-colors text-[11px] border ${
                    isSelected
                      ? 'bg-slate-700 text-white border-slate-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={{ borderRadius: 0 }}
                  title={`${u.fullName} (${u.role})`}
                >
                  <span className="font-semibold block leading-tight">{u.fullName.split(' ')[0]}</span>
                  <span className={`font-mono text-[9px] ${isSelected ? 'text-slate-200' : 'text-slate-400'}`}>
                    {u.role === 'APPLICANT' ? 'Teacher' : u.role === 'HEAD_TEACHER' ? 'GM' : u.role === 'HR_MANAGER' ? 'HR Mgr' : u.role === 'IT_MANAGER' ? 'IT Mgr' : 'Admin'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset */}
        <div className="px-3 pb-3">
          <button
            onClick={() => { if (window.confirm('Reset database to initial benchmark seed state?')) { resetDemoData(); } }}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] font-medium transition-colors cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            <span>Reset Benchmark Data</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

// ─── Inline NavItem sub-component for sharp left-border active indicator ────
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
  countColor?: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, count, countColor = 'bg-slate-700' }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors cursor-pointer border-l-2 ${
      active
        ? 'border-slate-700 bg-slate-50 text-slate-800 font-semibold'
        : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300'
    }`}
    style={{ borderRadius: 0 }}
  >
    <div className={`flex items-center gap-3 ${active ? 'text-slate-700' : 'text-slate-400'}`}>
      {icon}
      <span className={active ? 'text-slate-800' : 'text-slate-700'}>{label}</span>
    </div>
    {count != null && count > 0 && (
      <span
        className={`px-1.5 py-0.5 text-[10px] font-mono font-bold text-white ${countColor}`}
        style={{ borderRadius: 0 }}
      >
        {count}
      </span>
    )}
  </button>
);
