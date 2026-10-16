import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserProfile,
  Site,
  EquipmentTier,
  FormDefinition,
  PolicyVersion,
  WorkflowApplication,
  LegacyPurchaseApplication,
  FormCode,
  FormPayloadMap,
  LifecycleStatus,
} from '../types';

interface SubmitFormInput<K extends FormCode> {
  formCode: K;
  payload: FormPayloadMap[K];
  submitImmediately?: boolean;
  policyVersionId?: string;
  termsAccepted?: boolean;
  digitalSignature?: string;
}

interface StepDecisionInput {
  applicationId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  comments?: string;
  digitalSignature?: string;
  checklistData?: Record<string, boolean>;
  stepMetadata?: Record<string, unknown>;
}

export interface MicrosoftAuthConfig {
  configured: boolean;
  tenantId: string;
  clientId: string;
  redirectUri: string;
  provider: string;
}

interface AppContextType {
  // Auth & Active Session
  entraOid: string | null;
  currentUser: UserProfile | null;
  setActiveEntraOid: (oid: string | null) => void;
  authConfig: MicrosoftAuthConfig | null;
  loginWithMicrosoft: () => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  error: string | null;

  // Reference Catalogs
  sites: Site[];
  equipmentTiers: EquipmentTier[];
  formDefinitions: FormDefinition[];
  policies: PolicyVersion[];

  // Live Queues
  applications: WorkflowApplication[];
  legacyIctApplications: LegacyPurchaseApplication[];
  refreshApplications: (filters?: {
    formCode?: FormCode;
    department?: string;
    status?: LifecycleStatus;
    awaitingMyRoleOnly?: boolean;
  }) => Promise<void>;

  // Unified Workflow Actions (Works for all 14 forms)
  submitWorkflowForm: <K extends FormCode>(input: SubmitFormInput<K>) => Promise<WorkflowApplication<K>>;
  submitStepDecision: (input: StepDecisionInput) => Promise<void>;
  withdrawApplication: (applicationId: string) => Promise<void>;

