import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ApplicantDashboard } from './components/ApplicantView/ApplicantDashboard';
import { SchoolTriageDashboard } from './components/HeadTeacherView/SchoolTriageDashboard';
import { HRQueueDashboard } from './components/HRView/HRQueueDashboard';
import { ITProvisioningDashboard } from './components/ITView/ITProvisioningDashboard';
import { MasterSheetView } from './components/MasterSheet/MasterSheetView';
import { NewRequestStepper } from './components/ApplicantView/NewRequestStepper';
import { EndorsementModal } from './components/HeadTeacherView/EndorsementModal';
import { HRClearanceModal } from './components/HRView/HRClearanceModal';
import { ITSignoffModal } from './components/ITView/ITSignoffModal';
import { PhysicalFormModal } from './components/DocumentFacsimile/PhysicalFormModal';
import { ApplicationDetailDrawer } from './components/ApplicationDetailDrawer';
import { LoginView } from './components/auth/LoginView';

const isTabAllowedForRole = (tab: string, role: string) => {
  if (role === 'SUPER_ADMIN') return true;
  if (tab === 'my-requests') return true; // All employees regardless of hierarchy are eligible to apply for personal equipment
  if (tab === 'staff-applicants') return role !== 'APPLICANT'; // Privileged roles can view staff applicants directory
  if (role === 'APPLICANT') return tab === 'my-requests';
  if (role === 'HEAD_TEACHER') return tab === 'school-triage' || tab === 'staff-applicants' || tab === 'my-requests';
  if (role === 'HR_MANAGER') return tab === 'hr-queue' || tab === 'master-sheet' || tab === 'staff-applicants' || tab === 'my-requests';
  if (role === 'IT_MANAGER') return tab === 'it-queue' || tab === 'master-sheet' || tab === 'staff-applicants' || tab === 'my-requests';
  return false;
};

const getDefaultTabForRole = (role: string) => {
  switch (role) {
    case 'APPLICANT': return 'my-requests';
    case 'HEAD_TEACHER': return 'school-triage';
    case 'HR_MANAGER': return 'hr-queue';
    case 'IT_MANAGER': return 'it-queue';
    default: return 'my-requests';
  }
};

