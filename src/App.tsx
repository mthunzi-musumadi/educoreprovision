import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ApplicantDashboard } from './components/ApplicantView/ApplicantDashboard';
import { MasterSheetView } from './components/MasterSheet/MasterSheetView';
import { LoginView } from './components/auth/LoginView';
import { ToastProvider } from './components/common/Toast';
import { NewRequestStepper } from './components/ApplicantView/NewRequestStepper';

const PortalShell: React.FC = () => {
  const { entraOid, currentUser, isLoading, error, setActiveEntraOid } =
    useAppContext();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('MY_APPLICATIONS');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showGlobalNewModal, setShowGlobalNewModal] = useState(false);

  // Default reviewers directly to their Sign-off Queue on login
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'APPLICANT') {
        setActiveTab('MY_APPLICATIONS');
      } else {
        setActiveTab('REVIEW_QUEUE');
      }
    }
  }, [currentUser?.id, currentUser?.role]);

  if (!entraOid) {
    return <LoginView />;
  }

  if (isLoading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/80">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-lg max-w-sm w-full space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md animate-bounce">
            E
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Loading Session</h3>
            <p className="text-xs text-slate-500 mt-1">
              Initializing Educore Workflow Engine &amp; Security Claims...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-6">
        <div className="bg-white p-6 rounded-3xl border border-rose-200 max-w-md w-full space-y-4 text-center shadow-lg">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-bold">
            !
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-700">Authentication Error</h3>
            <p className="text-xs text-slate-600 mt-1">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveEntraOid(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            Back to Directory Sign-In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900 font-sans">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        <TopBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          onOpenNewModal={() => setShowGlobalNewModal(true)}
        />

        <main className="flex-1 min-w-0 overflow-y-auto">
          {activeTab === 'MY_APPLICATIONS' && <ApplicantDashboard />}
          {activeTab === 'REVIEW_QUEUE' && (
            <MasterSheetView mode="REVIEW_QUEUE" />
          )}
          {activeTab === 'MASTER_SHEET' && (
            <MasterSheetView mode="MASTER_SHEET" />
          )}
        </main>
      </div>

      {/* Global New Request Modal */}
      {showGlobalNewModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGlobalNewModal(false);
          }}
        >
          <div className="bg-slate-50/95 rounded-3xl border border-slate-200/90 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <NewRequestStepper
              onSuccess={() => setShowGlobalNewModal(false)}
              onCancel={() => setShowGlobalNewModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <PortalShell />
      </ToastProvider>
    </AppProvider>
  );
}

export default App;