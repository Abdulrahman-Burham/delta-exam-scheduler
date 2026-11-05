import React, { useState, useEffect } from 'react';
import { User, ScheduleAssignmentDetail, SubstituteCandidate } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../services/api';
import {
  X,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Filter,
  Sparkles,
  Phone,
  ShieldAlert,
} from 'lucide-react';

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
  const { t, language, isRtl } = useLanguage();

  const [sameDayOnly, setSameDayOnly] = useState<boolean>(true);
  const [candidates, setCandidates] = useState<SubstituteCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(true);
  const [selectedUserId, setSelectedUserId] = useState<string>(String(assignment.user_id));
  const [notes, setNotes] = useState<string>(
    language === 'ar'
      ? 'استبدال مراقب بقرار رئيس لجنة الامتحانات (متاح في نفس اليوم وبدون تضارب)'
      : 'Official proctor reassignment by Examination Committee (Same-day & Conflict-free)'
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = assignment.exam_session_id;
  const roleInExam = assignment.role_in_exam || 'INVIGILATOR_TA';

  // Fetch verified conflict-free candidates from backend
  useEffect(() => {
    const fetchCandidates = async () => {
      if (!sessionId) return;
      setLoadingCandidates(true);
      setError(null);
      try {
        const data = await api.schedules.getEligibleSubstitutes(
          sessionId,
          roleInExam,
          sameDayOnly
        );
        setCandidates(data);

        // Preselect the first valid replacement if current user is not in the list
        if (data.length > 0) {
          const firstId = String(data[0].user_id);
          setSelectedUserId(firstId);
        } else {
          setSelectedUserId('');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load eligible candidates');
      } finally {
        setLoadingCandidates(false);
      }
    };
    fetchCandidates();
  }, [sessionId, roleInExam, sameDayOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || selectedUserId === String(assignment.user_id)) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(assignment.id, selectedUserId, notes);
      onClose();
    } catch (err: any) {
      setError(
        err.message ||
          (language === 'ar' ? 'فشل في استبدال المراقب' : 'Failed to substitute proctor')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCandidate = candidates.find((c) => String(c.user_id) === String(selectedUserId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-start">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {language === 'ar'
                  ? 'تبديل واستبدال المراقب (مع مراعاة التواجد في نفس اليوم)'
                  : 'Substitute Invigilator (Smart Same-Day Filter)'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'يعرض فقط المعيدين الحاضرين في نفس اليوم وفارغين في توقيت الفترة'
                  : 'Only displays staff present on campus today & free during this shift'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Exam Info */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-cyan-400 text-sm">
                {assignment.exam_session?.course_code} — {assignment.exam_session?.course_name}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {assignment.exam_session?.venue?.name}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-300 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <strong className="text-white">{assignment.exam_session?.date}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1 font-mono text-amber-300" dir="ltr">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                {assignment.exam_session?.start_time?.slice(0, 5)} -{' '}
                {assignment.exam_session?.end_time?.slice(0, 5)}
              </span>
            </div>

            <div className="text-slate-400 text-[11px] pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span>{language === 'ar' ? 'المراقب المطلوب استبداله:' : 'Current Proctor:'} </span>
                <strong className="text-rose-300">{assignment.user?.full_name}</strong>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">
                {assignment.user?.phone}
              </span>
            </div>
          </div>

          {/* Smart Filter Toggle */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs font-bold text-white">
                  {language === 'ar'
                    ? 'إظهار المتواجدين في نفس اليوم فقط'
                    : 'Show same-day present staff only'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {language === 'ar'
                    ? 'يمنع نزول المعيد إلى الجامعة في يوم إجازته (تجميع الفترات)'
                    : 'Avoids scheduling staff on their off days (commute compaction)'}
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sameDayOnly}
                onChange={(e) => setSameDayOnly(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Candidate Dropdown / Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                {language === 'ar'
                  ? 'اختر البديل المتاح (فاضي في هذه الفترة):'
                  : 'Select eligible substitute (free in this shift):'}
              </label>
              <span className="text-[11px] font-mono text-cyan-400 font-bold">
                {loadingCandidates
                  ? '...'
                  : `${candidates.length} ${
                      language === 'ar' ? 'مرشحين مطابقين' : 'eligible candidates'
                    }`}
              </span>
            </div>

            {loadingCandidates ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <span>{language === 'ar' ? 'جاري فحص المعيدين المتواجدين اليوم وبدون تعارض...' : 'Verifying conflict-free same-day roster...'}</span>
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>
                    {language === 'ar'
                      ? 'لا يوجد معيدون متواجدون في نفس هذا اليوم وفارغون في هذه الفترة.'
                      : 'No TAs are both on-campus today and free during this specific time window.'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'يمكنك إيقاف تفعيل "إظهار المتواجدين في نفس اليوم فقط" بالأعلى لاستعراض بقية معيدي الكلية المتاحين.'
                    : 'Disable "Show same-day present staff only" above to view other off-duty TAs.'}
                </p>
              </div>
            ) : (
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-xs focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              >
                {candidates.map((c) => (
                  <option key={c.user_id} value={c.user_id}>
                    {c.full_name}
                    {c.is_present_today
                      ? ` [متواجد اليوم - ${c.today_sessions_count} فترات سابقة]`
                      : ' [غير متواجد اليوم]'}
                    {c.phone ? ` (${c.phone})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Candidate Info Card */}
          {selectedCandidate && (
            <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{selectedCandidate.full_name}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {language === 'ar' ? 'فارغ في هذه الفترة وبدون تعارض' : 'Conflict-Free in this Slot'}
                </span>
              </div>

              {selectedCandidate.today_schedule_summary &&
                selectedCandidate.today_schedule_summary.length > 0 && (
                  <div className="text-[11px] text-slate-300 pt-1">
                    <span className="text-slate-400">
                      {language === 'ar' ? 'فتراته الأخرى اليوم:' : 'Other shifts today:'}{' '}
                    </span>
                    <span className="font-mono text-cyan-300">
                      {selectedCandidate.today_schedule_summary.join(' | ')}
                    </span>
                  </div>
                )}

              {selectedCandidate.phone && (
                <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono" dir="ltr">
                  <Phone className="w-3 h-3 text-cyan-400" />
                  <span>{selectedCandidate.phone}</span>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t('overrideReasonLabel')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('overrideReasonPlaceholder')}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          {/* Actions */}
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
              disabled={submitting || !selectedUserId || selectedUserId === String(assignment.user_id)}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black text-xs transition shadow-lg shadow-cyan-600/20 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>{t('saving')}</span>
                </>
              ) : (
                <span>{language === 'ar' ? 'تأكيد الاستبدال وقفل التكليف' : t('overrideConfirmBtn')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
