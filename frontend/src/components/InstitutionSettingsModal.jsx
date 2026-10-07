import React, { useState } from 'react';
import { Building2, X, Check, RotateCcw } from 'lucide-react';
import { useToast } from './Toast';

export const DEFAULT_INSTITUTION_CONFIG = {
  institutionName: 'Shadan College of Engineering & Technology',
  affiliation: 'UGC Autonomous Institution • Affiliated to JNTUH, Hyderabad',
  accreditation: 'Approved by AICTE • NBA Accredited (CSE, IT, MECH & CIVIL) • NAAC "A+" Grade Accredited',
  department: 'Department of Computer Science & Engineering',
  coeTitle: 'Office of the Controller of Examinations',
  systemBrand: 'CoE Examination Studio',
  examSession: 'End Semester Examinations (Nov / Dec 2026)',
  regulation: 'Regulations 2023 (Autonomous - CBCS)',
  collegeCode: 'AUTONOMOUS • ISO 9001:2015 CERTIFIED',
};

export default function InstitutionSettingsModal({ isOpen, onClose, config, onSaveConfig, theme }) {
  const isDark = theme === 'dark';
  const { showToast } = useToast();
  const [formData, setFormData] = useState(config || DEFAULT_INSTITUTION_CONFIG);

  if (!isOpen) return null;

  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900 shadow-xl';
  const subBg = isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const inputBg = isDark
    ? 'bg-zinc-950 border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:border-zinc-500'
    : 'bg-white border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setFormData(DEFAULT_INSTITUTION_CONFIG);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.institutionName.trim()) {
      showToast('Institution name is required.', 'error');
      return;
    }
    onSaveConfig(formData);
    showToast('Institution and exam paper headers updated.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className={`w-full max-w-xl rounded-lg border shadow-xl overflow-hidden ${cardBg}`}>
        <div className={`p-4 border-b flex items-center justify-between ${subBg}`}>
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-zinc-400" />
            <div>
              <h2 className="text-sm font-bold tracking-tight">Institution & Examination Header Configuration</h2>
              <p className="text-[11px] text-zinc-500">Configures official printable examination sheets and reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Active Platform Brand Logo */}
          <div className={`p-3 rounded-lg border flex items-center justify-between ${subBg}`}>
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="Platform Logo" className="w-10 h-10 rounded-lg object-contain select-none shrink-0 shadow-xs" />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Official Platform Brand Logo
                </span>
                <span className="text-[11px] text-zinc-500">
                  Precision Assessment Folio & Diamond Vector
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-blue-500/40 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold">
              ACTIVE
            </span>
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-700 dark:text-zinc-300">
              Institution / University Full Name
            </label>
            <input
              type="text"
              name="institutionName"
              value={formData.institutionName}
              onChange={handleChange}
              placeholder="e.g. Apex Institute of Engineering & Technology"
              className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-700 dark:text-zinc-300">
              Affiliation & Approval Line
            </label>
            <input
              type="text"
              name="affiliation"
              value={formData.affiliation}
              onChange={handleChange}
              placeholder="e.g. UGC Autonomous Institution • Affiliated to JNTUH, Hyderabad"
              className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-zinc-700 dark:text-zinc-300">
              Accreditation & Approvals (AICTE / NBA / NAAC)
            </label>
            <input
              type="text"
              name="accreditation"
              value={formData.accreditation || ''}
              onChange={handleChange}
              placeholder="e.g. Approved by AICTE • NBA Accredited • NAAC 'A+' Grade"
              className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Institutional Quality / ISO Certification
              </label>
              <input
                type="text"
                name="collegeCode"
                value={formData.collegeCode || ''}
                onChange={handleChange}
                placeholder="e.g. AUTONOMOUS • ISO 9001:2015 CERTIFIED"
                className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                System Brand / Studio Name
              </label>
              <input
                type="text"
                name="systemBrand"
                value={formData.systemBrand || ''}
                onChange={handleChange}
                placeholder="e.g. CoE Examination Studio"
                className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Department Name
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Department of Computer Science & Engineering"
                className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                CoE / Division Title
              </label>
              <input
                type="text"
                name="coeTitle"
                value={formData.coeTitle}
                onChange={handleChange}
                placeholder="e.g. Office of the Controller of Examinations"
                className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Current Examination Session
              </label>
              <input
                type="text"
                name="examSession"
                value={formData.examSession}
                onChange={handleChange}
                placeholder="e.g. End Semester Examinations (Nov / Dec 2026)"
                className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 dark:text-zinc-300">
                Curriculum / Regulation
              </label>
              <input
                type="text"
                name="regulation"
                value={formData.regulation}
                onChange={handleChange}
                placeholder="e.g. Regulations 2023 (Autonomous - CBCS)"
                className={`w-full p-2 rounded border text-xs font-medium focus:outline-none transition-colors ${inputBg}`}
              />
            </div>
          </div>

          <div className={`p-3 rounded border text-center space-y-0.5 font-serif ${subBg}`}>
            <span className="text-[10px] font-sans font-bold text-zinc-400 uppercase tracking-wider block mb-1">
              Printable Exam Paper Header Preview
            </span>
            <div className="font-bold text-xs uppercase tracking-wide">{formData.institutionName}</div>
            <div className="text-[10px] font-sans text-zinc-500 uppercase">{formData.affiliation}</div>
            {formData.accreditation && (
              <div className="text-[9px] font-sans text-zinc-400 tracking-wide">{formData.accreditation}</div>
            )}
            {formData.collegeCode && (
              <div className="text-[9px] font-mono text-zinc-400 uppercase font-semibold">[{formData.collegeCode}]</div>
            )}
            <div className="text-[11px] font-semibold uppercase pt-0.5">{formData.department}</div>
            <div className="text-[10px] font-sans font-medium text-zinc-500 uppercase">
              {formData.examSession} • ({formData.regulation})
            </div>
          </div>

          <div className={`pt-3 border-t flex items-center justify-between ${subBg} -mx-5 -mb-5 p-4`}>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                  isDark
                    ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300'
                    : 'border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 rounded text-xs font-semibold shadow-xs transition-colors ${
                  isDark
                    ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                }`}
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