  // Legacy ICT Actions (Keeps EndorsementModal, HRClearanceModal, ITSignoffModal working)
  endorseByGM: (
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
    comments?: string
  ) => Promise<void>;
  clearByHR: (
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ) => Promise<void>;
  signOffByIT: (
    applicationId: string,
    decision: 'APPROVED' | 'REJECTED',
    details: {
      assetSerialNumber?: string;
      deductedMonthlyAmountZmw?: number;
      deductionStartDate?: string;
      deductionEndDate?: string;
      comments?: string;
    }
  ) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_OID_KEY = 'educore_active_entra_oid';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entraOid, setEntraOidState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_OID_KEY);
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipmentTiers, setEquipmentTiers] = useState<EquipmentTier[]>([]);
  const [formDefinitions, setFormDefinitions] = useState<FormDefinition[]>([]);
  const [policies, setPolicies] = useState<PolicyVersion[]>([]);
  const [applications, setApplications] = useState<WorkflowApplication[]>([]);
  const [legacyIctApplications, setLegacyIctApplications] = useState<LegacyPurchaseApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authConfig, setAuthConfig] = useState<MicrosoftAuthConfig | null>(null);

  const setActiveEntraOid = useCallback((oid: string | null) => {
    if (oid) {
      localStorage.setItem(STORAGE_OID_KEY, oid);
    } else {
      localStorage.removeItem(STORAGE_OID_KEY);
    }
    setEntraOidState(oid);
  }, []);

  // Listen for OAuth redirects and fetch Microsoft Entra configuration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get('auth_error');
    const ssoSuccess = params.get('sso_success');
    const incomingOid = params.get('entra_oid');

    if (authError) {
      setError(decodeURIComponent(authError));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (ssoSuccess && incomingOid) {
      setActiveEntraOid(incomingOid);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetch('/api/auth/config')
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) setAuthConfig(data);
      })
      .catch(() => {});
  }, [setActiveEntraOid]);

  const loginWithMicrosoft = useCallback(() => {
    window.location.href = '/api/auth/login';
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setActiveEntraOid(null);
    setCurrentUser(null);
  }, [setActiveEntraOid]);

  // Authenticated fetch wrapper that injects x-entra-oid for Postgres RLS
  const apiFetch = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      if (!entraOid) {
        throw new Error('No active user session (missing Entra OID).');
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-entra-oid': entraOid,
          ...(options.headers || {}),
        },
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || `Request failed with status ${response.status}`);
      }
      return body as T;
    },
    [entraOid]
  );

  const refreshApplications = useCallback(
    async (filters?: {
      formCode?: FormCode;
      department?: string;
      status?: LifecycleStatus;
      awaitingMyRoleOnly?: boolean;
    }) => {
      if (!entraOid) return;

      const params = new URLSearchParams();
      if (filters?.formCode) params.set('formCode', filters.formCode);
      if (filters?.department) params.set('department', filters.department);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.awaitingMyRoleOnly) params.set('awaitingMyRoleOnly', 'true');

      const queryString = params.toString() ? `?${params.toString()}` : '';

      const [genericApps, legacyApps] = await Promise.all([
        apiFetch<WorkflowApplication[]>(`/api/applications${queryString}`),
        apiFetch<LegacyPurchaseApplication[]>(`/api/legacy/ict-applications`),
      ]);

      setApplications(genericApps);
      setLegacyIctApplications(legacyApps);
    },
    [entraOid, apiFetch]
  );

  // Bootstrap reference data & queues whenever entraOid changes
  useEffect(() => {
    if (!entraOid) {
      setCurrentUser(null);
      setApplications([]);
      setLegacyIctApplications([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const boot = await apiFetch<{
          currentUser: UserProfile;
          sites: Site[];
          equipmentTiers: EquipmentTier[];
          formDefinitions: FormDefinition[];
          policies: PolicyVersion[];
        }>('/api/bootstrap');

        if (!isMounted) return;
        setCurrentUser(boot.currentUser);
        setSites(boot.sites);
        setEquipmentTiers(boot.equipmentTiers);
        setFormDefinitions(boot.formDefinitions);
        setPolicies(boot.policies);

        await refreshApplications();
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [entraOid, apiFetch, refreshApplications]);

  // ==========================================================================
  // UNIFIED WORKFLOW MUTATIONS (ALL 14 FORMS)
  // ==========================================================================

  const submitWorkflowForm = useCallback(
    async <K extends FormCode>(input: SubmitFormInput<K>): Promise<WorkflowApplication<K>> => {
      const created = await apiFetch<WorkflowApplication<K>>('/api/applications', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      await refreshApplications();
      return created;
    },
    [apiFetch, refreshApplications]
  );

  const submitStepDecision = useCallback(
    async (input: StepDecisionInput): Promise<void> => {
      await apiFetch(`/api/applications/${input.applicationId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: input.decision,
          comments: input.comments,
          digitalSignature: input.digitalSignature,
          checklistData: input.checklistData,
          stepMetadata: input.stepMetadata,
        }),
      });
      await refreshApplications();
    },
    [apiFetch, refreshApplications]
  );

  const withdrawApplication = useCallback(
    async (applicationId: string): Promise<void> => {
      await apiFetch(`/api/applications/${applicationId}/withdraw`, {
        method: 'POST',
      });
      await refreshApplications();
    },
    [apiFetch, refreshApplications]
  );

  // ==========================================================================
  // LEGACY ICT WRAPPERS (Delegates directly to the unified decision engine)
  // ==========================================================================

  const endorseByGM = useCallback(
    async (
      applicationId: string,
      decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
      comments?: string
    ) => {
      await submitStepDecision({ applicationId, decision, comments });
    },
    [submitStepDecision]
  );

  const clearByHR = useCallback(
    async (
      applicationId: string,
      decision: 'APPROVED' | 'REJECTED',
      comments?: string
    ) => {
      await submitStepDecision({
        applicationId,
        decision,
        comments,
      });
    },
    [submitStepDecision]
  );

  const signOffByIT = useCallback(
    async (
      applicationId: string,
      decision: 'APPROVED' | 'REJECTED',
      details: {
        assetSerialNumber?: string;
        deductedMonthlyAmountZmw?: number;
        deductionStartDate?: string;
        deductionEndDate?: string;
        comments?: string;
      }
    ) => {
      await submitStepDecision({
        applicationId,
        decision,
        comments: details.comments,
        stepMetadata: {
          asset_serial_number: details.assetSerialNumber,
          deducted_monthly_amount_zmw: details.deductedMonthlyAmountZmw,
          deduction_start_date: details.deductionStartDate,
          deduction_end_date: details.deductionEndDate,
        },
      });
    },
    [submitStepDecision]
  );

  return (
    <AppContext.Provider
      value={{
        entraOid,
        currentUser,
        setActiveEntraOid,
        authConfig,
        loginWithMicrosoft,
        logout,
        isLoading,
        error,
        sites,
        equipmentTiers,
        formDefinitions,
        policies,
        applications,
        legacyIctApplications,
        refreshApplications,
        submitWorkflowForm,
        submitStepDecision,
        withdrawApplication,
        endorseByGM,
        clearByHR,
        signOffByIT,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};