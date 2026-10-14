import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LAPTOP_CONFIGS, VERBATIM_LEGAL_POLICY } from '../../data/mockData';
import { LaptopTier, RepaymentPlan } from '../../types';
import {
  ShieldAlert,
  Laptop,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  FileCheck,
  AlertCircle,
  Cpu,
  HardDrive,
  Monitor,
  Shield,
  Layers,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Building,
} from 'lucide-react';

export const NewRequestStepper: React.FC = () => {
  const { currentUser, institutions, submitPart1, closeModal } = useApp();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedTier, setSelectedTier] = useState<LaptopTier>('LEVEL_1');
  const [selectedRepayment, setSelectedRepayment] = useState<RepaymentPlan>('TWELVE_MONTHS');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const institution = institutions.find((i) => i.id === currentUser.institutionId);

  // Financial calculations
  const calculateRepayment = (tier: LaptopTier, plan: RepaymentPlan) => {
    const price = LAPTOP_CONFIGS[tier].priceZmw;
    let months = 12;
    if (plan === 'ONE_TO_TWO_MONTHS') months = 2;
    if (plan === 'TWENTY_FOUR_MONTHS') months = 24;

    const monthly = price / months;
    return {
      totalPrice: price,
      months,
      monthlyAmount: monthly,
    };
  };

  const currentRepayment = calculateRepayment(selectedTier, selectedRepayment);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = await submitPart1({
      tier: selectedTier,
      repaymentPeriod: selectedRepayment,
      estimatedMonthlyAmount: currentRepayment.monthlyAmount,
      termsAccepted,
    });

    if (result.success) {
      closeModal();
    } else {
      setErrorMessage(result.error || 'Failed to submit application.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Container */}
      <div
        className="bg-white border border-slate-200 max-w-4xl w-full my-6 overflow-hidden flex flex-col max-h-[92vh] shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
        style={{ borderRadius: 0 }}
      >
        {/* 1. Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (step > 0) setStep((s) => (s - 1) as any);
                else closeModal();
              }}
              className="p-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                New Request: {LAPTOP_CONFIGS[selectedTier].title.split(':')[0]}
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{currentUser.fullName}</span>
                <span aria-hidden="true">·</span>
                <span>{institution?.name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {step < 2 ? (
              <button
                onClick={() => {
                  if (step === 0 && !termsAccepted) {
                    setErrorMessage('You must accept the legal terms to proceed.');
                    return;
                  }
                  setErrorMessage(null);
                  setStep((s) => (s + 1) as any);
                }}
                className="px-4 py-2 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer bg-slate-700"
                style={{ borderRadius: 0 }}
              >
                <span>Continue to {step === 0 ? 'Hardware Selection' : 'Confirmation'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-xs font-bold text-white shadow-sm flex items-center gap-1.5 cursor-pointer bg-emerald-700"
                style={{ borderRadius: 0 }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Submit Application</span>
              </button>
            )}
            <button
              onClick={closeModal}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              style={{ borderRadius: 0 }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Top Stepper Tabs */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-semibold">
            <button
              onClick={() => setStep(0)}
              className={`flex items-center gap-2 py-1 transition-colors cursor-pointer ${
                step === 0 ? 'text-slate-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center text-xs font-black ${
                  step === 0 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
                style={{ borderRadius: 0 }}
              >
                1
              </span>
              <span>Screen 0: Legal Gate</span>
            </button>
            <div className="w-10 h-px bg-slate-200" />
            <button
              onClick={() => {
                if (termsAccepted) setStep(1);
              }}
              className={`flex items-center gap-2 py-1 transition-colors cursor-pointer ${
                step === 1 ? 'text-slate-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center text-xs font-black ${
                  step === 1 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
                style={{ borderRadius: 0 }}
              >
                2
              </span>
              <span>Screen 1: Hardware &amp; Plan</span>
            </button>
            <div className="w-10 h-px bg-slate-200" />
            <button
              onClick={() => {
                if (termsAccepted) setStep(2);
              }}
              className={`flex items-center gap-2 py-1 transition-colors cursor-pointer ${
                step === 2 ? 'text-slate-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span
                className={`w-6 h-6 flex items-center justify-center text-xs font-black ${
                  step === 2 ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}
                style={{ borderRadius: 0 }}
              >
                3
              </span>
              <span>Screen 2: Review &amp; Sign</span>
            </button>
          </div>
        </div>

        {/* 3. Stepper Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
          {errorMessage && (
            <div
              className="p-3 border-l-4 border-red-500 bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2"
              style={{ borderRadius: 0 }}
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SCREEN 0: Mandatory Legal Gate (Verbatim PRD Terms) */}
          {step === 0 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div
                className="bg-white border border-slate-200 p-6 shadow-sm space-y-4"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-slate-600" />
                  <span>Mandatory Policy Agreement &amp; Payroll Deduction Mandate</span>
                </div>

                <div
                  className="bg-slate-50 border border-slate-200 p-5 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-line"
                  style={{ borderRadius: 0 }}
                >
                  {VERBATIM_LEGAL_POLICY}
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Authenticated Staff:
                    </span>
                    <span className="font-bold text-slate-900">{currentUser.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Employee Number:
                    </span>
                    <span className="font-mono font-bold text-slate-900">{currentUser.employeeNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Institution:
                    </span>
                    <span className="text-slate-900 font-semibold">{institution?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                      Effective Date:
                    </span>
                    <span className="font-mono text-slate-900">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <label
                className="flex items-start gap-3 p-4 bg-slate-50 border-l-4 border-slate-700 border border-slate-200 cursor-pointer hover:bg-slate-100/50 transition-colors"
                style={{ borderRadius: 0 }}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    I explicitly confirm and accept these terms
                  </span>
                  I confirm that I have read the ICT Equipment Purchase Scheme policy and agree to monthly payroll deductions being made from my salary as reflected on my monthly payslip.
                </div>
              </label>
            </div>
          )}

          {/* SCREEN 1: Two-column layout */}
          {step === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 cols): Hardware and Repayment Plan */}
              <div className="lg:col-span-2 space-y-6">
                {/* Hardware Tier Selection */}
                <div
                  className="bg-white border border-slate-200 p-5 shadow-sm space-y-4"
                  style={{ borderRadius: 0 }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 1: Select Equipment Tier
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Level 1 Card */}
                    <div
                      onClick={() => setSelectedTier('LEVEL_1')}
                      className={`p-4 border-2 transition-all cursor-pointer relative ${
                        selectedTier === 'LEVEL_1'
                          ? 'border-slate-700 bg-slate-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-1.5 py-0.5 font-mono font-bold text-[10px] border bg-white border-slate-300 text-slate-700"
                          style={{ borderRadius: 0 }}
                        >
                          LEVEL 1
                        </span>
                        <div className="text-sm font-black text-slate-900 font-mono">
                          ZMW 16,800
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 text-xs mb-1">
                        Faculty Standard Productivity
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                        Optimized for daily teaching, LMS management, and administrative workflows.
                      </p>
                      <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-mono">
                        <div>• Intel Core i5-1335U (10C)</div>
                        <div>• 16GB DDR5 5200MHz</div>
                        <div>• 512GB NVMe SSD</div>
                        <div>• 14.0&quot; FHD IPS Display</div>
                      </div>
                    </div>

                    {/* Level 2 Card */}
                    <div
                      onClick={() => setSelectedTier('LEVEL_2')}
                      className={`p-4 border-2 transition-all cursor-pointer relative ${
                        selectedTier === 'LEVEL_2'
                          ? 'border-slate-700 bg-slate-50/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="px-1.5 py-0.5 font-mono font-bold text-[10px] border bg-white border-violet-300 text-violet-700"
                          style={{ borderRadius: 0 }}
                        >
                          LEVEL 2
                        </span>
                        <div className="text-sm font-black text-slate-900 font-mono">
                          ZMW 28,500
                        </div>
                      </div>
                      <div className="font-bold text-slate-900 text-xs mb-1">
                        STEM High-Performance
                      </div>
                      <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                        Engineered for robotics, simulations, and heavy multimedia creation.
                      </p>
                      <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-100 pt-2 font-mono">
                        <div>• Intel Core i7-13700H (14C)</div>
                        <div>• 32GB DDR5 Dual-Channel</div>
                        <div>• 1TB High-Speed SSD</div>
                        <div>• NVIDIA RTX 3050 6GB GPU</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Repayment Period Selection */}
                <div
                  className="bg-white border border-slate-200 p-5 shadow-sm space-y-4"
                  style={{ borderRadius: 0 }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Step 2: Choose Repayment Term
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div
                      onClick={() => setSelectedRepayment('ONE_TO_TWO_MONTHS')}
                      className={`p-3.5 border text-center transition-all cursor-pointer ${
                        selectedRepayment === 'ONE_TO_TWO_MONTHS'
                          ? 'border-2 border-slate-700 bg-slate-50 text-slate-900 font-bold'
                          : 'border border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="text-xs font-bold">1–2 Months</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Accelerated</div>
                    </div>

                    <div
                      onClick={() => setSelectedRepayment('TWELVE_MONTHS')}
                      className={`p-3.5 border text-center transition-all cursor-pointer ${
                        selectedRepayment === 'TWELVE_MONTHS'
                          ? 'border-2 border-slate-700 bg-slate-50 text-slate-900 font-bold'
                          : 'border border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="text-xs font-bold">12 Months</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Standard (1 Year)</div>
                    </div>

                    <div
                      onClick={() => setSelectedRepayment('TWENTY_FOUR_MONTHS')}
                      className={`p-3.5 border text-center transition-all cursor-pointer ${
                        selectedRepayment === 'TWENTY_FOUR_MONTHS'
                          ? 'border-2 border-slate-700 bg-slate-50 text-slate-900 font-bold'
                          : 'border border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                      style={{ borderRadius: 0 }}
                    >
                      <div className="text-xs font-bold">24 Months</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Extended (2 Years)</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (1 col): Pricing Summary Box */}
              <div className="space-y-4">
                <div
                  className="bg-white border border-slate-200 p-5 shadow-sm space-y-4 sticky top-4"
                  style={{ borderRadius: 0 }}
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pricing &amp; Deduction Summary
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Hardware Price:</span>
                      <span className="font-mono font-bold text-slate-800">
                        ZMW {currentRepayment.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Repayment Period:</span>
                      <span className="font-bold text-slate-800">{currentRepayment.months} Months</span>
                    </div>

                    <div
                      className="bg-slate-700 p-4 text-white"
                      style={{ borderRadius: 0 }}
                    >
                      <span className="text-[10px] uppercase font-mono tracking-widest text-slate-200 block">
                        Estimated Monthly Deduction:
                      </span>
                      <div className="text-xl font-black font-mono text-white mt-1">
                        ZMW {currentRepayment.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-xs font-normal text-slate-200"> / mo</span>
                      </div>
                      <span className="text-[10px] text-slate-200 block mt-1">
                        Deducted directly from monthly Educore salary.
                      </span>
                    </div>

                    <div
                      className="bg-white border-l-4 border-emerald-500 border border-emerald-200 p-3 text-[11px] text-emerald-800 space-y-1"
                      style={{ borderRadius: 0 }}
                    >
                      <div className="font-bold flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>33% Debt Limit Check</span>
                      </div>
                      <div>
                        HR checks will ensure this deduction remains within your 33% salary ceiling.
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 text-center pt-2">
                      3-Year On-Site Educore Campus Hardware Care included.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: Digital Sign-off & Confirmation */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div
                className="bg-white border border-slate-200 p-6 shadow-sm space-y-4"
                style={{ borderRadius: 0 }}
              >
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span>Review Application &amp; Digital Signing</span>
                </div>

                <div
                  className="space-y-3 text-xs bg-slate-50 border border-slate-200 p-4"
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex justify-between">
                    <span className="text-slate-500">Selected Hardware:</span>
                    <span className="font-bold text-slate-900">{LAPTOP_CONFIGS[selectedTier].title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Purchase Value:</span>
                    <span className="font-mono font-bold text-slate-900">
                      ZMW {currentRepayment.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Monthly Deduction:</span>
                    <span className="font-mono font-bold text-slate-700 text-sm">
                      ZMW {currentRepayment.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} / mo
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Repayment Duration:</span>
                    <span className="font-bold text-slate-900">{currentRepayment.months} Months</span>
                  </div>
                </div>

                {/* Digital Signing Hash Snapshot */}
                <div
                  className="border border-slate-200 p-4 bg-white text-xs space-y-2"
                  style={{ borderRadius: 0 }}
                >
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Digital Signature Preview:
                  </div>
                  <div
                    className="p-2.5 bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all"
                    style={{ borderRadius: 0 }}
                  >
                    SIG-{currentUser.fullName.split(' ')[0].toUpperCase()}-{currentUser.id.slice(0, 8)}-{Date.now()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Signing as <strong>{currentUser.fullName}</strong> ({currentUser.email})
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
