import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ApplicationStatus,
  ApplicationTimelineEvent,
  HRVettingChecklist,
  Institution,
  LaptopTier,
  PurchaseApplication,
  RepaymentPlan,
  User,
} from '../types';
import {
  LAPTOP_CONFIGS,
  VERBATIM_LEGAL_POLICY,
} from '../data/mockData';

export interface MicrosoftAuthConfig {
  configured: boolean;
  tenantId: string;
  clientId: string;
  redirectUri: string;
  provider: string;
}

interface AppContextType {
  currentUser: User;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  authError: string | null;
  setAuthError: (err: string | null) => void;
  users: User[];
  institutions: Institution[];
  applications: PurchaseApplication[];
  timelineEvents: ApplicationTimelineEvent[];
  switchUser: (userId: string) => void;
  getScopedApplications: () => PurchaseApplication[];
  getApplicationById: (id: string) => PurchaseApplication | undefined;
  getTimelineForApplication: (applicationId: string) => ApplicationTimelineEvent[];
  refreshData: () => Promise<void>;
  
  // Strict Live Database & Diagnostics
  isLoading: boolean;
  isDbConnected: boolean;
  dbError: string | null;
  lastDbSyncTime: Date | null;
  authConfig: MicrosoftAuthConfig | null;
  ssoLogin: (userId: string) => Promise<void>;
  loginWithMicrosoft: () => void;
  logout: () => Promise<void>;
  
  // Workflow Mutations (Direct PostgreSQL Transactions)
  submitPart1: (params: {
    tier: LaptopTier;
    repaymentPeriod: RepaymentPlan;
    estimatedMonthlyAmount: number;
    termsAccepted: boolean;
  }) => Promise<{ success: boolean; application?: PurchaseApplication; error?: string }>;
  
  endorsePart2: (applicationId: string, comments: string) => Promise<{ success: boolean; error?: string }>;
  requestRevisionPart2: (applicationId: string, comments: string) => Promise<{ success: boolean; error?: string }>;
  rejectPart2: (applicationId: string, comments: string) => Promise<{ success: boolean; error?: string }>;
  
  clearPart3: (
    applicationId: string,
    checklist: HRVettingChecklist,
    comments: string
  ) => Promise<{ success: boolean; error?: string }>;
  rejectPart3: (applicationId: string, comments: string) => Promise<{ success: boolean; error?: string }>;
  
  signoffPart4: (params: {
    applicationId: string;
    serialNumber: string;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
    comments: string;
  }) => Promise<{ success: boolean; error?: string }>;
  rejectPart4: (applicationId: string, comments: string) => Promise<{ success: boolean; error?: string }>;
  
  withdrawApplication: (applicationId: string) => Promise<{ success: boolean; error?: string }>;
  resetDemoData: () => Promise<void>;
  
  // UI Helpers
  activeModal: {
    type: 'NEW_REQUEST' | 'DETAIL' | 'ENDORSE_PART2' | 'CLEAR_PART3' | 'SIGNOFF_PART4' | 'PHYSICAL_FORM' | null;
    applicationId?: string;
  };
  openModal: (type: 'NEW_REQUEST' | 'DETAIL' | 'ENDORSE_PART2' | 'CLEAR_PART3' | 'SIGNOFF_PART4' | 'PHYSICAL_FORM', applicationId?: string) => void;
  closeModal: () => void;
}

