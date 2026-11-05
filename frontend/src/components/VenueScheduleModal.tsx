import React, { useState, useEffect } from 'react';
import { Venue, VenueSchedule, VenueSessionSlot, User, AssignedStaff, SubstituteCandidate } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import {
  X,
  Building2,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Phone,
  Radio,
  MapPin,
  CheckCircle2,
  AlertCircle,
  DoorOpen,
  UserPlus,
  Trash2,
  Plus,
} from 'lucide-react';

interface VenueScheduleModalProps {
  venue: Venue;
  onClose: () => void;
}

export const VenueScheduleModal: React.FC<VenueScheduleModalProps> = ({ venue, onClose }) => {
  const { language, t, isRtl } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [venueSchedule, setVenueSchedule] = useState<VenueSchedule | null>(null);
  const [allTAs, setAllTAs] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Time simulation / Live presence check
  const [simulationDate, setSimulationDate] = useState<string>('');
  const [simulationTime, setSimulationTime] = useState<string>('');

  // Interactive TA Management inside Modal
  const [addingToSessionId, setAddingToSessionId] = useState<number | null>(null);
  const [selectedTaId, setSelectedTaId] = useState<string>('');
  const [isMutating, setIsMutating] = useState<boolean>(false);
  const [eligibleTAs, setEligibleTAs] = useState<SubstituteCandidate[]>([]);
  const [loadingEligible, setLoadingEligible] = useState<boolean>(false);
  const [sameDayOnly, setSameDayOnly] = useState<boolean>(true);

  // When addingToSessionId changes, load verified same-day conflict-free substitutes
  useEffect(() => {
    if (!addingToSessionId) {
      setEligibleTAs([]);
      return;
    }
    const loadEligible = async () => {
      setLoadingEligible(true);
      try {
        const data = await api.schedules.getEligibleSubstitutes(
          addingToSessionId,
          'INVIGILATOR_TA',
          sameDayOnly
        );
        setEligibleTAs(data);
        if (data.length > 0) {
          setSelectedTaId(String(data[0].user_id));
        } else {
          setSelectedTaId('');
        }
      } catch {
        // non-blocking
      } finally {
        setLoadingEligible(false);
      }
    };
    loadEligible();
  }, [addingToSessionId, sameDayOnly]);

  const fetchSchedule = async () => {
    try {
      const data = await api.venues.getSchedule(venue.id);
      setVenueSchedule(data);
      if (data.sessions.length > 0 && !simulationDate) {
        setSimulationDate(data.sessions[0].date);
        setSimulationTime(data.sessions[0].start_time.slice(0, 5));
      } else if (!simulationDate) {
        const now = new Date();
        setSimulationDate(now.toISOString().slice(0, 10));
        setSimulationTime(now.toTimeString().slice(0, 5));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch venue schedule');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      await fetchSchedule();
      try {
        const tas = await api.users.list('TA');
        setAllTAs(tas);
      } catch {
        // non-blocking
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [venue.id]);

  const handleRemoveTA = async (assignmentId?: number, taName?: string) => {
    if (!assignmentId) {
      toast.warning(
        language === 'ar' ? 'تنبيه' : 'Warning',
        language === 'ar' ? 'معرف التكليف غير متوفر' : 'Assignment ID unavailable'
      );
      return;
    }

    const confirmMsg =
      language === 'ar'
        ? `هل أنت متأكد من رغبتك في إزالة المعيد (${taName || ''}) من هذه الفترة في قاعة ${venue.name}؟`
        : `Are you sure you want to remove ${taName || 'this TA'} from this session in ${venue.name}?`;

    if (!window.confirm(confirmMsg)) return;

    setIsMutating(true);
    try {
      await api.schedules.deleteAssignment(assignmentId);
      toast.success(
        language === 'ar' ? 'تمت إزالة المعيد بنجاح' : 'TA Removed Successfully',
        language === 'ar' ? `تم تفريغ تكليف ${taName || ''} من القاعة` : 'Slot released'
      );
      await fetchSchedule();
    } catch (err: any) {
      toast.error(
        language === 'ar' ? 'فشل إزالة المعيد' : 'Failed to Remove TA',
        err.message || 'Error deleting assignment'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const handleAddTA = async (sessionId: number) => {
    if (!selectedTaId) {
      toast.warning(
        language === 'ar' ? 'تنبيه' : 'Warning',
        language === 'ar' ? 'يرجى اختيار المعيد أولاً' : 'Please select a TA first'
      );
      return;
    }

    setIsMutating(true);
    try {
      await api.schedules.createAssignment({
        exam_session_id: sessionId,
        user_id: selectedTaId,
        role_in_exam: 'INVIGILATOR_TA',
        is_locked: true,
        override_notes: `Manual allocation via Venue Schedule Inspector (${venue.name})`,
      });

      const assignedTA = allTAs.find((t) => String(t.id) === String(selectedTaId));
      toast.success(
        language === 'ar' ? 'تم تسكين المعيد بنجاح' : 'TA Assigned Successfully',
        language === 'ar'
          ? `تمت إضافة ${assignedTA?.full_name || ''} لمراقبة القاعة`
          : 'Proctor assigned'
      );

      setAddingToSessionId(null);
      setSelectedTaId('');
      await fetchSchedule();
    } catch (err: any) {
      toast.error(
        language === 'ar' ? 'تعارض أو فشل في التسكين' : 'Assignment Conflict',
        err.message || 'Failed to assign TA'
      );
    } finally {
      setIsMutating(false);
    }
  };

  const sessions = venueSchedule?.sessions || [];

  // Active session in this room right now
  const activeSession: VenueSessionSlot | undefined = sessions.find((s) => {
    if (!simulationDate || !simulationTime) return false;
    if (s.date !== simulationDate) return false;
    const sStart = s.start_time.slice(0, 5);
    const sEnd = s.end_time.slice(0, 5);
    return simulationTime >= sStart && simulationTime <= sEnd;
  });

  // Next upcoming session in this room
  const upcomingSession: VenueSessionSlot | undefined = sessions.find((s) => {
    if (!simulationDate || !simulationTime) return false;
    if (s.date > simulationDate) return true;
    if (s.date === simulationDate && s.start_time.slice(0, 5) > simulationTime) return true;
    return false;
  });

  const isLab = venue.venue_type === 'LAB' || venue.name.toLowerCase().includes('lab');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center space-x-3.5 space-x-reverse">
            <div
              className={`p-3 rounded-2xl ${
                isLab
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              }`}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <h2 className="text-base sm:text-lg font-black text-white">{venue.name}</h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isLab
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {isLab
                    ? language === 'ar'
                      ? 'معمل حاسب آلي وذكاء اصطناعي'
                      : 'Computer & AI Lab'
                    : language === 'ar'
                    ? 'مدرج وقاعة امتحانات كبرى'
                    : 'Lecture Hall'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {language === 'ar' ? 'السعة:' : 'Capacity:'} {venue.capacity}{' '}
                  {language === 'ar' ? 'طالب' : 'seats'}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{venue.building}</span>
                <span className="text-slate-500">•</span>
                <span>{language === 'ar' ? 'الدور:' : 'Floor:'} {venue.floor}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Presence Simulation Bar ("المدرج ده فيه مين دلوقتي") */}
        <div className="bg-slate-950 px-5 sm:px-6 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-bold text-white">
              {language === 'ar'
                ? 'فحص إشغال المقر ومن متواجد به الآن وتعديل المراقبين:'
                : 'Live Hall Occupancy & Proctor Management:'}
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
          {/* Real-time Status Card (مين جوه المدرج دلوقتي) */}
          <div
            className={`p-5 rounded-2xl border ${
              activeSession
                ? 'bg-rose-950/30 border-rose-500/40 shadow-xl shadow-rose-950/20'
                : 'bg-emerald-950/20 border-emerald-500/30 shadow-lg'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3.5 space-x-reverse w-full">
                <div
                  className={`p-2.5 rounded-xl ${
                    activeSession
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {activeSession ? (
                    <DoorOpen className="w-5 h-5 text-rose-400 animate-pulse" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {language === 'ar'
                        ? 'حالة المقر ومن متواجد به الآن:'
                        : 'Current Room Occupancy & Staff:'}
                    </span>
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-md ${
                        activeSession
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-emerald-500 text-slate-950 font-bold'
                      }`}
                    >
                      {activeSession
                        ? language === 'ar'
                          ? '🔴 امتحان منعقد الآن بالمقر'
                          : '🔴 Exam In Progress'
                        : language === 'ar'
                        ? '🟢 المقر شاغر حالياً'
                        : '🟢 Hall Vacant'}
                    </span>
                  </div>

                  {activeSession ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-black text-white">
                          {activeSession.course_code} - {activeSession.course_name}
                        </h3>
                        <p className="text-xs text-rose-300 font-medium">
                          {language === 'ar' ? 'التوقيت:' : 'Shift Timing:'}{' '}
                          <span className="font-mono font-bold" dir="ltr">
                            {activeSession.start_time.slice(0, 5)} - {activeSession.end_time.slice(0, 5)}
                          </span>{' '}
                          | {language === 'ar' ? 'عدد الطلاب بالمقر:' : 'Students seated:'}{' '}
                          <strong className="text-white">
                            {activeSession.student_headcount} {language === 'ar' ? 'طالب' : 'students'}
                          </strong>
                        </p>
                      </div>

                      {/* Who is inside the hall right now */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Lead Professor */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                          <span className="text-[10px] text-blue-400 font-bold uppercase flex items-center gap-1.5 mb-1">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>
                              {language === 'ar'
                                ? 'رئيس اللجنة / أستاذ المقرر بالمقر:'
                                : 'Lead Professor Present:'}
                            </span>
                          </span>
                          {activeSession.lead_professor ? (
                            <div>
                              <div className="font-bold text-white text-xs">
                                {activeSession.lead_professor.full_name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {activeSession.lead_professor.department}
                              </div>
                              {activeSession.lead_professor.phone && (
                                <div
                                  className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 mt-0.5"
                                  dir="ltr"
                                >
                                  <Phone className="w-3 h-3" />
                                  {activeSession.lead_professor.phone}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 italic">
                              {language === 'ar'
                                ? 'إشراف عام للجنة الكنترول'
                                : 'Control Committee Supervision'}
                            </div>
                          )}
                        </div>

                        {/* Assisting TAs */}
                        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>
                                {language === 'ar'
                                  ? 'المراقبون المتواجدون بالمقر:'
                                  : 'Invigilators Present:'}{' '}
                                ({activeSession.tas.length})
                              </span>
                            </span>
                            <button
                              onClick={() => setAddingToSessionId(activeSession.session_id)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1 transition"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{language === 'ar' ? 'إضافة معيد' : 'Add TA'}</span>
                            </button>
                          </div>

                          {activeSession.tas.length > 0 ? (
                            <div className="space-y-1.5">
                              {activeSession.tas.map((ta) => (
                                <div
                                  key={ta.id}
                                  className="text-xs flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800"
                                >
                                  <div>
                                    <span className="font-bold text-white">{ta.full_name}</span>
                                    {ta.phone && (
                                      <span
                                        className="text-[10px] font-mono text-cyan-400 block"
                                        dir="ltr"
                                      >
                                        {ta.phone}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleRemoveTA(ta.assignment_id, ta.full_name)}
                                    disabled={isMutating}
                                    title={language === 'ar' ? 'إزالة من المراقبة' : 'Remove Proctor'}
                                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-amber-400/90 italic">
                              {language === 'ar'
                                ? 'لم يتم تسكين مراقبين بعد. اضغط + إضافة معيد أعلاه.'
                                : 'No proctors assigned yet. Click + Add TA above.'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-slate-400">
                      {upcomingSession ? (
                        <p>
                          <span className="text-slate-300 font-medium">
                            {language === 'ar'
                              ? 'الامتحان القادم في هذا المقر:'
                              : 'Next Scheduled Exam in this Hall:'}
                          </span>{' '}
                          <strong className="text-cyan-400">
                            {upcomingSession.course_code} - {upcomingSession.course_name}
                          </strong>{' '}
                          ({upcomingSession.date} {upcomingSession.start_time.slice(0, 5)} -{' '}
                          {upcomingSession.end_time.slice(0, 5)}) |{' '}
                          {language === 'ar' ? 'رئيس اللجنة:' : 'Lead:'}{' '}
                          <span className="text-white font-semibold">
                            {upcomingSession.lead_professor?.full_name ||
                              (language === 'ar' ? 'إشراف الكنترول' : 'Control Committee')}
                          </span>{' '}
                          | {language === 'ar' ? 'المراقبون:' : 'TAs:'}{' '}
                          <span className="text-emerald-300">
                            {upcomingSession.tas.map((t) => t.full_name).join(', ') ||
                              (language === 'ar' ? 'قيد التسكين' : 'Allocating...')}
                          </span>
                        </p>
                      ) : (
                        <p className="text-slate-500 italic">
                          {language === 'ar'
                            ? 'لا توجد جلسات امتحانية أخرى مجدولة لهذا المقر.'
                            : 'No further exam sessions scheduled for this venue.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Inline Add TA Box when active */}
          {addingToSessionId && (() => {
            const targetSession = sessions.find((s) => s.session_id === addingToSessionId);
            return (
              <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/40 space-y-3 animate-fade-in shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                    <UserPlus className="w-4 h-4 text-cyan-400" />
                    <span>
                      {language === 'ar'
                        ? 'إضافة وتسكين معيد مراقب لهذه الفترة الامتحانية:'
                        : 'Assign a Teaching Assistant to this session:'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setAddingToSessionId(null);
                      setSelectedTaId('');
                    }}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {targetSession && (
                  <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {targetSession.course_code} — {targetSession.course_name}
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-cyan-400 font-mono">
                        {targetSession.date} ({targetSession.start_time.slice(0, 5)} - {targetSession.end_time.slice(0, 5)})
                      </span>
                    </div>

                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white transition">
                      <input
                        type="checkbox"
                        checked={sameDayOnly}
                        onChange={(e) => setSameDayOnly(e.target.checked)}
                        className="accent-cyan-500 rounded"
                      />
                      <span className="font-bold text-[10px]">
                        {language === 'ar' ? 'المتواجدين في نفس اليوم فقط' : 'Same-day present only'}
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedTaId}
                    onChange={(e) => setSelectedTaId(e.target.value)}
                    disabled={loadingEligible || isMutating}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none"
                  >
                    <option value="">
                      {loadingEligible
                        ? (language === 'ar' ? 'جاري فحص المعيدين المتاحين اليوم وبدون تعارض...' : 'Verifying conflict-free TAs...')
                        : eligibleTAs.length === 0
                        ? (language === 'ar' ? '-- لا يوجد معيد متاح اليوم (أوقف خيار "المتواجدين في نفس اليوم") --' : '-- No TAs free today --')
                        : (language === 'ar' ? '-- اختر المعيد المتاح --' : '-- Select free TA --')}
                    </option>
                    {eligibleTAs.map((ta) => (
                      <option key={ta.user_id} value={String(ta.user_id)}>
                        {ta.full_name}
                        {ta.is_present_today
                          ? ` [متواجد اليوم: ${ta.today_schedule_summary.join(' | ') || `${ta.today_sessions_count} فترات`}]`
                          : ' [غير متواجد اليوم]'}
                        {ta.phone ? ` (${ta.phone})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => handleAddTA(addingToSessionId)}
                    disabled={!selectedTaId || isMutating || loadingEligible}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isMutating ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'تأكيد التسكين' : 'Confirm Assignment'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {language === 'ar' ? 'إجمالي فترات الامتحانات' : 'Total Sessions'}
              </span>
              <div className="text-lg font-black text-white mt-1">{sessions.length}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {language === 'ar' ? 'السعة الاستيعابية' : 'Capacity'}
              </span>
              <div className="text-lg font-black text-cyan-400 mt-1">
                {venue.capacity} {language === 'ar' ? 'طالب' : 'seats'}
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {language === 'ar' ? 'الموقع والمبنى' : 'Building'}
              </span>
              <div className="text-xs font-bold text-slate-200 mt-1 truncate">{venue.building}</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {language === 'ar' ? 'نوع المقر' : 'Venue Type'}
              </span>
              <div className="text-sm font-bold text-amber-400 mt-1">
                {isLab
                  ? language === 'ar'
                    ? 'معمل ذكاء اصطناعي'
                    : 'AI Lab'
                  : language === 'ar'
                  ? 'مدرج امتحانات'
                  : 'Lecture Hall'}
              </div>
            </div>
          </div>

          {/* Chronological Table of Venue Sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>
                  {language === 'ar'
                    ? 'جدول الامتحانات الكامل لهذا المقر وتعديل طاقم المراقبة:'
                    : 'Full Exam Timetable & Proctor Management:'}
                </span>
              </h3>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {sessions.length} {language === 'ar' ? 'فترة امتحانية' : 'sessions'}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                {language === 'ar' ? 'جاري تحميل جدول المقر...' : 'Loading venue timetable...'}
              </div>
            ) : error ? (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs">
                {error}
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-10 text-center rounded-2xl bg-slate-950/50 border border-slate-800/80 text-slate-400 text-xs">
                {language === 'ar'
                  ? 'لا توجد امتحانات مجدولة في هذا المقر حتى الآن.'
                  : 'No exams scheduled in this venue.'}
              </div>
            ) : (
              <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-lg bg-slate-950/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-3 px-3 text-center">#</th>
                        <th className="py-3 px-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th className="py-3 px-3">{language === 'ar' ? 'الفترة' : 'Time'}</th>
                        <th className="py-3 px-3">{language === 'ar' ? 'كود المادة' : 'Code'}</th>
                        <th className="py-3 px-3">{language === 'ar' ? 'اسم المقرر' : 'Course'}</th>
                        <th className="py-3 px-3">{language === 'ar' ? 'الطلاب' : 'Students'}</th>
                        <th className="py-3 px-3">
                          {language === 'ar' ? 'رئيس اللجنة (الدكتور)' : 'Lead Professor'}
                        </th>
                        <th className="py-3 px-3 min-w-[200px]">
                          {language === 'ar' ? 'المراقبون (الهيئة المعاونة)' : 'Assisting TAs'}
                        </th>
                        <th className="py-3 px-3 text-center">
                          {language === 'ar' ? 'إجراءات' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {sessions.map((s, idx) => {
                        const isCurrentActive = activeSession?.session_id === s.session_id;
                        return (
                          <tr
                            key={s.session_id}
                            className={`transition hover:bg-slate-900/70 ${
                              isCurrentActive ? 'bg-rose-950/25 font-semibold' : ''
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-mono text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300 font-bold whitespace-nowrap">
                              {s.date}
                            </td>
                            <td className="py-3 px-3 font-mono text-cyan-400 font-bold whitespace-nowrap" dir="ltr">
                              {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                              {s.course_code}
                            </td>
                            <td className="py-3 px-3 text-slate-200 font-medium">{s.course_name}</td>
                            <td className="py-3 px-3 font-mono text-slate-300">
                              {s.student_headcount}
                            </td>
                            <td className="py-3 px-3">
                              {s.lead_professor ? (
                                <span className="text-blue-300 font-bold">
                                  {s.lead_professor.full_name}
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">
                                  {language === 'ar' ? 'إشراف عام' : 'General'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {s.tas.map((t) => (
                                  <span
                                    key={t.id}
                                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-medium"
                                  >
                                    <span>{t.full_name.split(' (')[0]}</span>
                                    <button
                                      onClick={() => handleRemoveTA(t.assignment_id, t.full_name)}
                                      disabled={isMutating}
                                      className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
                                      title={language === 'ar' ? 'إزالة المعيد من هذه الفترة' : 'Remove TA'}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                                {s.tas.length === 0 && (
                                  <span className="text-amber-500/80 italic text-[11px]">
                                    {language === 'ar' ? 'قيد التسكين' : 'Allocating...'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                onClick={() => setAddingToSessionId(s.session_id)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center gap-1 mx-auto transition"
                                title={language === 'ar' ? 'إضافة معيد لهذه الفترة' : 'Add TA to session'}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{language === 'ar' ? 'إضافة معيد' : 'Add TA'}</span>
                              </button>
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
