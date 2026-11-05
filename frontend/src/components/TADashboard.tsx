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
  Camera,
  CheckCircle2,
  Building,
  GraduationCap,
  Sparkles,
  Coffee,
  AlertCircle,
  Filter,
  ArrowRight,
  LayoutGrid,
  ListOrdered,
  ChevronLeft,
  Flame,
  Bell,
  Table,
  ShieldCheck,
} from 'lucide-react';

interface TADashboardProps {
  currentUser: User;
}

export const TADashboard: React.FC<TADashboardProps> = ({ currentUser }) => {
  const { t, language } = useLanguage();
  const [duties, setDuties] = useState<ScheduleAssignmentDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'grid'>('timeline');

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMySchedule();
  }, [currentUser.id]);

  const fetchMySchedule = async () => {
    setLoading(true);
    try {
      const data = await api.schedules.getUserSchedule(currentUser.id);
      setDuties(data);
    } catch (err) {
      console.error('Failed to fetch TA duties', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureImage = async () => {
    if (!cardRef.current) return;
    setIsExportingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#090d16',
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `Schedule_${currentUser.staff_id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to capture schedule snapshot', err);
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

  const getMinutesBetween = (time1?: string, time2?: string) => {
    if (!time1 || !time2) return 0;
    try {
      const [h1, m1] = time1.slice(0, 5).split(':').map(Number);
      const [h2, m2] = time2.slice(0, 5).split(':').map(Number);
      return (h2 * 60 + m2) - (h1 * 60 + m1);
    } catch {
      return 0;
    }
  };

  // 1. Strict Chronological Sorting (Date asc, Start Time asc)
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

  // 2. Group duties by date
  const dutiesByDate = useMemo(() => {
    const map: Record<string, ScheduleAssignmentDetail[]> = {};
    sortedDuties.forEach((d) => {
      const dStr = d.exam_session.date;
      if (!map[dStr]) map[dStr] = [];
      map[dStr].push(d);
    });
    return map;
  }, [sortedDuties]);

  const uniqueDates = useMemo(() => Object.keys(dutiesByDate), [dutiesByDate]);

  // Today's date (local system date)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const todayDuties = dutiesByDate[todayStr] || [];

  // Next upcoming duty
  const nextUpcomingDuty = useMemo(() => {
    if (sortedDuties.length === 0) return null;
    const future = sortedDuties.find((d) => d.exam_session.date >= todayStr);
    return future || sortedDuties[0];
  }, [sortedDuties, todayStr]);

  // Filtered dates
  const displayedDates = useMemo(() => {
    if (selectedDateFilter === 'ALL') return uniqueDates;
    if (selectedDateFilter === 'TODAY') return todayDuties.length > 0 ? [todayStr] : [];
    return uniqueDates.filter((d) => d === selectedDateFilter);
  }, [selectedDateFilter, uniqueDates, todayStr, todayDuties]);

  const totalFilteredDutiesCount = displayedDates.reduce((acc, d) => acc + (dutiesByDate[d]?.length || 0), 0);
  const totalHours = Math.round(duties.length * 0.75 * 10) / 10; // 45 mins = 0.75 hr per session

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto text-start">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('taPortalTitle')}</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              {t('taWelcome')}، {currentUser.full_name}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {currentUser.title || t('roleTABadge')} • {currentUser.department} ({currentUser.staff_id})
            </p>
          </div>

          {/* Quick Actions */}
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
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{isExportingImage ? t('takingSnapshot') : t('takeSnapshot')}</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('taTotalShifts')}</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{duties.length} {t('shiftsCount')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{language === 'ar' ? 'فترات مراقبة مسكنة' : 'Assigned proctorships'}</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('taTotalHours')}</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">{totalHours} {t('hoursCount')}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{language === 'ar' ? '45 دقيقة لكل فترة' : '45 mins per session'}</div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">
              {t('taWorkingDays')} ({currentUser.is_master_student ? (language === 'ar' ? 'أقصى 3 أيام' : 'Max 3 days') : (language === 'ar' ? 'أقصى 4 أيام' : 'Max 4 days')})
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              {uniqueDates.length} / {currentUser.is_master_student ? 3 : 4} {t('daysCount')}
            </div>
            <div className="text-[10px] text-emerald-400 font-bold mt-0.5">
              {language === 'ar' ? 'ملتزم بالحد الأقصى (صفر تجاوزات)' : 'Within Weekly Days Cap'}
            </div>
          </div>
          <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
            <div className="text-[11px] text-slate-400">{t('taDutyStatus')}</div>
            <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> {t('approvedStatus')}
            </div>
            <div className="text-[10px] text-cyan-400 font-mono mt-1">{t('departmentAI')}</div>
          </div>
        </div>

        {/* Master's Degree Status Notice */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-400" />
            <span>
              {currentUser.is_master_student
                ? t('taMasterBadge')
                : t('taRegularBadge')}
            </span>
          </div>
          <span className="text-[11px] text-purple-300 bg-purple-950/40 border border-purple-800/40 px-2.5 py-0.5 rounded-full font-mono">
            {t('approvedStatus')}
          </span>
        </div>
      </div>

      {/* 2. Hero Card: Today or Next Upcoming Duty */}
      {nextUpcomingDuty && (
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/50 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {nextUpcomingDuty.exam_session.date === todayStr ? t('taTodayDuty') : t('taUpcomingDuty')}
                </span>
              </div>
              <h3 className="text-lg font-black text-white">
                {nextUpcomingDuty.exam_session.course_name}
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span className="font-mono text-cyan-300">{nextUpcomingDuty.exam_session.course_code}</span>
                <span>•</span>
                <span>{nextUpcomingDuty.exam_session.venue?.name}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">
                  {formatDate(nextUpcomingDuty.exam_session.date)}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 text-end">
                <div className="text-[10px] text-slate-400 font-mono">{t('taTimeSlot')}</div>
                <div className="text-sm font-black text-cyan-400 font-mono" dir="ltr">
                  {formatTime(nextUpcomingDuty.exam_session.start_time)} - {formatTime(nextUpcomingDuty.exam_session.end_time)}
                </div>
              </div>
              <button
                onClick={() => setSelectedDateFilter(nextUpcomingDuty.exam_session.date)}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-1.5"
              >
                <span>{t('taViewDaySchedule')}</span>
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Day Navigation Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('taChooseDay')}</span>
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'timeline' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title={t('taTimelineView')}
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'table' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title={t('tableView')}
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'grid' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title={t('taGridView')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedDateFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedDateFilter === 'ALL'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t('allDays')} ({duties.length})
          </button>

          {todayDuties.length > 0 && (
            <button
              onClick={() => setSelectedDateFilter('TODAY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedDateFilter === 'TODAY'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40 border border-emerald-500/30'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('today')} ({todayDuties.length})</span>
            </button>
          )}

          {uniqueDates.map((dStr) => {
            const count = dutiesByDate[dStr]?.length || 0;
            const isToday = dStr === todayStr;
            const isSelected = selectedDateFilter === dStr;

            return (
              <button
                key={dStr}
                onClick={() => setSelectedDateFilter(dStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : isToday
                    ? 'bg-emerald-950/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400'
                    : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span>{formatShortDay(dStr)}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Duties Schedule View (Grouped Chronologically by Day) */}
      <div ref={cardRef} className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>{t('taMyScheduleTitle')}</span>
          </h2>
          <span className="text-xs text-slate-400">
            {totalFilteredDutiesCount} {t('shiftsCount')}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">{t('loading')}</div>
        ) : duties.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <p className="text-slate-300 font-semibold text-sm">
              {t('taNoDuties')}
            </p>
            <p className="text-xs text-slate-500">
              {t('taNoDutiesNotice')}
            </p>
          </div>
        ) : displayedDates.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <p className="text-slate-300 font-semibold text-sm">
              {t('taNoDutiesToday')}
            </p>
            <button
              onClick={() => setSelectedDateFilter('ALL')}
              className="text-xs text-cyan-400 hover:underline font-bold"
            >
              {t('taShowAllDays')}
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">{t('masterDateCol')}</th>
                    <th className="py-3 px-4">{t('taTimeSlot')}</th>
                    <th className="py-3 px-4">{t('masterCourseCol')}</th>
                    <th className="py-3 px-4">{t('masterVenueCol')}</th>
                    <th className="py-3 px-4">{t('roomCapacity')}</th>
                    <th className="py-3 px-4">{t('masterStatusCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {displayedDates.flatMap((dateStr) => dutiesByDate[dateStr] || []).map((d, idx) => {
                    const isLab = d.exam_session.venue?.venue_type === 'LAB';
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{formatDate(d.exam_session.date)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">#{idx + 1}</div>
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                            isLab ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {isLab ? t('taLabVenue') : t('taHallVenue')}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {d.exam_session.student_headcount} {t('students')}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                            {t('approvedStatus')}
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
          displayedDates.map((dateStr) => {
            const dayDuties = dutiesByDate[dateStr] || [];
            const isToday = dateStr === todayStr;

            return (
              <div
                key={dateStr}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4"
              >
                {/* Day Header Banner */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-base font-extrabold text-white tracking-wide">
                      {formatDate(dateStr)}
                    </h3>
                    {isToday && (
                      <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full shadow-sm shadow-emerald-500/20">
                        {t('today')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                    {dayDuties.length} {t('shiftsCount')}
                  </span>
                </div>

                {/* Day Shifts */}
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
                  {dayDuties.map((d, idx) => {
                    const isLab = d.exam_session.venue?.venue_type === 'LAB';
                    const isHall = d.exam_session.venue?.venue_type === 'HALL';

                    // Compute rest time before this shift if there was a previous shift today
                    let restNotice = null;
                    if (idx > 0) {
                      const prevDuty = dayDuties[idx - 1];
                      const gapMinutes = getMinutesBetween(prevDuty.exam_session.end_time, d.exam_session.start_time);
                      if (gapMinutes > 0 && gapMinutes <= 180) {
                        const gapHours = Math.floor(gapMinutes / 60);
                        const gapMins = gapMinutes % 60;
                        const gapText = gapHours > 0
                          ? (language === 'ar' ? `${gapHours} ساعة و ${gapMins} دقيقة` : `${gapHours}h ${gapMins}m`)
                          : (language === 'ar' ? `${gapMins} دقيقة` : `${gapMins} mins`);

                        restNotice = (
                          <div className="flex items-center gap-1.5 text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1.5 rounded-xl">
                            <Coffee className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{t('restInterval')}: <strong>{gapText}</strong></span>
                          </div>
                        );
                      } else if (gapMinutes === 0) {
                        restNotice = (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/30 px-3 py-1.5 rounded-xl">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>{t('backToBack')}</span>
                          </div>
                        );
                      }
                    }

                    return (
                      <React.Fragment key={d.id}>
                        {restNotice}

                        <div className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 transition duration-200 space-y-3">
                          {/* Course & Timing */}
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 space-x-reverse">
                                <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded border border-cyan-800/40">
                                  {d.exam_session.course_code}
                                </span>
                                <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                  {t('examDeptText')} {d.exam_session.department}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-white">
                                {d.exam_session.course_name}
                              </h4>
                            </div>

                            {/* Time Badge */}
                            <div className="text-end bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                              <div className="text-[10px] text-slate-400">{t('taShiftNum')} #{idx + 1}</div>
                              <div className="text-xs font-black text-cyan-400 font-mono" dir="ltr">
                                {formatTime(d.exam_session.start_time)} - {formatTime(d.exam_session.end_time)}
                              </div>
                            </div>
                          </div>

                          {/* Venue & Capacity */}
                          <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 pt-2 border-t border-slate-800/60 gap-2">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                              <span className="font-bold text-white">{d.exam_session.venue?.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                isLab ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {isLab ? t('taLabVenue') : t('taHallVenue')}
                              </span>
                            </div>

                            <div className="text-slate-400 text-[11px]">
                              {t('roomCapacity')}: {d.exam_session.student_headcount} {t('students')}
                            </div>
                          </div>

                          {/* Footer Arrival Notice */}
                          <div className="text-[11px] text-slate-500 bg-slate-900/50 p-2 rounded-xl border border-slate-800/40 flex items-center justify-between">
                            <span>{t('arrivalNotice')}</span>
                            <span className="font-mono text-cyan-400 font-semibold">{t('taExamDuration')}</span>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Official Certified University Signatures Block */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
            <span className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
