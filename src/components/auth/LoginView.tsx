import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Building2,
  ArrowRight,
  KeyRound,
  Search,
  Lock,
  CheckCircle2,
  MapPin,
  Layers,
  X,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { UserRole, ROLE_LABELS } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export interface DemoPersona {
  entraOid: string;
  name: string;
  role: UserRole;
  title: string;
  site: string;
  siteCode: string;
  badgeColor: string;
  category: 'APPLICANT' | 'SITE_LEADERSHIP' | 'CENTRAL' | 'EXECUTIVE_ADMIN';
  description: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    entraOid: '11111111-1111-4111-8111-111111111101',
    name: 'Chanda Mwamba',
    role: 'APPLICANT',
    title: 'Senior Mathematics Teacher',
    site: 'Trident College Solwezi (TCL)',
    siteCode: 'TCL',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    category: 'APPLICANT',
    description: 'Bound to TCL site. Can submit all 18 forms and view strictly personal applications.',
  },
  {
    entraOid: '11111111-1111-4111-8111-111111111102',
    name: 'Mutale Bwalya',
    role: 'APPLICANT',
    title: 'Physics Teacher',
    site: 'Sentinel Kabitaka Secondary (SKAB Secondary)',
    siteCode: 'SKAB_SEC',
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-200',
    category: 'APPLICANT',
    description: 'Bound to SKAB_SEC site. Strictly isolated from TCL and other site records via RLS.',
  },
  {
    entraOid: '22222222-2222-4222-8222-222222222201',
    name: 'Kelvin Zulu',
    role: 'LINE_MANAGER',
    title: 'Head of Faculty - STEM',
    site: 'Trident College Solwezi (TCL)',
    siteCode: 'TCL',
    badgeColor: 'bg-violet-50 text-violet-800 border-violet-200',
    category: 'SITE_LEADERSHIP',
    description: 'Site-bound Step 1 reviewer for TCL applications requiring Line Manager endorsement.',
  },
  {
    entraOid: '33333333-3333-4333-8333-333333333301',
    name: 'Blair Kuhn',
    role: 'HEAD_TEACHER',
    title: 'Headmaster',
    site: 'Trident College Solwezi (TCL)',
    siteCode: 'TCL',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    category: 'SITE_LEADERSHIP',
    description: 'Site-bound Step 1/2 Head Teacher endorsement strictly for TCL applications involving Site Head.',
  },
  {
    entraOid: '33333333-3333-4333-8333-333333333302',
    name: 'Jane Mwanza',
    role: 'HEAD_TEACHER',
    title: 'Head Teacher',
    site: 'Sentinel Kabitaka Secondary (SKAB Secondary)',
    siteCode: 'SKAB_SEC',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    category: 'SITE_LEADERSHIP',
    description: 'Site-bound Head Teacher endorsement strictly scoped to SKAB Secondary applications.',
  },
  {
    entraOid: '44444444-4444-4444-8444-444444444402',
    name: 'Grace Lungu',
    role: 'HR_OFFICER',
    title: 'HR Operations Officer',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    category: 'CENTRAL',
    description: 'Sees only applications where HR Officer is in the approval pipeline (e.g. Child Admission).',
  },
  {
    entraOid: '44444444-4444-4444-8444-444444444401',
    name: 'Thandiwe Phiri',
    role: 'HR_MANAGER',
    title: 'Group HR Manager',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    category: 'CENTRAL',
    description: 'Sees only applications involving HR Manager clearance across HR & ICT workflows.',
  },
  {
    entraOid: '55555555-5555-4555-8555-555555555501',
    name: 'Mulenga Banda',
    role: 'IT_MANAGER',
    title: 'Head of ICT & Infrastructure',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    category: 'CENTRAL',
    description: 'Least-privilege scoped strictly to ICT Equipment Purchase applications requiring IT sign-off.',
  },
  {
    entraOid: '66666666-6666-4666-8666-666666666601',
    name: 'Lombe Kasonde',
    role: 'FINANCE_MANAGER',
    title: 'Group Finance Manager',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-teal-50 text-teal-800 border-teal-200',
    category: 'CENTRAL',
    description: 'Scoped strictly to applications with a Finance Manager approval step (Advances, Bank, Stores).',
  },
  {
    entraOid: '77777777-7777-4777-8777-777777777701',
    name: 'Dambo Simwanza',
    role: 'LOGISTICS_MANAGER',
    title: 'Logistics & Procurement Coordinator',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    category: 'CENTRAL',
    description: 'Scoped strictly to Travel Requests, Stock Returns & Purchase Requisitions involving Logistics.',
  },
  {
    entraOid: '88888888-8888-4888-8888-888888888801',
    name: 'Dr. Alistair Vance',
    role: 'EXECUTIVE_HEAD',
    title: 'Executive Head of Sites',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    category: 'EXECUTIVE_ADMIN',
    description: 'Executive authorization for Child Admission & Professional Development workflows.',
  },
  {
    entraOid: '88888888-8888-4888-8888-888888888802',
    name: 'Chilufya Mwale',
    role: 'COO',
    title: 'Chief Operating Officer',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    category: 'EXECUTIVE_ADMIN',
    description: 'Executive COO sign-off for Salary Advances & Manpower Requisitions.',
  },
  {
    entraOid: '99999999-9999-4999-8999-999999999901',
    name: 'Mthunzi Musumadi',
    role: 'SUPER_ADMIN',
    title: 'Systems Architect & Governance Lead',
    site: 'Central Administration',
    siteCode: 'CENTRAL',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    category: 'EXECUTIVE_ADMIN',
    description: 'Central Administration governance oversight across all 9 sites and 18 workflows.',
  },
];

