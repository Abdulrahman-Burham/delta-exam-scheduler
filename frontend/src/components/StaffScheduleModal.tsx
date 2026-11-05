import React, { useState, useEffect } from 'react';
import { User, ScheduleAssignmentDetail } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Phone,
  GraduationCap,
  FileDown,
  Building,
  CheckCircle2,
  AlertCircle,
  Radio,
  Search,
} from 'lucide-react';

interface StaffScheduleModalProps {
  user: User;
  onClose: () => void;
}

export const StaffScheduleModal: React.FC<StaffScheduleModalProps> = ({ user, onClose }) => {
  const { language, t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [assignments, setAssignments] = useState<ScheduleAssignmentDetail[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Time simulation / Live presence check
  // Default to real-time or fall back to first exam date if out of exam window
  const [simulationDate, setSimulationDate] = useState<string>('');
  const [simulationTime, setSimulationTime] = useState<string>('');

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.schedules.getUserSchedule(user.id);
        setAssignments(data);
        if (data.length > 0) {
          // Default simulation date/time to first assignment for immediate live inspection
          setSimulationDate(data[0].exam_session.date);
          setSimulationTime(data[0].exam_session.start_time.slice(0, 5));
        } else {
          const now = new Date();
          setSimulationDate(now.toISOString().slice(0, 10));
          setSimulationTime(now.toTimeString().slice(0, 5));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch schedule');
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [user.id]);

  // Determine current active session (Where is he/she right now?)
  const activeSession = assignments.find((a) => {
    if (!simulationDate || !simulationTime) return false;
    const sess = a.exam_session;
    if (sess.date !== simulationDate) return false;
    const sStart = sess.start_time.slice(0, 5);
    const sEnd = sess.end_time.slice(0, 5);
    return simulationTime >= sStart && simulationTime <= sEnd;
  });

  // Determine next upcoming session
  const upcomingSession = assignments.find((a) => {
    if (!simulationDate || !simulationTime) return false;
    const sess = a.exam_session;
    if (sess.date > simulationDate) return true;
    if (sess.date === simulationDate && sess.start_time.slice(0, 5) > simulationTime) return true;
    return false;
  });

  const totalHours = assignments.reduce((acc, curr) => {
    const start = curr.exam_session.start_time.split(':').map(Number);
    const end = curr.exam_session.end_time.split(':').map(Number);
    const diff = (end[0] * 60 + end[1] - (start[0] * 60 + start[1])) / 60;
    return acc + Math.max(0.75, diff);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center space-x-3.5 space-x-reverse">
            <div className={`p-3 rounded-2xl ${
              user.role === 'DOCTOR' || user.role === 'PROFESSOR' || user.role === 'ADMIN'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {user.role === 'DOCTOR' || user.role === 'PROFESSOR' || user.role === 'ADMIN' ? (
                <GraduationCap className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h2 className="text-base sm:text-lg font-black text-white">{user.full_name}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  user.role === 'DOCTOR' || user.role === 'PROFESSOR' || user.role === 'ADMIN'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  {user.role === 'DOCTOR' || user.role === 'PROFESSOR' || user.role === 'ADMIN'
                    ? (language === 'ar' ? 'عضو هيئة تدريس' : 'Faculty Doctor')
                    : (language === 'ar' ? 'هيئة معاونة / معيد' : 'Teaching Assistant')}
                </span>
                {user.is_master_student && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    {language === 'ar' ? 'باحث ماجستير' : "Master's"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{user.title || user.department}</span>
                {user.phone && (
                  <span className="flex items-center gap-1 font-mono text-slate-300" dir="ltr">
                    <Phone className="w-3 h-3 text-cyan-400" />
                    {user.phone}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <a
              href={api.exports.getPersonalPdfUrl(user.id)}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center space-x-1.5 space-x-reverse px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition shadow-md shadow-cyan-600/20"
              title={language === 'ar' ? 'تحميل إخطار المراقبة المعتمد PDF' : 'Download Official Invigilation Slip PDF'}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إخطار المراقبة' : 'Duty Slip PDF'}</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Presence Simulation Bar ("هو فين دلوقتي") */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {language === 'ar' ? 'فحص التواجد اللحظي وموقع المراقب الآن:' : 'Live Staff Presence Tracker:'}
            </span>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse text-xs">
            <label className="text-slate-400 font-medium">
              {language === 'ar' ? 'اليوم والوقت:' : 'Inspection Time:'}
            </label>
            <input
              type="date"
              value={simulationDate}
              onChange={(e) => setSimulationDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:border-cyan-400 outline-none"
            />
            <input
              type="time"
              value={simulationTime}
              onChange={(e) => setSimulationTime(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs font-mono focus:border-cyan-400 outline-none"
            />
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Real-time Status Card (هو فين دلوقتي) */}
          <div className={`p-4 rounded-2xl border ${
            activeSession
              ? 'bg-emerald-950/40 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
              : 'bg-slate-950/70 border-slate-800'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 space-x-reverse">
                <div className={`p-2.5 rounded-xl ${
                  activeSession ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  {activeSession ? (
                    <MapPin className="w-5 h-5 text-emerald-400 animate-bounce" />
                  ) : (
                    <Clock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {language === 'ar' ? 'الموقع والتواجد الحالي (أين هو الآن؟):' : 'Current Live Location & Activity:'}
                    </span>
                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                      activeSession
                        ? 'bg-emerald-500 text-slate-950 animate-pulse'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {activeSession
                        ? (language === 'ar' ? '🟢 متواجد في لجنة الآن' : '🟢 In Exam Session Now')
                        : (language === 'ar' ? '⚪ غير متواجد في لجنة حالياً' : '⚪ Not in Exam Shift')}
                    </span>
                  </div>

                  {activeSession ? (
                    <div className="mt-2 space-y-1">
                      <h3 className="text-base sm:text-lg font-black text-emerald-300">
                        {activeSession.exam_session.venue?.name || 'Exam Venue'}
                      </h3>
                      <p className="text-xs text-slate-200 font-medium">
                        <span className="font-bold text-white">{activeSession.exam_session.course_code} - {activeSession.exam_session.course_name}</span>
                        {' '}({activeSession.exam_session.start_time.slice(0, 5)} - {activeSession.exam_session.end_time.slice(0, 5)})
                      </p>
                      <div className="flex items-center gap-2 text-xs text-emerald-400/90 font-medium pt-0.5">
                        <Building className="w-3.5 h-3.5" />
                        <span>{activeSession.exam_session.venue?.building || 'Campus Venue'}</span>
                        <span className="text-slate-500">•</span>
                        <span>{language === 'ar' ? 'الدور:' : 'Floor:'} {activeSession.exam_session.venue?.floor}</span>
                        <span className="text-slate-500">•</span>
                        <span>
                          {activeSession.role_in_exam === 'LEAD_PROFESSOR'
                            ? (language === 'ar' ? 'رئيس اللجنة / أستاذ المقرر' : 'Lead Examiner')
                            : (language === 'ar' ? 'مراقب لجنة' : 'Invigilator')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">
                      {upcomingSession ? (
                        <p>
                          <span className="text-slate-300 font-medium">
                            {language === 'ar' ? 'الجلسة الامتحانية القادمة:' : 'Next Upcoming Exam:'}
                          </span>{' '}
                          <strong className="text-cyan-400">{upcomingSession.exam_session.course_code} ({upcomingSession.exam_session.course_name})</strong>{' '}
                          {language === 'ar' ? 'في' : 'in'}{' '}
                          <strong className="text-white">{upcomingSession.exam_session.venue?.name}</strong>{' '}
                          ({upcomingSession.exam_session.date} {upcomingSession.exam_session.start_time.slice(0, 5)})
                        </p>
                      ) : (
                        <p className="text-slate-500 italic">
                          {language === 'ar' ? 'لا توجد جلسات امتحانية أخرى مجدولة لهذا العضو.' : 'No further sessions scheduled.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'إجمالي الفترات' : 'Total Shifts'}</span>
              <div className="text-lg font-black text-white mt-1">{assignments.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'إجمالي الساعات' : 'Total Hours'}</span>
              <div className="text-lg font-black text-cyan-400 mt-1">{totalHours.toFixed(1)} {language === 'ar' ? 'ساعة' : 'hrs'}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'حد الحضور الأسبوعي' : 'Weekly Cap'}</span>
              <div className="text-lg font-black text-amber-400 mt-1">{user.max_days_per_week || 3} {language === 'ar' ? 'أيام/أسبوع' : 'days/wk'}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'ar' ? 'حالة الحساب' : 'Account Status'}</span>
              <div className="text-lg font-black text-emerald-400 mt-1">{user.is_active ? (language === 'ar' ? 'نشط' : 'Active') : 'Inactive'}</div>
            </div>
          </div>

          {/* Chronological Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>{language === 'ar' ? 'جدول المراقبات الكامل للعضو:' : 'Full Assigned Invigilation Timetable:'}</span>
              </h3>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {assignments.length} {language === 'ar' ? 'جلسة معتمدة' : 'assigned slots'}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'جاري تحميل جدول العضو...' : 'Loading staff schedule...'}
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            ) : assignments.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-950/50 border border-slate-800/80 text-slate-400 text-xs">
                {language === 'ar' ? 'لا توجد مراقبات مسكنة لهذا العضو في الجدول الحالي.' : 'No invigilation sessions assigned yet.'}
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-lg bg-slate-950/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-3.5 text-center">#</th>
                        <th className="py-3 px-3.5">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th className="py-3 px-3.5">{language === 'ar' ? 'الفترة' : 'Time'}</th>
                        <th className="py-3 px-3.5">{language === 'ar' ? 'كود المادة' : 'Code'}</th>
                        <th className="py-3 px-3.5">{language === 'ar' ? 'اسم المقرر' : 'Course'}</th>
                        <th className="py-3 px-3.5">{language === 'ar' ? 'المقر والقاعة' : 'Venue'}</th>
                        <th className="py-3 px-3.5 text-center">{language === 'ar' ? 'الدور' : 'Role'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {assignments.map((a, idx) => {
                        const sess = a.exam_session;
                        const isCurrentActive = activeSession?.id === a.id;
                        return (
                          <tr
                            key={a.id}
                            className={`transition hover:bg-slate-900/70 ${
                              isCurrentActive ? 'bg-emerald-950/30 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-3.5 font-mono text-slate-300 font-bold">{sess.date}</td>
                            <td className="py-3 px-3.5 font-mono text-cyan-400 font-bold" dir="ltr">
                              {sess.start_time.slice(0, 5)} - {sess.end_time.slice(0, 5)}
                            </td>
                            <td className="py-3 px-3.5 font-mono font-bold text-white">{sess.course_code}</td>
                            <td className="py-3 px-3.5 text-slate-200">{sess.course_name}</td>
                            <td className="py-3 px-3.5">
                              <span className="font-bold text-amber-300">{sess.venue?.name || 'Room'}</span>
                              <span className="text-[10px] text-slate-400 block">{sess.venue?.building}</span>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                a.role_in_exam === 'LEAD_PROFESSOR'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {a.role_in_exam === 'LEAD_PROFESSOR'
                                  ? (language === 'ar' ? 'رئيس لجنة' : 'Lead')
                                  : (language === 'ar' ? 'مراقب' : 'Invigilator')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
