import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
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
import { ApplicationDetailModal } from './components/ApplicationDetailModal';

const AppContent: React.FC = () => {
  const { currentUser, activeModal, closeModal, getApplicationById } = useApp();
  const [currentTab, setCurrentTab] = useState<string>('my-requests');

  // Auto-switch primary tab when persona changes to matching role view
  useEffect(() => {
    if (currentUser.role === 'APPLICANT') {
      setCurrentTab('my-requests');
    } else if (currentUser.role === 'HEAD_TEACHER') {
      setCurrentTab('school-triage');
    } else if (currentUser.role === 'HR_MANAGER') {
      setCurrentTab('hr-queue');
    } else if (currentUser.role === 'IT_MANAGER') {
      setCurrentTab('it-queue');
    }
  }, [currentUser.id, currentUser.role]);

  const targetApp = activeModal.applicationId
    ? getApplicationById(activeModal.applicationId)
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'my-requests' && <ApplicantDashboard />}
        {currentTab === 'school-triage' && <SchoolTriageDashboard />}
        {currentTab === 'hr-queue' && <HRQueueDashboard />}
        {currentTab === 'it-queue' && <ITProvisioningDashboard />}
        {currentTab === 'master-sheet' && <MasterSheetView />}
      </main>

      {/* Global Modals */}
      {activeModal.type === 'NEW_REQUEST' && <NewRequestStepper />}

      {activeModal.type === 'DETAIL' && targetApp && (
        <ApplicationDetailModal application={targetApp} onClose={closeModal} />
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

      {/* Quiet Corporate Footer */}
      <footer className="no-print mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Educore Provision</span>
            <span aria-hidden="true">·</span>
            <span>ICT Equipment Purchase Scheme Portal</span>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-400">
            Network of Schools: Trident College · Sentinel Kabitaka · Frontier School · Educore Academy (Solwezi, Zambia)
          </div>
        </div>
      </footer>
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