export const LoginView: React.FC = () => {
  const { setActiveEntraOid } = useAppContext();
  const [customOid, setCustomOid] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'APPLICANT' | 'SITE_LEADERSHIP' | 'CENTRAL' | 'EXECUTIVE_ADMIN'
  >('ALL');

  const filteredPersonas = useMemo(() => {
    return DEMO_PERSONAS.filter((p) => {
      const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.site.toLowerCase().includes(q) ||
        p.siteCode.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        ROLE_LABELS[p.role].toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, categoryFilter]);

  const getInitials = (name: string) => {
    const clean = name.replace(/^Dr\.\s+/i, '').trim();
    const parts = clean.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between">
      {/* Top Corporate Security Banner */}
      <header className="bg-slate-950 text-white border-b border-slate-800 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              Microsoft Entra ID OIDC
            </span>
            <span className="text-slate-400 hidden sm:inline">
              Strict Site-Bound Row-Level Security (RLS) &amp; Least-Privilege RBAC Enforced
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />9 Active Sites
            </span>
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />18 Statutory Workflows
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6 flex-1">
        {/* Executive Brand Hero Card */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center p-1.5 shadow-xs border border-slate-800 shrink-0">
                <img
                  src="/logo.png"
                  alt="Educore Provision Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Educore Provision
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                    Enterprise v2.4
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Multi-Site Approval &amp; Statutory Compliance Portal
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
              Select a verified workspace persona below to authenticate. Every session enforces{' '}
              <span className="font-semibold text-slate-800">Least-Privilege Access</span>—users only view and act upon applications that directly involve their role and assigned{' '}
              <span className="font-semibold text-slate-800">Site</span>.
            </p>
          </div>

          {/* Enterprise SSO Action + Security Pill */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
            <a
              href="/api/auth/login"
              className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>Sign in with Microsoft Entra ID</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </a>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-md font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>PostgreSQL `educore_app` RLS Active</span>
            </div>
          </div>
        </div>

        {/* Role Category Filter Bar & Directory Search */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Instant Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Search directory personas by name, role, or site"
              placeholder="Search by name, role, or site code (e.g. TCL, SKAB_SEC,CENTRAL)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/70 hover:bg-white focus:bg-white focus:border-sky-600 focus:outline-hidden transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Segmented Category Filter */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg relative">
            {(
              [
                { id: 'ALL', label: `All Personas (${DEMO_PERSONAS.length})` },
                { id: 'APPLICANT', label: 'Site Applicants (2)' },
                { id: 'SITE_LEADERSHIP', label: 'Site Leadership (3)' },
                { id: 'CENTRAL', label: 'Central Specialists (5)' },
                { id: 'EXECUTIVE_ADMIN', label: 'Executive & Admin (3)' },
              ] as const
            ).map((tab) => (
              <motion.button
                key={tab.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer relative z-0 transition-colors ${
                  categoryFilter === tab.id
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {categoryFilter === tab.id && (
                  <motion.div
                    layoutId="loginCategoryPill"
                    className="absolute inset-0 bg-white rounded-md -z-10 shadow-xs"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {tab.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Persona Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredPersonas.map((persona) => {
              const initials = getInitials(persona.name);
              return (
                <motion.button
                  key={persona.entraOid}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setActiveEntraOid(persona.entraOid)}
                  className="corporate-card-interactive text-left p-5 rounded-xl flex flex-col justify-between gap-4 group cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <div className="space-y-3.5 w-full">
                    {/* Top Role Pill & Site Code Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${persona.badgeColor}`}
                      >
                        {ROLE_LABELS[persona.role]}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                        {persona.siteCode}
                      </span>
                    </div>

                    {/* Identity Block */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 group-hover:bg-blue-700 transition-colors">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                          {persona.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">{persona.title}</p>
                      </div>
                    </div>

                    {/* Assigned Site Pill */}
                    <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200/70">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{persona.site}</span>
                    </div>
                  </div>

                  {/* Access Scope Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-3 w-full">
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {persona.description}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 shrink-0 group-hover:translate-x-1 transition-transform">
                      Enter <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Manual Entra OID Session Binding */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <KeyRound className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">Direct OID Claim Binding:</span>
          </div>
          <input
            type="text"
            value={customOid}
            onChange={(e) => setCustomOid(e.target.value)}
            placeholder="Paste Microsoft Entra Object ID (UUID)..."
            aria-label="Custom Microsoft Entra Object ID"
            className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs font-mono text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-hidden"
          />
          <button
            type="button"
            disabled={!customOid.trim()}
            onClick={() => setActiveEntraOid(customOid.trim())}
            className="w-full sm:w-auto px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white disabled:opacity-40 shrink-0 transition cursor-pointer"
          >
            Bind Claim
          </button>
        </div>
      </main>

      {/* Corporate Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-500">
        Educore Services Limited · Site-Bound Governance &amp; Workflow Provisioning Engine
      </footer>
    </div>
  );
};

export default LoginView;