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
  INITIAL_APPLICATIONS,
  INITIAL_TIMELINE,
  INSTITUTIONS,
  LAPTOP_CONFIGS,
  MOCK_USERS,
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
  users: User[];
  institutions: Institution[];
  applications: PurchaseApplication[];
  timelineEvents: ApplicationTimelineEvent[];
  switchUser: (userId: string) => void;
  getScopedApplications: () => PurchaseApplication[];
  getApplicationById: (id: string) => PurchaseApplication | undefined;
  getTimelineForApplication: (applicationId: string) => ApplicationTimelineEvent[];
  refreshData: () => Promise<void>;
  
  // Database & Microsoft OIDC Live Status
  isDbConnected: boolean;
  lastDbSyncTime: Date | null;
  authConfig: MicrosoftAuthConfig | null;
  ssoLogin: (userId: string) => Promise<void>;
  loginWithMicrosoft: () => void;
  logout: () => Promise<void>;
  
  // Workflow Actions
  submitPart1: (params: {
    tier: LaptopTier;
    repaymentPeriod: RepaymentPlan;
    estimatedMonthlyAmount: number;
    termsAccepted: boolean;
  }) => Promise<{ success: boolean; application?: PurchaseApplication; error?: string }>;
  
  endorsePart2: (applicationId: string, comments: string) => Promise<void>;
  requestRevisionPart2: (applicationId: string, comments: string) => Promise<void>;
  rejectPart2: (applicationId: string, comments: string) => Promise<void>;
  
  clearPart3: (
    applicationId: string,
    checklist: HRVettingChecklist,
    comments: string
  ) => Promise<void>;
  rejectPart3: (applicationId: string, comments: string) => Promise<void>;
  
  signoffPart4: (params: {
    applicationId: string;
    serialNumber: string;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
    comments: string;
  }) => Promise<void>;
  rejectPart4: (applicationId: string, comments: string) => Promise<void>;
  
  withdrawApplication: (applicationId: string) => Promise<void>;
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
  APPLICATIONS: 'educore_applications_v1',
  TIMELINE: 'educore_timeline_v1',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || MOCK_USERS[0].id;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
  });

  const [applications, setApplications] = useState<PurchaseApplication[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_APPLICATIONS;
  });

  const [timelineEvents, setTimelineEvents] = useState<ApplicationTimelineEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMELINE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_TIMELINE;
  });

  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [institutions, setInstitutions] = useState<Institution[]>(INSTITUTIONS);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [lastDbSyncTime, setLastDbSyncTime] = useState<Date | null>(new Date());
  const [authConfig, setAuthConfig] = useState<MicrosoftAuthConfig | null>(null);

  const [activeModal, setActiveModal] = useState<{
    type: 'NEW_REQUEST' | 'DETAIL' | 'ENDORSE_PART2' | 'CLEAR_PART3' | 'SIGNOFF_PART4' | 'PHYSICAL_FORM' | null;
    applicationId?: string;
  }>({ type: null });

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'x-user-id': currentUserId,
    };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    return headers;
  }, [currentUserId, sessionToken]);

  // Check URL query parameters for SSO callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoSuccess = params.get('sso_success');
    const ssoUserId = params.get('user_id');
    if (ssoSuccess && ssoUserId) {
      setCurrentUserId(ssoUserId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch Microsoft Auth Config
  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) setAuthConfig(data);
      })
      .catch(() => {});
  }, []);

  // Fetch institutions and users live from PostgreSQL database
  useEffect(() => {
    fetch('/api/institutions')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setInstitutions(data);
          setIsDbConnected(true);
        }
      })
      .catch(() => setIsDbConnected(false));

    fetch('/api/users')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
          setIsDbConnected(true);
        }
      })
      .catch(() => setIsDbConnected(false));
  }, []);

  // Fetch applications & timeline live from backend database
  const refreshData = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/applications', { headers });
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(data));
        setIsDbConnected(true);
        setLastDbSyncTime(new Date());
      }

      // Pre-fetch timeline events under RLS
      const timelineRes = await fetch('/api/timeline', { headers });
      if (timelineRes.ok) {
        const tData = await timelineRes.json();
        if (Array.isArray(tData)) {
          setTimelineEvents(tData);
          localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(tData));
        }
      }
    } catch (e) {
      setIsDbConnected(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    refreshData();
  }, [refreshData, currentUserId]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
    }
  }, [sessionToken]);

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
        }
        setCurrentUserId(userId);
        await refreshData();
      } else {
        setCurrentUserId(userId);
      }
    } catch {
      setCurrentUserId(userId);
    }
  };

  const loginWithMicrosoft = () => {
    window.location.href = '/api/auth/login';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setSessionToken(null);
    setCurrentUserId(users[0]?.id || MOCK_USERS[0].id);
  };

  const switchUser = (userId: string) => {
    ssoLogin(userId);
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
        .then((r) => r.ok && r.json())
        .then((events) => {
          if (Array.isArray(events) && events.length > 0) {
            setTimelineEvents((prev) => {
              const otherEvents = prev.filter((e) => e.applicationId !== activeModal.applicationId);
              return [...otherEvents, ...events];
            });
          }
        })
        .catch(() => {});
    }
  }, [activeModal.applicationId, getAuthHeaders]);

  const resetDemoData = async () => {
    try {
      await fetch('/api/database/reset', { method: 'POST' });
    } catch (e) {}

    await refreshData();
    setTimelineEvents(INITIAL_TIMELINE);
    setCurrentUserId(users[0]?.id || MOCK_USERS[0].id);
    localStorage.removeItem(STORAGE_KEYS.APPLICATIONS);
    localStorage.removeItem(STORAGE_KEYS.TIMELINE);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  };

  // Enforces Row-Level Security matching Section 6 of PRD
  const getScopedApplications = (): PurchaseApplication[] => {
    if (currentUser.role === 'APPLICANT') {
      return applications.filter((app) => app.applicantId === currentUser.id);
    }
    if (currentUser.role === 'HEAD_TEACHER') {
      return applications.filter((app) => app.institutionId === currentUser.institutionId);
    }
    // HR_MANAGER, IT_MANAGER, and SUPER_ADMIN have global organization visibility
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

  const logTimeline = (
    applicationId: string,
    actionType: string,
    fromStatus: ApplicationStatus | undefined,
    toStatus: ApplicationStatus,
    comments?: string,
    isInternal: boolean = false
  ) => {
    const newEvent: ApplicationTimelineEvent = {
      id: `time-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      applicationId,
      actorId: currentUser.id,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      actionType,
      fromStatus,
      toStatus,
      comments,
      isInternal,
      createdAt: new Date().toISOString(),
    };
    setTimelineEvents((prev) => [...prev, newEvent]);
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
        app.applicantId === currentUser.id &&
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
        return { success: false, error: errData.error || 'Failed to submit application to database.' };
      }

      const createdApp: PurchaseApplication = await res.json();
      setApplications((prev) => [createdApp, ...prev.filter((a) => a.id !== createdApp.id)]);

      logTimeline(
        createdApp.id,
        'SUBMITTED_PART_1',
        'DRAFT',
        'PENDING_GM_REVIEW',
        `Submitted request for ${LAPTOP_CONFIGS[tier].title} (${repaymentPeriod}) with verified legal agreement.`
      );

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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Endorse Part 2 error:', e);
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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Request revision error:', e);
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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Reject Part 2 error:', e);
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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Clear Part 3 error:', e);
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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Reject Part 3 error:', e);
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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Signoff Part 4 error:', e);
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

      if (res.ok) {
        const updatedApp = await res.json();
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? updatedApp : a)));
      }
      await refreshData();
    } catch (e) {
      console.error('Reject Part 4 error:', e);
    }
  };

  // Application Withdrawal straight to PostgreSQL Database
  const withdrawApplication = async (applicationId: string) => {
    try {
      const res = await fetch(`/api/applications/${applicationId}/withdraw`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status: 'CLOSED' } : a))
        );
      }
      await refreshData();
    } catch (e) {
      console.error('Withdraw application error:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        institutions,
        applications,
        timelineEvents,
        switchUser,
        getScopedApplications,
        getApplicationById,
        getTimelineForApplication,
        refreshData,
        isDbConnected,
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
