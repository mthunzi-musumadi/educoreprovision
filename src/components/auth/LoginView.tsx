import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Building2,
  ArrowRight,
  KeyRound,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { UserRole } from '../../types';

interface DemoPersona {
  entraOid: string;
  name: string;
  role: UserRole;
  title: string;
  institution: string;
  badgeColor: string;
  description: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    entraOid: '11111111-1111-4111-8111-111111111101',
    name: 'Chanda Mwamba',
    role: 'APPLICANT',
    title: 'Senior Mathematics Teacher',
    institution: 'Trident College',
    badgeColor: 'bg-slate-100 text-slate-800',
    description: 'Submit any of the 14 forms and track personal requests.',
  },
  {
    entraOid: '11111111-1111-4111-8111-111111111102',
    name: 'Mutale Bwalya',
    role: 'APPLICANT',
    title: 'Physics Teacher',
    institution: 'Sentinel Kabitaka',
    badgeColor: 'bg-slate-100 text-slate-800',
    description: 'Test cross-school RLS isolation (cannot see Trident requests).',
  },
  {
    entraOid: '22222222-2222-4222-8222-222222222201',
    name: 'Kelvin Zulu',
    role: 'LINE_MANAGER',
    title: 'Head of Faculty - STEM',
    institution: 'Trident College',
    badgeColor: 'bg-purple-100 text-purple-800',
    description: 'Step 1 reviewer for Exculpatory & Job Description forms at Trident.',
  },
  {
    entraOid: '33333333-3333-4333-8333-333333333301',
    name: 'Blair Kuhn',
    role: 'HEAD_TEACHER',
    title: 'Headmaster',
    institution: 'Trident College',
    badgeColor: 'bg-amber-100 text-amber-800',
    description: 'Step 1 school endorsement for Trident IT, HR, Finance & Travel forms.',
  },
  {
    entraOid: '33333333-3333-4333-8333-333333333302',
    name: 'Jane Mwanza',
    role: 'HEAD_TEACHER',
    title: 'Head Teacher',
    institution: 'Sentinel Kabitaka',
    badgeColor: 'bg-amber-100 text-amber-800',
    description: 'Step 1 school endorsement strictly scoped to Sentinel Kabitaka.',
  },
  {
    entraOid: '44444444-4444-4444-8444-444444444401',
    name: 'Thandiwe Phiri',
    role: 'HR_MANAGER',
    title: 'Group HR Manager',
    institution: 'Educore Central Admin',
    badgeColor: 'bg-blue-100 text-blue-800',
    description: 'Central HR vetting & approval across all 9 HR & IT workflows.',
  },
  {
    entraOid: '55555555-5555-4555-8555-555555555501',
    name: 'Mulenga Banda',
    role: 'IT_MANAGER',
    title: 'Head of ICT & Infrastructure',
    institution: 'Educore Central Admin',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    description: 'Final Step 3 asset serial assignment & deduction schedule sign-off.',
  },
  {
    entraOid: '66666666-6666-4666-8666-666666666601',
    name: 'Lombe Kasonde',
    role: 'FINANCE_MANAGER',
    title: 'Group Finance Manager',
    institution: 'Educore Central Admin',
    badgeColor: 'bg-teal-100 text-teal-800',
    description: 'Final sign-off for Advances, Bank Changes, Stores & Event Completion.',
  },
  {
    entraOid: '77777777-7777-4777-8777-777777777701',
    name: 'Dambo Simwanza',
    role: 'LOGISTICS_MANAGER',
    title: 'Logistics & Procurement Coordinator',
    institution: 'Educore Central Admin',
    badgeColor: 'bg-indigo-100 text-indigo-800',
    description: 'Reviews Travel Requests & inspects Stock Returns.',
  },
  {
    entraOid: '99999999-9999-4999-8999-999999999901',
    name: 'Mthunzi Musumadi',
    role: 'SUPER_ADMIN',
    title: 'Systems Architect',
    institution: 'Educore Central Admin',
    badgeColor: 'bg-rose-100 text-rose-800',
    description: 'Global oversight and override capability across all steps.',
  },
];

export const LoginView: React.FC = () => {
  const { setActiveEntraOid } = useAppContext();
  const [customOid, setCustomOid] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-6">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Microsoft Entra ID · PostgreSQL 18 RLS Session Simulator
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Educore Provision Workflow Engine
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Select an authenticated directory persona below to bind <code className="text-blue-400">request.jwt.claim.sub</code> and test role-based routing across IT, HR, Finance, and Logistics.
          </p>
        </div>

        {/* Persona Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEMO_PERSONAS.map((persona) => (
            <button
              key={persona.entraOid}
              type="button"
              onClick={() => setActiveEntraOid(persona.entraOid)}
              className="text-left p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500 hover:bg-slate-900 transition group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${persona.badgeColor}`}
                  >
                    {persona.role.replace(/_/g, ' ')}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {persona.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{persona.title}</p>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                  {persona.institution}
                </div>
              </div>

              <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                {persona.description}
              </p>
            </button>
          ))}
        </div>

        {/* Custom Entra OID Input */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
            <KeyRound className="w-4 h-4 text-blue-400" />
            <span>Custom Entra OID:</span>
          </div>
          <input
            type="text"
            value={customOid}
            onChange={(e) => setCustomOid(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
          />
          <button
            type="button"
            disabled={!customOid.trim()}
            onClick={() => setActiveEntraOid(customOid.trim())}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 shrink-0"
          >
            Bind Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;