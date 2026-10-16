import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppProvider, useAppContext } from './context/AppContext';
import { Sidebar, ActiveNavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ApplicantDashboard } from './components/ApplicantView/ApplicantDashboard';
import { MasterSheetView } from './components/MasterSheet/MasterSheetView';
import { LoginView } from './components/auth/LoginView';
import { ToastProvider } from './components/common/Toast';
import { NewRequestStepper } from './components/ApplicantView/NewRequestStepper';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SkeletonSessionLoader } from './components/common/SkeletonLoader';

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
    return <SkeletonSessionLoader message="Initializing Educore Workflow Engine & Security Claims..." />;
  }

  if (error && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100/80 p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white p-6 rounded-xl border border-rose-200 max-w-md w-full space-y-4 text-center shadow-lg"
        >
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-bold border border-rose-100">
            !
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-700">Authentication Error</h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setActiveEntraOid(null)}
            className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            Back to Directory Sign-In
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900 font-sans print:bg-white print:block">
      <div className="no-print shrink-0">
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        <div className="no-print">
          <TopBar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
            onOpenNewModal={() => setShowGlobalNewModal(true)}
          />
        </div>

        <main className="flex-1 min-w-0 overflow-y-auto print:overflow-visible print:h-auto">
          <ErrorBoundary fallbackTitle="Unable to load the requested workspace view">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="h-full"
              >
                {activeTab === 'MY_APPLICATIONS' && <ApplicantDashboard />}
                {activeTab === 'REVIEW_QUEUE' && (
                  <MasterSheetView mode="REVIEW_QUEUE" />
                )}
                {activeTab === 'MASTER_SHEET' && (
                  <MasterSheetView mode="MASTER_SHEET" />
                )}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global New Request Modal */}
      <AnimatePresence>
        {showGlobalNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 md:p-8 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGlobalNewModal(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 custom-scrollbar"
            >
              <ErrorBoundary fallbackTitle="Unable to load the requisition wizard">
                <NewRequestStepper
                  onSuccess={() => setShowGlobalNewModal(false)}
                  onCancel={() => setShowGlobalNewModal(false)}
                />
              </ErrorBoundary>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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