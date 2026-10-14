import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertCircle, Lock } from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    loginWithMicrosoft,
    authConfig,
    authError,
    setAuthError,
    ssoLogin,
    users,
  } = useApp();

  const [showSandbox, setShowSandbox] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeUserId = selectedUserId || users[0]?.id || '';

  const handleMicrosoftLogin = () => {
    setIsSubmitting(true);
    loginWithMicrosoft();
  };

  const handleSandboxLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUserId) return;
    setIsSubmitting(true);
    try {
      await ssoLogin(activeUserId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-900">
      <main className="w-full max-w-md">
        {/* Sleek Corporate Auth Card */}
        <div className="bg-white border border-slate-200 shadow-sm p-8 sm:p-10">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5 mb-8">
            <div className="w-11 h-11 bg-slate-900 flex items-center justify-center text-orange-500 font-black text-2xl tracking-wider shrink-0">
              E
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm text-slate-900 tracking-tight leading-tight">
                EDUCORE <span className="text-slate-600 font-semibold">PROVISION</span>
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Use your organizational Microsoft 365 identity to access equipment requests and approvals.
            </p>
          </div>

          {/* Authentication Error Banner */}
          {authError && (
            <div
              role="alert"
              className="mb-6 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="leading-relaxed text-[11px]">
                  <span className="font-semibold block text-rose-900 mb-0.5">Authentication error</span>
                  {authError}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                className="text-rose-500 hover:text-rose-800 text-xs font-bold px-1.5 py-0.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-600"
                aria-label="Dismiss error notification"
              >
                ✕
              </button>
            </div>
          )}

          {/* Primary Action: Official Microsoft Entra ID SSO Button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleMicrosoftLogin}
            className="w-full h-11 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-medium text-xs flex items-center justify-center gap-3 transition-colors cursor-pointer border border-transparent shadow-xs disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-slate-900 focus-visible:outline-offset-2"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            <span className="tracking-wide">
              {isSubmitting ? 'Redirecting to Microsoft…' : 'Sign in with Microsoft 365'}
            </span>
          </button>

          {/* Development / Sandbox Sign-In Fallback */}
          {(!authConfig?.configured || showSandbox) && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <form onSubmit={handleSandboxLogin} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="sandbox-account-select"
                    className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider"
                  >
                    Sandbox profile
                  </label>
                  {!authConfig?.configured && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-medium">
                      Dev mode
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <select
                    id="sandbox-account-select"
                    value={activeUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 min-w-0 text-xs bg-slate-50 border border-slate-300 px-3 py-2 text-slate-800 focus-visible:outline-2 focus-visible:outline-slate-900"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role.replace(/_/g, ' ')})
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={isSubmitting || !activeUserId}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border border-slate-300 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-slate-900"
                  >
                    {isSubmitting ? 'Signing in…' : 'Sign in'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Quiet toggle for developers when live Azure is configured */}
          {authConfig?.configured && !showSandbox && users.length > 0 && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setShowSandbox(true)}
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-slate-900"
              >
                Use sandbox test profile
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center text-center justify-center gap-2 text-xs text-slate-400">
            <span className="text-[11px]">Educore Services provides leading education <br/>
            through the following network of schools - Frontier, Sentinel, Trident and the Educore Academy</span>
          </div>
        </div>

        {/* Corporate Footer */}
        <footer className="mt-6 text-center text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-600">Educore Services</p>
          <p className="text-slate-400">Solwezi, North-Western Province, Zambia</p>
        </footer>
      </main>
    </div>
  );
};
