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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const result = submitPart1({
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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              New ICT Equipment Purchase Application
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{currentUser.fullName}</span>
              <span aria-hidden="true">·</span>
              <span>{currentUser.employeeNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{institution?.name}</span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between max-w-md mx-auto text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs ${
                  step === 0
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                1
              </span>
              <span className={`font-medium ${step === 0 ? 'text-slate-900' : 'text-slate-500'}`}>
                Legal Gate
              </span>
            </div>
            <div className="w-8 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs ${
                  step === 1
                    ? 'bg-emerald-600 text-white'
                    : step > 1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                2
              </span>
              <span className={`font-medium ${step === 1 ? 'text-slate-900' : 'text-slate-500'}`}>
                Part 1 Selection
              </span>
            </div>
            <div className="w-8 h-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-xs ${
                  step === 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                3
              </span>
              <span className={`font-medium ${step === 2 ? 'text-slate-900' : 'text-slate-500'}`}>
                Sign & Submit
              </span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SCREEN 0: Mandatory Legal Gate */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50">
                <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-sm mb-3">
                  <ShieldAlert className="w-4 h-4 text-emerald-700" />
                  <span>Mandatory Policy Agreement & Payroll Deduction Mandate</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-md p-4 text-xs text-slate-700 leading-relaxed font-mono whitespace-pre-line shadow-xs">
                  {VERBATIM_LEGAL_POLICY}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Applicant Name:</span>
                    <span className="font-semibold text-slate-800">{currentUser.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employee Number:</span>
                    <span className="font-mono text-slate-800">{currentUser.employeeNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Campus / Institution:</span>
                    <span className="text-slate-800">{institution?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Current Date:</span>
                    <span className="font-mono text-slate-800">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg cursor-pointer transition-colors hover:bg-emerald-50">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900 block mb-0.5">
                    I explicitly confirm and accept these terms
                  </span>
                  I confirm that I have read the ICT Purchase Scheme policy and agree to monthly payroll deductions being made from my salary as reflected on my monthly payslip.
                </div>
              </label>
            </div>
          )}

          {/* SCREEN 1: Part 1 Form & Hardware Selection */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Laptop Requested */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Part 1 (a) — Select Laptop Requested
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['LEVEL_1', 'LEVEL_2'] as LaptopTier[]).map((tierKey) => {
                    const config = LAPTOP_CONFIGS[tierKey];
                    const isSelected = selectedTier === tierKey;
                    return (
                      <div
                        key={tierKey}
                        onClick={() => setSelectedTier(tierKey)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-900">
                            {tierKey === 'LEVEL_1' ? 'Level 1: Faculty Standard' : 'Level 2: STEM High-Spec'}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            ZMW {config.priceZmw.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-3">{config.subtitle}</p>

                        <div className="space-y-1.5 text-[11px] text-slate-600 border-t border-slate-100 pt-2.5">
                          <div className="flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{config.specs.processor}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{config.specs.ram}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{config.specs.storage}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{config.specs.display}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate text-emerald-800">{config.specs.warranty}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Repayment Period */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Part 1 (b) — Select Repayment Period
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'ONE_TO_TWO_MONTHS' as RepaymentPlan, label: '1–2 Months', desc: 'Accelerated deduction' },
                    { key: 'TWELVE_MONTHS' as RepaymentPlan, label: '12 Months', desc: 'Standard 1-year term' },
                    { key: 'TWENTY_FOUR_MONTHS' as RepaymentPlan, label: '24 Months', desc: 'Extended 2-year term' },
                  ].map((plan) => {
                    const isSelected = selectedRepayment === plan.key;
                    const calc = calculateRepayment(selectedTier, plan.key);
                    return (
                      <div
                        key={plan.key}
                        onClick={() => setSelectedRepayment(plan.key)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all text-center ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-900">{plan.label}</div>
                        <div className="text-[10px] text-slate-500 mb-2">{plan.desc}</div>
                        <div className="font-mono text-xs font-bold text-emerald-700">
                          ZMW {calc.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span className="text-[10px] text-slate-500 font-normal"> / mo</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Calculation Summary Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Hardware Unit Price:</span>
                  <span className="font-mono font-medium text-slate-800">
                    ZMW {currentRepayment.totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-200">
                  <span className="text-slate-500">Deduction Schedule:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {currentRepayment.months} monthly installments
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-semibold text-slate-900">Estimated Monthly Deduction:</span>
                  <span className="font-mono font-bold text-base text-emerald-700">
                    ZMW {currentRepayment.monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 leading-normal">
                  Note: Central HR will verify that this monthly deduction does not cause your total employee deductions to exceed the 33% salary ceiling. Central IT will set the official commencement date upon hardware handover.
                </p>
              </div>
            </div>
          )}

          {/* SCREEN 2: Summary & Digital Sign-off */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Application Summary (Part 1)
                </h3>

                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Applicant Full Name:</span>
                    <span className="font-semibold text-slate-800">{currentUser.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employee Number:</span>
                    <span className="font-mono text-slate-800">{currentUser.employeeNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">School / Department:</span>
                    <span className="text-slate-800">{institution?.name} · {currentUser.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Selected Hardware:</span>
                    <span className="font-semibold text-slate-800">
                      {LAPTOP_CONFIGS[selectedTier].title}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Repayment Duration:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedRepayment === 'ONE_TO_TWO_MONTHS'
                        ? '1–2 Months'
                        : selectedRepayment === 'TWELVE_MONTHS'
                        ? '12 Months'
                        : '24 Months'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Estimated Monthly Payroll Deduction:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      ZMW {currentRepayment.monthlyAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Digital Signing Verification Card */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-950">
                  <FileCheck className="w-4 h-4 text-emerald-700" />
                  <span>Authenticated Digital Sign-off</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  By clicking "Submit Application", your digital signature will be generated using your verified Microsoft Entra ID session credentials and timestamped on the application record. This initiates Part 2 (Head Teacher / GM Review).
                </p>
                <div className="pt-2 text-[10px] text-slate-500 font-mono">
                  Session Token: ENTRA-OID-{currentUser.entraOid.slice(0, 8)} · Timestamp: {new Date().toISOString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as 0 | 1)}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {step < 2 ? (
              <button
                type="button"
                disabled={step === 0 && !termsAccepted}
                onClick={() => setStep((prev) => (prev + 1) as 1 | 2)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  step === 0 && !termsAccepted
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                }`}
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Submit Application to Head Teacher</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
