import React, { useState, useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { ApplicantDashboard } from './components/ApplicantView/ApplicantDashboard';
import { MasterSheetView } from './components/MasterSheet/MasterSheetView';
import { LoginView } from './components/auth/LoginView';

const PortalShell: React.FC = () => {
  const { entraOid, currentUser, isLoading, error, setActiveEntraOid } =
    useAppContext();

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('MY_APPLICATIONS');

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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm font-semibold text-slate-600 animate-pulse">
          Loading Educore Workflow Engine...
        </div>
      </div>
    );
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-6 rounded-2xl border border-red-200 max-w-md w-full space-y-4 text-center">
          <p className="text-sm font-bold text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setActiveEntraOid(null)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

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
  );
};

export function App() {
  return (
    <AppProvider>
      <PortalShell />
    </AppProvider>
  );
}

export default App;