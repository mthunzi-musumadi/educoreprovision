import React from 'react';
import { useApp } from '../context/AppContext';
import { ChevronRight, Building, Laptop } from 'lucide-react';

interface TopBarProps {
  currentTab: string;
}

export const TopBar: React.FC<TopBarProps> = ({ currentTab }) => {
  const { currentUser, institutions, applications, openModal, isDbConnected } = useApp();

  const currentInstitution = institutions.find((i) => i.id === currentUser.institutionId);

  // Check if current user has an in-flight request
  const myActiveRequest = applications.find(
    (app) =>
      app.applicantId === currentUser.id &&
      ['PENDING_GM_REVIEW', 'PENDING_HR_REVIEW', 'PENDING_IT_SIGNOFF', 'REVISION_REQUIRED'].includes(app.status)
  );

  const getBreadcrumbTitle = () => {
    switch (currentTab) {
      case 'staff-applicants':
        return currentUser.role === 'HEAD_TEACHER' ? 'Campus Staff Applicants' : 'Staff Applicants Directory';
      case 'my-requests':
        return 'My Applications';
      case 'school-triage':
        return 'School Triage & Endorsement';
      case 'hr-queue':
        return 'HR Debt Ratio & Statutory Clearance';
      case 'it-queue':
        return 'IT Equipment Provisioning & MDM';
      case 'master-sheet':
        return 'Master Sheet & Payroll Deductions';
      default:
        return 'Overview';
    }
  };

  return (
    <header
      className="h-14 bg-white border-b border-slate-200 px-4 sm:px-8 lg:px-10 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-[0_1px_4px_rgba(0,0,0,0.05)]"
      style={{ borderRadius: 0 }}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        {/* Monogram breadcrumb node */}

        <ChevronRight className="w-3 h-3 text-slate-300" />
        <span className="font-semibold text-slate-800 text-[12px]">{getBreadcrumbTitle()}</span>
      </div>

      {/* Right: System status tags + Action */}
      <div className="flex items-center gap-2">

        {/* Institution & Role indicator */}
        <div
          className="flex items-center gap-2 px-2.5 py-1 border border-slate-200 bg-slate-50 text-xs text-slate-700"
          style={{ borderRadius: 0 }}
        >
          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="font-semibold truncate max-w-[130px]">{currentInstitution?.name || 'Educore Services'}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-700 font-mono font-bold text-[10px] uppercase whitespace-nowrap tracking-wide">
            {currentUser.role.replace(/_/g, ' ')}
          </span>
        </div>

        {/* + New Request CTA */}
        {currentTab === 'my-requests' && !myActiveRequest && (
          <button
            onClick={() => openModal('NEW_REQUEST')}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            style={{ borderRadius: 0 }}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>+ New Request</span>
          </button>
        )}
      </div>
    </header>
  );
};
