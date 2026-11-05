import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Check, Calendar, Clock, MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { ExamSession, User } from '../types';

interface AddAssignmentModalProps {
  exams: ExamSession[];
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
  preselectedSessionId?: number;
}

export const AddAssignmentModal: React.FC<AddAssignmentModalProps> = ({
  exams,
  users,
  onClose,
  onSuccess,
  preselectedSessionId,
}) => {
  const { language, isRtl } = useLanguage();
  const toast = useToast();

  const [sessionId, setSessionId] = useState<number>(preselectedSessionId || (exams[0]?.id ?? 0));
  const [userId, setUserId] = useState<string>(String(users[0]?.id ?? ''));
  const [roleInExam, setRoleInExam] = useState<'LEAD_PROFESSOR' | 'INVIGILATOR_TA'>('INVIGILATOR_TA');
  const [notes, setNotes] = useState<string>(
    language === 'ar' ? 'تسكين يدوي بقرار من رئيس لجنة الامتحانات' : 'Manual assignment by Exam Committee'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSession = exams.find((e) => e.id === Number(sessionId));
  const selectedUser = users.find((u) => String(u.id) === String(userId));

  // Automatically adjust default role based on chosen user
  const handleUserChange = (newUserId: string) => {
    setUserId(newUserId);
    const u = users.find((item) => String(item.id) === String(newUserId));
    if (u && (u.role === 'DOCTOR' || u.role === 'PROFESSOR' || u.role === 'ADMIN')) {
      setRoleInExam('LEAD_PROFESSOR');
    } else {
      setRoleInExam('INVIGILATOR_TA');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !userId) {
      setError(language === 'ar' ? 'يرجى اختيار الجلسة والمراقب' : 'Please select both exam session and proctor');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.schedules.createAssignment({
        exam_session_id: Number(sessionId),
        user_id: userId,
        role_in_exam: roleInExam,
        is_locked: true,
        override_notes: notes,
      });

      toast.success(
        language === 'ar' ? 'تمت إضافة وتسكين المراقب بنجاح' : 'Invigilator assigned successfully'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل تسكين المراقب' : 'Failed to assign proctor'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 space-x-reverse mb-5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {language === 'ar' ? 'إضافة وتسكين مراقب بالجدول' : 'Add Invigilator to Exam Session'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar'
                ? 'تسكين عضو هيئة تدريس أو معيد في فترة امتحانية محددة مع فحص التضارب'
                : 'Directly allocate a professor or TA to a specific exam slot with conflict protection'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Exam Session Selection */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'الفترة الامتحانية والمقر' : 'Exam Session & Venue'}
            </label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
            >
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.date} | {e.start_time?.slice(0, 5)} - {e.end_time?.slice(0, 5)} | {e.course_code}: {e.course_name} ({e.venue?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Session Overview Card */}
          {selectedSession && (
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" /> {selectedSession.date}
                </span>
                <span className="flex items-center gap-1 font-mono" dir="ltr">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {selectedSession.start_time?.slice(0, 5)} - {selectedSession.end_time?.slice(0, 5)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" /> {selectedSession.venue?.name}
                </span>
                <span className="text-slate-400">
                  {selectedSession.student_headcount} {language === 'ar' ? 'طالب' : 'students'}
                </span>
              </div>
            </div>
          )}

          {/* Proctor Selection */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'عضو هيئة التدريس / المعيد' : 'Select Proctor (Doctor / TA)'}
            </label>
            <select
              value={userId}
              onChange={(e) => handleUserChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
            >
              {users.map((u) => {
                const isDoc = u.role === 'DOCTOR' || u.role === 'PROFESSOR' || u.role === 'ADMIN';
                const tag = isDoc ? (language === 'ar' ? 'دكتور' : 'Doctor') : (language === 'ar' ? 'معيد' : 'TA');
                return (
                  <option key={u.id} value={u.id}>
                    {u.full_name} [{tag}] — {u.department}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Role in Exam */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'الدور في اللجنة' : 'Role in Examination Room'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRoleInExam('LEAD_PROFESSOR')}
                className={`p-2.5 rounded-xl border text-center transition font-bold ${
                  roleInExam === 'LEAD_PROFESSOR'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'إشراف عام / أستاذ مقرر' : 'Lead Supervisor'}
              </button>
              <button
                type="button"
                onClick={() => setRoleInExam('INVIGILATOR_TA')}
                className={`p-2.5 rounded-xl border text-center transition font-bold ${
                  roleInExam === 'INVIGILATOR_TA'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'مراقب قاعة / معيد' : 'Room Proctor (TA)'}
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'ملاحظات وسند التكليف' : 'Assignment Notes / Reason'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>{language === 'ar' ? 'جارٍ التسكين...' : 'Assigning...'}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تأكيد التسكين والإضافة' : 'Confirm & Allocate'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