const AppContent: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    isLoadingAuth,
    users,
    isLoading,
    dbError,
    isDbConnected,
    refreshData,
    activeModal,
    closeModal,
    getApplicationById,
  } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('my-requests');

  // Auto-switch primary tab when persona changes to matching role view
  useEffect(() => {
    if (currentUser?.role && !isTabAllowedForRole(currentTab, currentUser.role)) {
      setCurrentTab(getDefaultTabForRole(currentUser.role));
    }
  }, [currentUser?.id, currentUser?.role, currentTab]);

  // Loading state while checking Microsoft Entra ID session
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div
          className="bg-slate-900 border border-slate-800 p-8 max-w-md w-full shadow-2xl space-y-4"
          style={{ borderRadius: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-emerald-500 animate-pulse" style={{ borderRadius: 0 }} />
            <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Educore Provision · Microsoft Entra ID
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            Validating active Microsoft Entra ID authentication and OIDC session...
          </p>
        </div>
      </div>
    );
  }

  // Primary Gateway: Microsoft Entra ID Single Sign-On required
  if (!isAuthenticated || !currentUser?.id) {
    return <LoginView />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div
          className="bg-white text-slate-900 border border-slate-200 p-8 max-w-md w-full shadow-2xl space-y-4"
          style={{ borderRadius: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-indigo-700 animate-pulse" style={{ borderRadius: 0 }} />
            <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
              Educore Provision · PostgreSQL 18
            </h1>
          </div>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            Connecting directly to PostgreSQL live database and synchronizing live directory records...
          </p>
        </div>
      </div>
    );
  }

  if (dbError || !isDbConnected || users.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100 font-sans">
        <div
          className="bg-white text-slate-900 border-2 border-red-500 p-8 max-w-lg w-full shadow-2xl space-y-4"
          style={{ borderRadius: 0 }}
        >
          <div className="flex items-center gap-2.5 text-red-700 font-mono text-sm font-bold uppercase tracking-tight">
            <span className="w-2.5 h-2.5 bg-red-600 shrink-0" style={{ borderRadius: 0 }} />
            <span>Database Connection Error :(</span>
          </div>

          <div
            className="p-3 bg-red-50 border border-red-200 text-xs font-mono text-red-800 leading-relaxed"
            style={{ borderRadius: 0 }}
          >
            {dbError || 'Failed to establish connection to PostgreSQL live database.'}
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The platform is running in strict live database mode with zero mock fallbacks. A live PostgreSQL 18 connection is mandatory for authentication, Row-Level Security, applications, and audit logs.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => refreshData()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold font-mono transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              Retry Live Connection
            </button>
            <span className="text-[11px] font-mono text-slate-400">Host: 127.0.0.1:5432</span>
          </div>
        </div>
      </div>
    );
  }

  const targetApp = activeModal.applicationId
    ? getApplicationById(activeModal.applicationId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900 font-sans antialiased">
      {/* 1. Left Sidebar Navigation */}
      <div className={activeModal.type === 'PHYSICAL_FORM' ? 'print:hidden' : ''}>
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            if (isTabAllowedForRole(tab, currentUser.role)) {
              setCurrentTab(tab);
            }
          }}
        />
      </div>

      {/* 2. Main Right Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-y-auto h-screen bg-white border-l border-slate-200 ${activeModal.type === 'PHYSICAL_FORM' ? 'print:hidden' : ''}`}>
        <TopBar currentTab={currentTab} />

        <main className="flex-1 px-4 sm:px-8 lg:px-10 py-6 w-full">
          {currentTab === 'staff-applicants' && isTabAllowedForRole('staff-applicants', currentUser.role) && (
            <ApplicantDashboard initialMode="DIRECTORY" />
          )}
          {currentTab === 'my-requests' && (
            <ApplicantDashboard initialMode="PERSONAL" />
          )}
          {currentTab === 'school-triage' && isTabAllowedForRole('school-triage', currentUser.role) && <SchoolTriageDashboard />}
          {currentTab === 'hr-queue' && isTabAllowedForRole('hr-queue', currentUser.role) && <HRQueueDashboard />}
          {currentTab === 'it-queue' && isTabAllowedForRole('it-queue', currentUser.role) && <ITProvisioningDashboard />}
          {currentTab === 'master-sheet' && isTabAllowedForRole('master-sheet', currentUser.role) && <MasterSheetView />}
        </main>

        {/* Corporate Footer */}
        <footer className="no-print mt-auto border-t border-slate-200 bg-white py-3 px-4 sm:px-8 lg:px-10 text-xs text-slate-500">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-slate-800 tracking-tight">EDUCORE PROVISION</span>
              <span aria-hidden="true" className="text-slate-300">|</span>
              <span className="uppercase tracking-wider text-[11px]">ICT Equipment Purchase Scheme</span>
              <span aria-hidden="true" className="text-slate-300">|</span>
              <span className="text-emerald-700 font-bold text-[11px]">PostgreSQL 18</span>
            </div>
            <div className="text-center sm:text-right text-[11px] text-slate-400 font-mono uppercase tracking-wider">
              Trident · Sentinel Kabitaka · Frontier · Educore Academy — Solwezi, ZM
            </div>
          </div>
        </footer>
      </div>

      {/* Global Modals */}
      {activeModal.type === 'NEW_REQUEST' && <NewRequestStepper />}

      {activeModal.type === 'DETAIL' && targetApp && (
        <ApplicationDetailDrawer application={targetApp} onClose={closeModal} />
      )}

      {activeModal.type === 'ENDORSE_PART2' && targetApp && (
        <EndorsementModal application={targetApp} onClose={closeModal} />
      )}

      {activeModal.type === 'CLEAR_PART3' && targetApp && (
        <HRClearanceModal application={targetApp} onClose={closeModal} />
      )}

      {activeModal.type === 'SIGNOFF_PART4' && targetApp && (
        <ITSignoffModal application={targetApp} onClose={closeModal} />
      )}

      {activeModal.type === 'PHYSICAL_FORM' && targetApp && (
        <PhysicalFormModal application={targetApp} onClose={closeModal} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
