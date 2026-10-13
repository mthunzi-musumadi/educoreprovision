import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Laptop,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  UserCheck,
  RotateCcw,
  Building,
} from 'lucide-react';
import { UserRole } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const { currentUser, users, switchUser, institutions, resetDemoData, openModal } = useApp();

  const currentInstitution = institutions.find((i) => i.id === currentUser.institutionId);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'APPLICANT':
        return 'Applicant / Staff';
      case 'HEAD_TEACHER':
        return 'Head Teacher / GM';
      case 'HR_MANAGER':
        return 'Central HR Manager';
      case 'IT_MANAGER':
        return 'Central ICT Manager';
      case 'SUPER_ADMIN':
        return 'Super Admin';
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40">
      {/* 1. Global Persona Switcher Strip (Requirement for interactive multi-role testing) */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Interactive Persona Switcher:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {users.map((user) => {
                const isSelected = user.id === currentUser.id;
                const inst = institutions.find((i) => i.id === user.institutionId);
                const shortSchool = inst?.name.split(' ')[0] || 'Central';
                return (
                  <button
                    key={user.id}
                    onClick={() => switchUser(user.id)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                    title={`${user.fullName} (${getRoleLabel(user.role)}) — ${inst?.name}`}
                  >
                    <span className="font-medium">{user.fullName.split(' ')[0]}</span>{' '}
                    <span className="text-[10px] opacity-75">
                      ({user.role === 'APPLICANT' ? 'Teacher' : user.role === 'HEAD_TEACHER' ? 'GM' : user.role === 'HR_MANAGER' ? 'HR' : user.role === 'IT_MANAGER' ? 'IT' : 'Admin'} · {shortSchool})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (window.confirm('Reset all applications and timeline to demo initial state?')) {
                  resetDemoData();
                }
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
              title="Reset initial demo applications"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo State</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary Navigation Bar adhering to Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-bold text-base shadow-xs">
              EP
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Educore Provision
              </span>
              <span className="text-[11px] text-slate-500 whitespace-nowrap flex items-center gap-1">
                <span>ICT Purchase Scheme</span>
                <span aria-hidden="true">·</span>
                <span>Solwezi, Zambia</span>
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Contextual to role or global testing) */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
            <button
              onClick={() => setCurrentTab('my-requests')}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                currentTab === 'my-requests'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {currentUser.role === 'APPLICANT' ? 'My Applications' : 'Applicant Portal'}
            </button>

            {(currentUser.role === 'HEAD_TEACHER' || currentUser.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setCurrentTab('school-triage')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  currentTab === 'school-triage'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                School Endorsement
              </button>
            )}

            {(currentUser.role === 'HR_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setCurrentTab('hr-queue')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  currentTab === 'hr-queue'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                HR Clearance
              </button>
            )}

            {(currentUser.role === 'IT_MANAGER' || currentUser.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setCurrentTab('it-queue')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  currentTab === 'it-queue'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                IT Provisioning
              </button>
            )}

            {(currentUser.role === 'HR_MANAGER' ||
              currentUser.role === 'IT_MANAGER' ||
              currentUser.role === 'SUPER_ADMIN') && (
              <button
                onClick={() => setCurrentTab('master-sheet')}
                className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  currentTab === 'master-sheet'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Master Sheet
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action & Active Profile Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-900">{currentUser.fullName}</span>
              <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                <span>{getRoleLabel(currentUser.role)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{currentUser.employeeNumber}</span>
              </span>
            </div>

            {currentUser.role === 'APPLICANT' ? (
              <button
                onClick={() => openModal('NEW_REQUEST')}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Laptop className="w-4 h-4" />
                <span>+ New Equipment Request</span>
              </button>
            ) : (
              <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-xs text-slate-700 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium truncate max-w-[140px]">{currentInstitution?.name}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