const STORAGE_KEYS = {
  CURRENT_USER: 'educore_current_user_id',
  SESSION_TOKEN: 'educore_session_token',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '';
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  });

  // Strict live state with no mock fallbacks
  const [applications, setApplications] = useState<PurchaseApplication[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<ApplicationTimelineEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [lastDbSyncTime, setLastDbSyncTime] = useState<Date | null>(null);
  const [authConfig, setAuthConfig] = useState<MicrosoftAuthConfig | null>(null);

  // Microsoft Entra ID Authentication & Session States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeModal, setActiveModal] = useState<{
    type: 'NEW_REQUEST' | 'DETAIL' | 'ENDORSE_PART2' | 'CLEAR_PART3' | 'SIGNOFF_PART4' | 'PHYSICAL_FORM' | null;
    applicationId?: string;
  }>({ type: null });

  // Safe fallback user object to guarantee property access across downstream components
  const resolvedCurrentUser: User = currentUser ||
    users.find((u) => u.id === currentUserId) ||
    ({
      id: currentUserId || '',
      fullName: isAuthenticated ? 'Educore Staff' : 'Unauthenticated',
      email: '',
      role: 'APPLICANT',
      institutionId: '',
      employeeNumber: '',
      department: '',
      jobTitle: '',
      isActive: true,
      entraOid: '',
    } as User);

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'x-user-id': currentUserId || resolvedCurrentUser.id,
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    return headers;
  }, [currentUserId, resolvedCurrentUser.id, sessionToken]);

  // 1. Process URL query parameters for Microsoft OAuth2 / SSO callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoSuccess = params.get('sso_success');
    const ssoUserId = params.get('user_id');
    const ssoToken = params.get('token');
    const err = params.get('auth_error');
    const errMsg = params.get('message');

    if (err) {
      setAuthError(errMsg ? `${err}: ${errMsg}` : err);
    }
    if (ssoToken) {
      setSessionToken(ssoToken);
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, ssoToken);
    }
    if (ssoSuccess && ssoUserId) {
      setCurrentUserId(ssoUserId);
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, ssoUserId);
    }
    if (ssoSuccess || err || ssoToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 2. Fetch Microsoft Auth Config
  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) setAuthConfig(data);
      })
      .catch(() => {});
  }, []);

  // 3. Verify Microsoft Entra ID session against /api/auth/me
  const checkAuthSession = useCallback(async () => {
    try {
      setIsLoadingAuth(true);
      const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || sessionToken;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (savedUserId) {
        headers['x-user-id'] = savedUserId;
      }

      const res = await fetch('/api/auth/me', { headers, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setCurrentUserId(data.user.id);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          return;
        }
      }
      // If unauthenticated or session expired
      setIsAuthenticated(false);
      setCurrentUser(null);
    } catch {
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    checkAuthSession();
  }, [checkAuthSession]);

  // Sync current user selection to local storage
  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserId);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    }
  }, [sessionToken]);

  // Fetch applications, users, institutions, and timeline live from PostgreSQL database
  const refreshData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();

      // Fetch directory records and live database state in parallel
      const [instRes, userRes, appRes, timelineRes] = await Promise.all([
        fetch('/api/institutions'),
        fetch('/api/users'),
        fetch('/api/applications', { headers }),
        fetch('/api/timeline', { headers }),
      ]);

      if (!instRes.ok) {
        throw new Error(`Failed to fetch institutions from PostgreSQL (HTTP ${instRes.status})`);
      }
      if (!userRes.ok) {
        throw new Error(`Failed to fetch directory users from PostgreSQL (HTTP ${userRes.status})`);
      }
      if (!appRes.ok) {
        throw new Error(`Failed to fetch applications from PostgreSQL (HTTP ${appRes.status})`);
      }
      if (!timelineRes.ok) {
        throw new Error(`Failed to fetch timeline logs from PostgreSQL (HTTP ${timelineRes.status})`);
      }

      const [instData, userData, appData, timelineData] = await Promise.all([
        instRes.json(),
        userRes.json(),
        appRes.json(),
        timelineRes.json(),
      ]);

      if (!Array.isArray(userData) || userData.length === 0) {
        throw new Error('PostgreSQL database returned empty user directory.');
      }

      setInstitutions(instData);
      setUsers(userData);
      setApplications(appData);
      setTimelineEvents(timelineData);
      setIsDbConnected(true);
      setDbError(null);
      setLastDbSyncTime(new Date());

      // Only select user if authenticated and currentUserId matches
      if (currentUserId && !userData.some((u: User) => u.id === currentUserId)) {
        // Stale user ID in local storage
        setCurrentUserId('');
      }
    } catch (err: any) {
      console.error('[PostgreSQL Database Error]:', err);
      setIsDbConnected(false);
      setDbError(err.message || 'Unable to connect to live PostgreSQL database.');
      // STRICT: Do not load fallback data
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, currentUserId]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [currentUserId, isAuthenticated]);

  // SSO Login handler
  const ssoLogin = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/sso-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          setSessionToken(data.token);
          localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, data.token);
        }
        if (data.user) {
          setCurrentUser(data.user);
          setCurrentUserId(data.user.id);
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, data.user.id);
          setIsAuthenticated(true);
          setAuthError(null);
        }
        await refreshData();
      } else {
        const err = await res.json().catch(() => ({ error: 'Sign-in failed' }));
        setAuthError(err.error || 'Sign-in failed');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Network error during sign-in');
    }
  };

  const loginWithMicrosoft = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setSessionToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentUserId('');
    localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  // DIRECTORY PERSONAS SWITCHER (COMMENTED OUT — MICROSOFT ENTRA ID / OIDC IS LIVE)
  const switchUser = (userId: string) => {
    // Disabled in live environment: Microsoft Entra ID is the active authentication provider
    console.warn('[Entra ID Auth] Manual directory persona switching is disabled. Microsoft Entra ID is live.');
  };

  const openModal = (
    type: 'NEW_REQUEST' | 'DETAIL' | 'ENDORSE_PART2' | 'CLEAR_PART3' | 'SIGNOFF_PART4' | 'PHYSICAL_FORM',
    applicationId?: string
  ) => {
    setActiveModal({ type, applicationId });
  };

  const closeModal = () => {
    setActiveModal({ type: null });
  };

  // Fetch timeline whenever activeModal has an applicationId
  useEffect(() => {
    if (activeModal.applicationId) {
      fetch(`/api/applications/${activeModal.applicationId}/timeline`, {
        headers: getAuthHeaders(),
      })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((events) => {
          if (Array.isArray(events) && events.length > 0) {
            setTimelineEvents((prev) => {
              const otherEvents = prev.filter((e) => e.applicationId !== activeModal.applicationId);
              return [...otherEvents, ...events];
            });
          }
        })
        .catch((err) => {
          console.error('[PostgreSQL] Failed to fetch application timeline:', err);
        });
    }
  }, [activeModal.applicationId, getAuthHeaders]);

  const resetDemoData = async () => {
    try {
      const res = await fetch('/api/database/reset', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Reset failed: ${err.error || 'Database reset error'}`);
        return;
      }
    } catch (e: any) {
      alert(`Network error resetting database: ${e.message}`);
      return;
    }

    await refreshData();
  };

  // Live PostgreSQL applications are already filtered by RLS on the server;
  // this defense-in-depth ensures client alignment
  const getScopedApplications = (): PurchaseApplication[] => {
    if (resolvedCurrentUser.role === 'APPLICANT') {
      return applications.filter((app) => app.applicantId === resolvedCurrentUser.id);
    }
    if (resolvedCurrentUser.role === 'HEAD_TEACHER') {
      return applications.filter((app) => app.institutionId === resolvedCurrentUser.institutionId);
    }
    return applications;
  };

  const getApplicationById = (id: string): PurchaseApplication | undefined => {
    return applications.find((app) => app.id === id);
  };

  const getTimelineForApplication = (applicationId: string): ApplicationTimelineEvent[] => {
    return timelineEvents
      .filter((t) => t.applicationId === applicationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  // PART 1: Applicant Submission straight to PostgreSQL Database
  const submitPart1 = async ({
    tier,
    repaymentPeriod,
    estimatedMonthlyAmount,
    termsAccepted,
  }: {
    tier: LaptopTier;
    repaymentPeriod: RepaymentPlan;
    estimatedMonthlyAmount: number;
    termsAccepted: boolean;
  }) => {
    if (!termsAccepted) {
      return { success: false, error: 'You must accept the legal terms and payroll deduction mandate.' };
    }

    // Check if applicant already has an in-flight request
    const existingActive = applications.find(
      (app) =>
        app.applicantId === resolvedCurrentUser.id &&
        ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'REVISION_REQUIRED'].includes(app.status)
    );
    if (existingActive) {
      const msg = existingActive.status === 'REVISION_REQUIRED'
        ? `You have an application requiring revision (${existingActive.referenceNumber}). Please withdraw it before submitting a new request.`
        : `You already have an active request in review (${existingActive.referenceNumber}). Only one in-flight application is permitted.`;
      return {
        success: false,
        error: msg,
      };
    }

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          tier,
          repaymentPeriod,
          estimatedMonthlyAmount,
          termsAccepted,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to submit application to PostgreSQL database.' };
      }

      const createdApp: PurchaseApplication = await res.json();
      await refreshData();
      return { success: true, application: createdApp };
    } catch (e: any) {
      return { success: false, error: e.message || 'Network error communicating with database.' };
    }
  };

  // PART 2: Head Teacher / GM Endorsement straight to PostgreSQL Database
  const endorsePart2 = async (applicationId: string, comments: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/endorse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments, actionType: 'ENDORSE' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to endorse application in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Endorse Part 2 error:', e);
      return { success: false, error: e.message || 'Database error during endorsement.' };
    }
  };

  const requestRevisionPart2 = async (applicationId: string, comments: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/endorse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments, actionType: 'REVISION' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to request revision in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Request revision error:', e);
      return { success: false, error: e.message || 'Database error during revision request.' };
    }
  };

  const rejectPart2 = async (applicationId: string, comments: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/endorse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments, actionType: 'REJECT' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to reject application in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Reject Part 2 error:', e);
      return { success: false, error: e.message || 'Database error during rejection.' };
    }
  };

  // PART 3: Central HR Review & Clearance straight to PostgreSQL Database
  const clearPart3 = async (
    applicationId: string,
    checklist: HRVettingChecklist,
    comments: string
  ) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/clearance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ checklist, comments, isRejecting: false }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to record HR clearance in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Clear Part 3 error:', e);
      return { success: false, error: e.message || 'Database error during HR clearance.' };
    }
  };

  const rejectPart3 = async (applicationId: string, comments: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/clearance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments, isRejecting: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to record HR rejection in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Reject Part 3 error:', e);
      return { success: false, error: e.message || 'Database error during HR rejection.' };
    }
  };

  // PART 4: Central IT Provisioning & Closure straight to PostgreSQL Database
  const signoffPart4 = async ({
    applicationId,
    serialNumber,
    monthlyAmount,
    startDate,
    endDate,
    comments,
  }: {
    applicationId: string;
    serialNumber: string;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
    comments: string;
  }) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/signoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          serialNumber,
          monthlyAmount,
          startDate,
          endDate,
          comments,
          isRejecting: false,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to record IT signoff in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Signoff Part 4 error:', e);
      return { success: false, error: e.message || 'Database error during IT signoff.' };
    }
  };

  const rejectPart4 = async (applicationId: string, comments: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/signoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ comments, isRejecting: true }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to record IT rejection in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Reject Part 4 error:', e);
      return { success: false, error: e.message || 'Database error during IT rejection.' };
    }
  };

  // Application Withdrawal straight to PostgreSQL Database
  const withdrawApplication = async (applicationId: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, error: errData.error || 'Failed to withdraw application in database.' };
      }

      await refreshData();
      return { success: true };
    } catch (e: any) {
      console.error('Withdraw application error:', e);
      return { success: false, error: e.message || 'Database error during withdrawal.' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser: resolvedCurrentUser,
        isAuthenticated,
        isLoadingAuth,
        authError,
        setAuthError,
        users,
        institutions,
        applications,
        timelineEvents,
        switchUser,
        getScopedApplications,
        getApplicationById,
        getTimelineForApplication,
        refreshData,
        isLoading,
        isDbConnected,
        dbError,
        lastDbSyncTime,
        authConfig,
        ssoLogin,
        loginWithMicrosoft,
        logout,
        submitPart1,
        endorsePart2,
        requestRevisionPart2,
        rejectPart2,
        clearPart3,
        rejectPart3,
        signoffPart4,
        rejectPart4,
        withdrawApplication,
        resetDemoData,
        activeModal,
        openModal,
        closeModal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
