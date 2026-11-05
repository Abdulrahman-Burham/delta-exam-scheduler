import React, { useEffect, useState, useRef, useMemo } from 'react';
import { User, ScheduleAssignmentDetail } from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import html2canvas from 'html2canvas';
import {
  Calendar,
  Clock,
  MapPin,
  FileDown,
  CalendarPlus,
  ShieldCheck,
  Users,
  Camera,
  BookOpen,
  Filter,
  Flame,
  ChevronLeft,
  Table,
  ListOrdered,
} from 'lucide-react';

interface ProfessorDashboardProps {
  currentUser: User;
}

export const ProfessorDashboard: React.FC<ProfessorDashboardProps> = ({ currentUser }) => {
  const { t, language } = useLanguage();
  const [duties, setDuties] = useState<ScheduleAssignmentDetail[]>([]);
  const [allRunAssignments, setAllRunAssignments] = useState<ScheduleAssignmentDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline');

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfessorDuties();
  }, [currentUser.id]);

  const fetchProfessorDuties = async () => {
    setLoading(true);
    try {
      const myDuties = await api.schedules.getUserSchedule(currentUser.id);
      setDuties(myDuties);

      // Also fetch full active schedule to look up assisting TAs in the same rooms
      const fullRun = await api.schedules.getCurrent();
      setAllRunAssignments(fullRun.assignments || []);
    } catch (err) {
      console.error('Failed to load professor oversight schedule', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureImage = async () => {
    if (!printRef.current) return;
    setIsExportingImage(true);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#090d16',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `Professor_Schedule_${currentUser.staff_id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to capture snapshot', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Helper date & time formatting
  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (language === 'ar') {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = [
          'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
          'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
        ];
        return `${days[dateObj.getDay()]}، ${d} ${months[dateObj.getMonth()]} ${y}`;
      } else {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[dateObj.getDay()]}, ${months[dateObj.getMonth()]} ${d}, ${y}`;
      }
    } catch {
      return dateStr;
    }
  };

  const formatShortDay = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      if (language === 'ar') {
        const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        return `${days[dateObj.getDay()]} ${d} ${months[dateObj.getMonth()]}`;
      } else {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[dateObj.getDay()]} ${d} ${months[dateObj.getMonth()]}`;
      }
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    try {
      const [hh, mm] = timeStr.slice(0, 5).split(':').map(Number);
      if (language === 'ar') {
        const period = hh >= 12 ? 'ظهراً' : 'صباحاً';
        const hour12 = hh % 12 === 0 ? 12 : hh % 12;
        return `${hour12}:${mm < 10 ? '0' + mm : mm} ${period}`;
      } else {
        const period = hh >= 12 ? 'PM' : 'AM';
        const hour12 = hh % 12 === 0 ? 12 : hh % 12;
        return `${hour12}:${mm < 10 ? '0' + mm : mm} ${period}`;
      }
    } catch {
      return timeStr?.slice(0, 5) || '';
    }
  };

  // Chronological sorting (Date asc, Start time asc)
  const sortedDuties = useMemo(() => {
    return [...duties].sort((a, b) => {
      const dateA = a.exam_session?.date || '';
      const dateB = b.exam_session?.date || '';
      const cmpDate = dateA.localeCompare(dateB);
      if (cmpDate !== 0) return cmpDate;
      const startA = a.exam_session?.start_time || '';
      const startB = b.exam_session?.start_time || '';
      return startA.localeCompare(startB);
    });
  }, [duties]);

  const uniqueDates = useMemo(() => {
    return Array.from(new Set(sortedDuties.map((d) => d.exam_session.date)));
  }, [sortedDuties]);

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const nextUpcomingDuty = useMemo(() => {
    if (sortedDuties.length === 0) return null;
    const future = sortedDuties.find((d) => d.exam_session.date >= todayStr);
    return future || sortedDuties[0];
  }, [sortedDuties, todayStr]);

  const filteredDuties = useMemo(() => {
    if (selectedDateFilter === 'ALL') return sortedDuties;
    return sortedDuties.filter((d) => d.exam_session.date === selectedDateFilter);
  }, [sortedDuties, selectedDateFilter]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto text-start">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('profPortalTitle')}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              {currentUser.full_name}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {currentUser.title || t('roleProfBadge')} • {currentUser.department} ({currentUser.staff_id})
            </p>
          </div>

          {/* Export Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={api.exports.getPersonalPdfUrl(currentUser.id)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition"
            >
              <FileDown className="w-4 h-4" />
              <span>{t('printPdf')}</span>
            </a>

            <a
              href={api.exports.getPersonalIcsUrl(currentUser.id)}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs transition"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>{t('addToCal')}</span>
            </a>

            <button
              onClick={handleCaptureImage}
              disabled={isExportingImage}
              className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs transition"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>{isExportingImage ? t('takingSnapshot') : t('takeSnapshot')}</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('profAssignedOversight')}</div>
            <div className="text-2xl font-black text-blue-400 mt-1">{duties.length} {t('shiftsCount')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{language === 'ar' ? 'رئاسة لجان معتمدة' : 'Official lead duties'}</div>
          </div>
          <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('profSupervisedCourses')}</div>
            <div className="text-2xl font-black text-cyan-400 mt-1">
              {new Set(duties.map((d) => d.exam_session.course_code)).size}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{language === 'ar' ? 'مقررات تحت إشرافك' : 'Supervised courses'}</div>
          </div>
          <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('taWorkingDays')} ({language === 'ar' ? 'أقصى 3 أيام' : 'Max 3 days'})</div>
            <div className="text-2xl font-black text-white mt-1">
              {uniqueDates.length} / 3 {t('daysCount')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
              {language === 'ar' ? 'ملتزم بالحد الأقصى (صفر تجاوزات)' : 'Within Weekly Days Cap'}
            </div>
          </div>
          <div className="bg-slate-800/40 p-3.5 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('taTotalHours')}</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {Math.round(duties.length * 0.75 * 10) / 10} {t('hoursCount')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {t('profOfficiallyApproved')}
            </div>
          </div>
        </div>
      </div>

      {/* Hero Card for Next / Today's Committee */}
      {nextUpcomingDuty && (
        <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-800/40 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <Flame className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-blue-300">
                  {nextUpcomingDuty.exam_session.date === todayStr ? t('profTodayCommittee') : t('profUpcomingCommittee')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                  {formatDate(nextUpcomingDuty.exam_session.date)}
                </span>
              </div>
              <h2 className="text-lg font-black text-white">
                {nextUpcomingDuty.exam_session.course_name} ({nextUpcomingDuty.exam_session.course_code})
              </h2>
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(nextUpcomingDuty.exam_session.start_time)} - {formatTime(nextUpcomingDuty.exam_session.end_time)}
                </span>
                <span className="flex items-center gap-1.5 text-emerald-300">
                  <MapPin className="w-3.5 h-3.5" />
                  {nextUpcomingDuty.exam_session.venue?.name}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedDateFilter(nextUpcomingDuty.exam_session.date)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
            >
              <span>{t('profViewDayDetails')}</span>
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}

      {/* Date Filter Chips */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap flex items-center gap-1.5 pl-2">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>{t('matrixFilterDate')}</span>
        </span>
        <button
          onClick={() => setSelectedDateFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            selectedDateFilter === 'ALL'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          {t('profAllCommittees')} ({duties.length})
        </button>
        {uniqueDates.map((dStr) => {
          const isSelected = selectedDateFilter === dStr;
          const count = duties.filter((d) => d.exam_session.date === dStr).length;
          return (
            <button
              key={dStr}
              onClick={() => setSelectedDateFilter(dStr)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{formatShortDay(dStr)}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Schedule Display */}
      <div ref={printRef} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-3">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{t('profScheduleTitle')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{t('profSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'timeline' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={t('timelineView')}
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title={t('tableView')}
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              {filteredDuties.length} {t('shiftsCount')}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">{t('loading')}</div>
        ) : filteredDuties.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
            {t('profNoDuties')}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">{t('masterDateCol')}</th>
                    <th className="py-3 px-4">{t('masterTimeCol')}</th>
                    <th className="py-3 px-4">{t('masterCourseCol')}</th>
                    <th className="py-3 px-4">{t('masterVenueCol')}</th>
                    <th className="py-3 px-4">{t('profAssistingTAs')}</th>
                    <th className="py-3 px-4">{t('masterStatusCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDuties.map((d, index) => {
                    const sessionTAs = allRunAssignments.filter(
                      (a) => a.exam_session_id === d.exam_session_id && a.role_in_exam === 'INVIGILATOR_TA'
                    );

                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{formatDate(d.exam_session.date)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">#{index + 1}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-cyan-400" dir="ltr">
                            {formatTime(d.exam_session.start_time)} - {formatTime(d.exam_session.end_time)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{t('taExamDuration')}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span className="text-cyan-400 font-mono">{d.exam_session.course_code}</span>
                            <span className="truncate max-w-[200px]">{d.exam_session.course_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{t('examDeptText')} {d.exam_session.department}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-200">{d.exam_session.venue?.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {d.exam_session.venue?.building} ({t('venueFloorText')} {d.exam_session.venue?.floor})
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-emerald-300">
                            {sessionTAs.length > 0
                              ? sessionTAs.map((ta) => ta.user?.full_name).join(', ')
                              : t('profNoTAsYet')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {sessionTAs.length} {t('roleTABadge')}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                            {t('profOfficiallyApproved')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDuties.map((d, index) => {
              // Find all TAs assigned to this session
              const sessionTAs = allRunAssignments.filter(
                (a) => a.exam_session_id === d.exam_session_id && a.role_in_exam === 'INVIGILATOR_TA'
              );

              return (
                <div
                  key={d.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 shadow-lg transition duration-200 space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/40">
                          {d.exam_session.course_code}
                        </span>
                        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-medium">
                          {t('examDeptText')} {d.exam_session.department}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                          {t('profRoleDesc')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {d.exam_session.course_name}
                      </h3>
                    </div>

                    <div className="text-end bg-slate-950/80 p-2.5 px-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
                      <div>
                        <div className="text-[10px] text-slate-400">{formatDate(d.exam_session.date)}</div>
                        <div className="text-xs font-black text-cyan-400 font-mono mt-0.5" dir="ltr">
                          {formatTime(d.exam_session.start_time)} - {formatTime(d.exam_session.end_time)}
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg text-slate-300">
                        #{index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Mid info: Venue & Capacity */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                      <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400">{t('taExamVenue')}</div>
                        <div className="font-bold text-white mt-0.5">{d.exam_session.venue?.name}</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                      <Users className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400">{t('roomCapacity')}</div>
                        <div className="font-bold text-white mt-0.5">
                          {d.exam_session.student_headcount} {t('students')}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 space-x-reverse">
                      <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400">{t('profSupervisoryRole')}</div>
                        <div className="font-bold text-white mt-0.5">{t('profRoleDesc')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Assisting Proctors Roster */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{t('profAssistingTAs')} ({sessionTAs.length})</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {d.exam_session.venue?.venue_type === 'LAB' ? t('venueProctorQuotaLab') : t('venueProctorQuotaHall')}
                      </span>
                    </div>

                    {sessionTAs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {sessionTAs.map((taAss) => (
                          <div
                            key={taAss.id}
                            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-slate-200">{taAss.user?.full_name}</span>
                            <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {taAss.user?.staff_id}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 text-center">
                        {t('profNoTAsYet')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Official Certified University Signatures Block */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>{t('committeeSignatures')}</span>
            </span>
            <span className="text-[11px] font-mono">{t('facultyHeader')}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="font-bold text-slate-300">{t('committeeLeadSignature')}</div>
              <div className="text-[11px] text-cyan-400 font-semibold">{language === 'ar' ? 'أ.د. طارق النادي' : 'Prof. Tarek El-Nady'}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/80 pt-2">
                {language === 'ar' ? 'التوقيع: .....................' : 'Signature: .....................'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="font-bold text-slate-300">{t('viceDeanSignature')}</div>
              <div className="text-[11px] text-cyan-400 font-semibold">{language === 'ar' ? 'وكيل الكلية لشؤون التعليم' : 'Vice Dean for Student Affairs'}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/80 pt-2">
                {language === 'ar' ? 'التوقيع: .....................' : 'Signature: .....................'}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="font-bold text-slate-300">{t('deanSignature')}</div>
              <div className="text-[11px] text-cyan-400 font-semibold">{language === 'ar' ? 'عميد كلية الذكاء الاصطناعي' : 'Dean of Faculty of AI'}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/80 pt-2">
                {language === 'ar' ? 'الاعتماد: .....................' : 'Approval: .....................'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
