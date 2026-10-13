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
  
  // Workflow Actions
  submitPart1: (params: {
    tier: LaptopTier;
    repaymentPeriod: RepaymentPlan;
    estimatedMonthlyAmount: number;
    termsAccepted: boolean;
  }) => { success: boolean; application?: PurchaseApplication; error?: string };
  
  endorsePart2: (applicationId: string, comments: string) => void;
  requestRevisionPart2: (applicationId: string, comments: string) => void;
  rejectPart2: (applicationId: string, comments: string) => void;
  
  clearPart3: (
    applicationId: string,
    checklist: HRVettingChecklist,
    comments: string
  ) => void;
  rejectPart3: (applicationId: string, comments: string) => void;
  
  signoffPart4: (params: {
    applicationId: string;
    serialNumber: string;
    monthlyAmount: number;
    startDate: string;
    endDate: string;
    comments: string;
  }) => void;
  rejectPart4: (applicationId: string, comments: string) => void;
  
  withdrawApplication: (applicationId: string) => void;
  resetDemoData: () => void;
  
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
  APPLICATIONS: 'educore_applications_v1',
  TIMELINE: 'educore_timeline_v1',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || MOCK_USERS[0].id;
  });

  const [applications, setApplications] = useState<PurchaseApplication[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved applications', e);
      }
    }
    return INITIAL_APPLICATIONS;
  });

  const [timelineEvents, setTimelineEvents] = useState<ApplicationTimelineEvent[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TIMELINE);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved timeline', e);
      }
    }
    return INITIAL_TIMELINE;
  });

  const [activeModal, setActiveModal] = useState<{
    type: 'NEW_REQUEST' | 'DETAIL' | 'ENDORSE_PART2' | 'CLEAR_PART3' | 'SIGNOFF_PART4' | 'PHYSICAL_FORM' | null;
    applicationId?: string;
  }>({ type: null });

  const currentUser = MOCK_USERS.find((u) => u.id === currentUserId) || MOCK_USERS[0];

  // Fetch from backend API
  const refreshData = useCallback(async () => {
    try {
      const res = await fetch('/api/applications', {
        headers: {
          'x-user-id': currentUserId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
        localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(data));
      }
    } catch (e) {
      // Backend request fallback to local state
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshData();
  }, [refreshData, currentUserId]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timelineEvents));
  }, [timelineEvents]);

  const switchUser = (userId: string) => {
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (user) {
      setCurrentUserId(user.id);
    }
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

  const resetDemoData = async () => {
    try {
      await fetch('/api/database/reset', { method: 'POST' });
    } catch (e) {}

    setApplications(INITIAL_APPLICATIONS);
    setTimelineEvents(INITIAL_TIMELINE);
    setCurrentUserId(MOCK_USERS[0].id);
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

  // PART 1: Applicant Submission
  const submitPart1 = ({
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
        ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF'].includes(app.status)
    );
    if (existingActive) {
      return {
        success: false,
        error: `You already have an active request in review (${existingActive.referenceNumber}). Only one in-flight application is permitted.`,
      };
    }

    const yearStr = new Date().getFullYear().toString();
    const countThisYear = applications.length + 1;
    const refNum = `EDC-ICT-${yearStr}-${countThisYear.toString().padStart(4, '0')}`;
    const appId = `app-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newApp: PurchaseApplication = {
      id: appId,
      referenceNumber: refNum,
      applicantId: currentUser.id,
      institutionId: currentUser.institutionId,
      status: 'PENDING_GM_REVIEW',
      policyVersionTag: 'v1.0-2026',
      legalTextSnapshot: VERBATIM_LEGAL_POLICY,
      termsAccepted: true,
      termsAcceptedAt: timestamp,
      applicantIpAddress: '196.220.124.45',
      applicantUserAgent: navigator.userAgent,
      requestedLaptopTier: tier,
      repaymentPeriod,
      estimatedMonthlyAmountZmw: estimatedMonthlyAmount,
      applicantSignedAt: timestamp,
      applicantDigitalSignature: `SIG-${currentUser.fullName.split(' ')[0].toUpperCase()}-${currentUser.id.slice(0, 8)}-${Date.now()}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setApplications((prev) => [newApp, ...prev]);
    logTimeline(
      appId,
      'SUBMITTED_PART_1',
      'DRAFT',
      'PENDING_GM_REVIEW',
      `Submitted request for ${LAPTOP_CONFIGS[tier].title} (${repaymentPeriod}) with verified legal agreement.`
    );

    // Async persist to backend API
    fetch('/api/applications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({
        tier,
        repaymentPeriod,
        estimatedMonthlyAmount,
        termsAccepted,
      }),
    }).catch((e) => console.log('API sync', e));

    return { success: true, application: newApp };
  };

  // PART 2: Head Teacher / GM Endorsement
  const endorsePart2 = (applicationId: string, comments: string) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'PENDING_HR_REVIEW',
            gmReviewerId: currentUser.id,
            gmReviewerName: currentUser.fullName,
            gmComments: comments || 'Endorsed by School Head Teacher / General Manager.',
            gmSignedAt: timestamp,
            gmDigitalSignature: `SIG-${currentUser.fullName.split(' ')[0].toUpperCase()}-${currentUser.id.slice(0, 8)}-${Date.now()}`,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'ENDORSED_PART_2',
      'PENDING_GM_REVIEW',
      'PENDING_HR_REVIEW',
      comments || 'Endorsed by Campus General Manager / Head Teacher.'
    );

    fetch(`/api/applications/${applicationId}/endorse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ comments, actionType: 'ENDORSE' }),
    }).catch((e) => console.log('API sync', e));
  };

  const requestRevisionPart2 = (applicationId: string, comments: string) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'REVISION_REQUIRED',
            gmReviewerId: currentUser.id,
            gmReviewerName: currentUser.fullName,
            gmComments: comments,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'REVISION_REQUESTED',
      'PENDING_GM_REVIEW',
      'REVISION_REQUIRED',
      comments
    );

    fetch(`/api/applications/${applicationId}/endorse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ comments, actionType: 'REVISION' }),
    }).catch((e) => console.log('API sync', e));
  };

  const rejectPart2 = (applicationId: string, comments: string) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'REJECTED',
            gmReviewerId: currentUser.id,
            gmReviewerName: currentUser.fullName,
            gmComments: comments,
            gmSignedAt: timestamp,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'REJECTED_PART_2',
      'PENDING_GM_REVIEW',
      'REJECTED',
      comments
    );

    fetch(`/api/applications/${applicationId}/endorse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ comments, actionType: 'REJECT' }),
    }).catch((e) => console.log('API sync', e));
  };

  // PART 3: HR Clearance
  const clearPart3 = (
    applicationId: string,
    checklist: HRVettingChecklist,
    comments: string
  ) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'PENDING_IT_SIGNOFF',
            hrReviewerId: currentUser.id,
            hrReviewerName: currentUser.fullName,
            hrComments: comments || 'Full payroll and employment compliance cleared.',
            hrChecklist: checklist,
            hrSignedAt: timestamp,
            hrDigitalSignature: `SIG-${currentUser.fullName.split(' ')[0].toUpperCase()}-${currentUser.id.slice(0, 8)}-${Date.now()}`,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'CLEARED_PART_3',
      'PENDING_HR_REVIEW',
      'PENDING_IT_SIGNOFF',
      `HR Cleared: Debt ratio under 33% verified, probation cleared. Notes: ${comments || 'None'}`
    );

    fetch(`/api/applications/${applicationId}/clearance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ checklist, comments, isRejecting: false }),
    }).catch((e) => console.log('API sync', e));
  };

  const rejectPart3 = (applicationId: string, comments: string) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'REJECTED',
            hrReviewerId: currentUser.id,
            hrReviewerName: currentUser.fullName,
            hrComments: comments,
            hrSignedAt: timestamp,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'REJECTED_PART_3',
      'PENDING_HR_REVIEW',
      'REJECTED',
      comments
    );

    fetch(`/api/applications/${applicationId}/clearance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ comments, isRejecting: true }),
    }).catch((e) => console.log('API sync', e));
  };

  // PART 4: Central IT Provisioning & Closure
  const signoffPart4 = ({
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
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'APPROVED',
            itReviewerId: currentUser.id,
            itReviewerName: currentUser.fullName,
            assetSerialNumber: serialNumber,
            deductedMonthlyAmount: monthlyAmount,
            deductionStartDate: startDate,
            deductionEndDate: endDate,
            itComments: comments || 'Asset unboxed, MDM configured, and signed off.',
            itSignedAt: timestamp,
            itDigitalSignature: `SIG-${currentUser.fullName.split(' ')[0].toUpperCase()}-${currentUser.id.slice(0, 8)}-${Date.now()}`,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'FINALIZED_PART_4',
      'PENDING_IT_SIGNOFF',
      'APPROVED',
      `Asset tagged (${serialNumber}). Deduction: ZMW ${monthlyAmount.toFixed(2)}/mo (${startDate} to ${endDate}). Sealed document ready.`
    );

    fetch(`/api/applications/${applicationId}/signoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({
        serialNumber,
        monthlyAmount,
        startDate,
        endDate,
        comments,
        isRejecting: false,
      }),
    }).catch((e) => console.log('API sync', e));
  };

  const rejectPart4 = (applicationId: string, comments: string) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return {
            ...app,
            status: 'REJECTED',
            itReviewerId: currentUser.id,
            itReviewerName: currentUser.fullName,
            itComments: comments,
            itSignedAt: timestamp,
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'REJECTED_PART_4',
      'PENDING_IT_SIGNOFF',
      'REJECTED',
      comments
    );

    fetch(`/api/applications/${applicationId}/signoff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ comments, isRejecting: true }),
    }).catch((e) => console.log('API sync', e));
  };

  const withdrawApplication = (applicationId: string) => {
    const timestamp = new Date().toISOString();
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId && app.status === 'PENDING_GM_REVIEW') {
          return {
            ...app,
            status: 'CLOSED',
            updatedAt: timestamp,
          };
        }
        return app;
      })
    );

    logTimeline(
      applicationId,
      'WITHDRAWN_BY_APPLICANT',
      'PENDING_GM_REVIEW',
      'CLOSED',
      'Applicant withdrew the application.'
    );

    fetch(`/api/applications/${applicationId}/withdraw`, {
      method: 'POST',
      headers: {
        'x-user-id': currentUser.id,
      },
    }).catch((e) => console.log('API sync', e));
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users: MOCK_USERS,
        institutions: INSTITUTIONS,
        applications,
        timelineEvents,
        switchUser,
        getScopedApplications,
        getApplicationById,
        getTimelineForApplication,
        refreshData,
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
