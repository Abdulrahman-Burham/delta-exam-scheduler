import React, { useState } from 'react';
import { User, ScheduleAssignmentDetail } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { X, UserCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface OverrideModalProps {
  assignment: ScheduleAssignmentDetail;
  availableUsers: User[];
  onClose: () => void;
  onConfirm: (assignmentId: number, newUserId: string | number, notes: string) => Promise<void>;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  assignment,
  availableUsers,
  onClose,
  onConfirm,
}) => {
  const { t, language } = useLanguage();
  const [selectedUserId, setSelectedUserId] = useState<string | number>(assignment.user_id);
  const [notes, setNotes] = useState<string>(
    language === 'ar' ? 'تعديل واستبدال يدوي بقرار من رئيس لجنة الامتحانات' : 'Official proctor reassignment by Examination Committee'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter candidates by same role (doctors/professors for lead, TAs for proctor)
  const isLead = assignment.role_in_exam === 'LEAD_PROFESSOR';
  const eligibleCandidates = availableUsers.filter((u) => {
    if (isLead) {
      return u.role === 'PROFESSOR' || u.role === 'DOCTOR' || u.role === 'ADMIN';
    }
    return u.role === 'TA';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserId === assignment.user_id) {
      onClose();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(assignment.id, selectedUserId, notes);
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل في استبدال المراقب' : 'Failed to substitute proctor'));
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = eligibleCandidates.find((u) => u.id === selectedUserId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-start">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('overrideModalTitle')}</h3>
              <p className="text-xs text-slate-400">
                {language === 'ar' ? 'تعديل التكليف مع التحقق المباشر من منع التضارب' : 'Direct proctor assignment with real-time conflict verification'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Exam Info */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1 text-xs">
            <div className="font-bold text-cyan-400">
              {assignment.exam_session?.course_code} — {assignment.exam_session?.course_name}
            </div>
            <div className="text-slate-300">
              {t('overrideExamVenue')} {assignment.exam_session?.venue?.name} • {t('overrideExamTime')} {assignment.exam_session?.date} ({assignment.exam_session?.start_time?.slice(0, 5)} - {assignment.exam_session?.end_time?.slice(0, 5)})
            </div>
            <div className="text-slate-400 text-[11px]">
              {t('overrideCurrentInvigilator')}{' '}
              <strong className="text-white">{assignment.user?.full_name}</strong> ({assignment.role_in_exam === 'LEAD_PROFESSOR' ? t('roleProfBadge') : t('roleTABadge')})
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t('overrideSelectReplacement')}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:ring-2 focus:ring-cyan-500"
            >
              {eligibleCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.department} ({u.staff_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">{t('overrideReasonLabel')}</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('overrideReasonPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {selectedUser && (
            <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-xs text-cyan-300 flex items-center justify-between">
              <span>{language === 'ar' ? 'سيتم قفل هذا التكليف وحمايته من التعديل التلقائي.' : 'This assignment will be locked and protected from auto-shuffling.'}</span>
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 space-x-reverse pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
            >
              {t('overrideCancelBtn')}
            </button>
            <button
              type="submit"
              disabled={loading || selectedUserId === assignment.user_id}
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-600/20"
            >
              {loading ? t('saving') : t('overrideConfirmBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
