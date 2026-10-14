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
  const { currentUser, activeModal, closeModal, getApplicationById } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('my-requests');

  // Auto-switch primary tab when persona changes to matching role view
  useEffect(() => {
    if (!isTabAllowedForRole(currentTab, currentUser.role)) {
      setCurrentTab(getDefaultTabForRole(currentUser.role));
    }
  }, [currentUser.id, currentUser.role, currentTab]);

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
