import React, { useState } from 'react';
import {
  X,
  Search,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Share2,
  AlertCircle,
  Hash,
  Download,
  Printer,
  QrCode,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { api } from '../services/api';
import { StudentLookupResult } from '../types';

interface StudentLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
}

export const StudentLookupModal: React.FC<StudentLookupModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StudentLookupResult | null>(null);
  const [showHallTicket, setShowHallTicket] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowHallTicket(false);

    try {
      const data = await api.students.lookup(searchQuery.trim());
      setResult(data);
    } catch (err: any) {
      setError(
        err.message ||
          (language === 'ar'
            ? 'لم يتم العثور على طالب بهذا الكود أو الاسم'
            : 'No student found with this ID or name')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = (s: StudentLookupResult) => {
    const isAr = language === 'ar';
    let text = isAr
      ? `📋 *جدول ومقر امتحانات الطالب*\n`
      : `📋 *Student Examination Seating Card*\n`;
    text += `${isAr ? '👤 الاسم' : '👤 Name'}: ${s.full_name}\n`;
    text += `${isAr ? '🔢 الكود' : '🔢 ID'}: ${s.student_code}\n`;
    text += `${isAr ? '🏛️ القسم' : '🏛️ Dept'}: ${s.department}\n`;
    text += `----------------------------------------\n`;

    s.seatings.forEach((exam, idx) => {
      text += `\n*${idx + 1}. ${exam.course_name}*\n`;
      text += `📅 ${exam.exam_date || ''} | ⏰ ${exam.start_time || ''} - ${exam.end_time || ''}\n`;
      text += `📍 ${isAr ? 'المقر/اللجنة' : 'Venue'}: *${exam.venue_name}*\n`;
      text += `🪑 ${isAr ? 'رقم الجلوس في المعمل' : 'Lab Seat #'}: *${exam.seat_number || '-'}*\n`;
      if (exam.lead_doctor) text += `👨‍🏫 ${isAr ? 'أستاذ المادة' : 'Lead Doctor'}: ${exam.lead_doctor}\n`;
    });

    text += `\n----------------------------------------\n`;
    text += isAr
      ? `مع تمنيات كلية الذكاء الاصطناعي - جامعة الدلتا بالتوفيق والنجاح 🌟`
      : `Delta University Faculty of Artificial Intelligence 🌟`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const qrDataUrl = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(
        `DELTASYNC|${result.student_code}|${result.full_name}|${result.department}|TOTAL:${result.total_exams}`
      )}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {language === 'ar' ? 'استعلام مقرات وجلوس طلاب الكلية' : 'Student Seat & Venue Finder'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'جامعة الدلتا للعلوم والتكنولوجيا • كلية الذكاء الاصطناعي'
                  : 'Delta University for Science & Technology • Faculty of AI'}
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

        {/* Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/50">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-3.5 right-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'أدخل كود الطالب الجامعي (مثال: 4231451) أو اسم الطالب...'
                    : 'Enter Student ID (e.g. 4231451) or Student Name...'
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 shrink-0"
            >
              {loading ? (
                <span>{language === 'ar' ? 'جاري البحث...' : 'Searching...'}</span>
              ) : (
                <span>{language === 'ar' ? 'استعلام' : 'Search'}</span>
              )}
            </button>
          </form>

          {/* Quick chips examples */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
            <span>{language === 'ar' ? 'أمثلة سريعة للتجربة:' : 'Try sample IDs:'}</span>
            {['4231451', '4231455', '4231457', '4231466', '4231468'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setSearchQuery(ex);
                  api.students.lookup(ex).then(setResult).catch(() => {});
                }}
                className="font-mono text-cyan-400 hover:underline hover:text-cyan-300 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800 text-[11px]"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-16 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">
                {language === 'ar'
                  ? 'اكتب كود الطالب في الأعلى واضغط استعلام لعرض المقرات وأرقام الجلوس'
                  : 'Enter student code above and press Search to view venues and seat numbers'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {language === 'ar'
                  ? 'متاح لطلاب أقسام الذكاء الاصطناعي، الأمن السيبراني، والمعلوماتية الحيوية'
                  : 'Covers AI, Cybersecurity, and Bioinformatics departments'}
              </p>
            </div>
          )}

          {result && !showHallTicket && (
            <div className="space-y-4 animate-fade-in">
              {/* Student Profile Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                      #{result.student_code}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {result.department}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {result.full_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' ? 'العام الأكاديمي:' : 'Academic Year:'}{' '}
                    <span className="text-slate-300">{result.academic_year}</span> •{' '}
                    {language === 'ar' ? 'عدد المواد المسجلة:' : 'Scheduled Exams:'}{' '}
                    <span className="text-cyan-400 font-bold">{result.total_exams}</span>
                  </p>
                </div>

                {/* Quick Action Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHallTicket(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-md shadow-cyan-600/20"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'بطاقة الجلوس الرقمية (QR)' : 'Digital Hall Pass'}</span>
                  </button>

                  <a
                    href={api.students.getCalendarIcsUrl(result.student_code)}
                    download={`Exam_Schedule_${result.student_code}.ics`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
                    title={language === 'ar' ? 'إضافة إلى تقويم هاتفي (Google / Apple Calendar)' : 'Add to Calendar'}
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'ar' ? 'مزامنة مع التقويم' : 'Add to Calendar'}</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleShareWhatsApp(result)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                    title="مشاركة الكرت عبر واتساب"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Exams Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{language === 'ar' ? 'جدول لجان ومقرات الامتحانات' : 'Exam Venues & Seating Schedule'}</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {result.seatings.length} {language === 'ar' ? 'امتحانات مسجلة' : 'exams'}
                  </span>
                </div>

                {result.seatings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {language === 'ar' ? 'لا توجد امتحانات مسجلة لهذا الطالب' : 'No exams scheduled for this student'}
                  </p>
                ) : (
                  result.seatings.map((exam, i) => (
                    <div
                      key={exam.seating_id || i}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {exam.course_name}
                          </span>
                          {exam.department && (
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                              {exam.department}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          {exam.exam_date && (
                            <div className="flex items-center gap-1 text-slate-300 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{exam.exam_date}</span>
                            </div>
                          )}
                          {exam.start_time && (
                            <div className="flex items-center gap-1 text-slate-300 font-mono" dir="ltr">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                {exam.start_time} - {exam.end_time || ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {(exam.lead_doctor || (exam.invigilator_tas && exam.invigilator_tas.length > 0)) && (
                          <div className="text-[11px] text-slate-400 pt-1">
                            {exam.lead_doctor && (
                              <span className="text-blue-300">
                                👨‍🏫 {language === 'ar' ? 'المشرف:' : 'Supervisor:'} {exam.lead_doctor}{' '}
                              </span>
                            )}
                            {exam.invigilator_tas && exam.invigilator_tas.length > 0 && (
                              <span className="text-slate-500">
                                • {language === 'ar' ? 'المراقبون:' : 'TAs:'} {exam.invigilator_tas.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Venue & Seat Badge */}
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-end">
                          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-bold">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{exam.venue_name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {language === 'ar' ? 'مبنى الذكاء الاصطناعي' : 'AI Building'}
                          </div>
                        </div>

                        <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-cyan-950 to-blue-950 border border-cyan-500/40 text-center min-w-[90px]">
                          <div className="text-[10px] text-cyan-300 uppercase font-semibold">
                            {language === 'ar' ? 'رقم المقعد' : 'Seat No.'}
                          </div>
                          <div className="text-xl font-black text-white font-mono flex items-center justify-center gap-0.5">
                            <Hash className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{exam.seat_number || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Printable Official Digital Hall Ticket View */}
          {result && showHallTicket && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2">
                <button
                  type="button"
                  onClick={() => setShowHallTicket(false)}
                  className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition"
                >
                  {language === 'ar' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  <span>{language === 'ar' ? 'الرجوع إلى الجدول' : 'Back to Schedule'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === 'ar' ? 'طباعة البطاقة' : 'Print Ticket'}</span>
                </button>
              </div>

              {/* The Official Hall Ticket Container */}
              <div className="p-6 rounded-3xl bg-slate-950 border-2 border-cyan-500/40 shadow-2xl space-y-6 text-white relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-40 h-40 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* University Header */}
                <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-cyan-400 font-bold">
                      {language === 'ar' ? 'جامعة الدلتا للعلوم والتكنولوجيا' : 'Delta University for Science & Technology'}
                    </div>
                    <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                      {language === 'ar' ? 'كلية الذكاء الاصطناعي • وحدة الكنترول والامتحانات' : 'Faculty of Artificial Intelligence • Examination Control'}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {language === 'ar' ? 'بطاقة إثبات جلوس ودخول الامتحانات الرسمية' : 'Official Student Examination Entry Ticket'}
                    </p>
                  </div>

                  <div className="p-2 rounded-2xl bg-white border border-slate-200 shrink-0">
                    <img
                      src={qrDataUrl}
                      alt="Student Verification QR"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                </div>

                {/* Student Info Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">
                      {language === 'ar' ? 'اسم الطالب:' : 'Student Name:'}
                    </span>
                    <strong className="text-white text-xs block mt-0.5 truncate">{result.full_name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">
                      {language === 'ar' ? 'الكود الجامعي:' : 'University ID:'}
                    </span>
                    <strong className="text-cyan-400 font-mono text-xs block mt-0.5">#{result.student_code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">
                      {language === 'ar' ? 'القسم الأكاديمي:' : 'Department:'}
                    </span>
                    <strong className="text-slate-200 text-xs block mt-0.5">{result.department}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block text-[10px]">
                      {language === 'ar' ? 'العام الأكاديمي:' : 'Academic Year:'}
                    </span>
                    <strong className="text-amber-300 font-mono text-xs block mt-0.5">{result.academic_year}</strong>
                  </div>
                </div>

                {/* Exam Table */}
                <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 text-center">#</th>
                        <th className="py-2.5 px-3">{language === 'ar' ? 'اسم المقرر' : 'Course'}</th>
                        <th className="py-2.5 px-3">{language === 'ar' ? 'المقر / المعمل' : 'Venue'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'رقم المقعد' : 'Seat'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'ar' ? 'التوقيت' : 'Time'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {result.seatings.map((exam, idx) => (
                        <tr key={idx} className="hover:bg-slate-850">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-white">{exam.course_name}</td>
                          <td className="py-2.5 px-3 text-cyan-400 font-bold">{exam.venue_name}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-300">
                            {exam.seat_number || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{exam.exam_date || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300" dir="ltr">
                            {exam.start_time ? `${exam.start_time.slice(0, 5)} - ${exam.end_time?.slice(0, 5) || ''}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Exam Regulations & Guidelines */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'تعليمات وضوابط الامتحان الرسمية:' : 'Official Exam Regulations:'}</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 pr-2">
                    <li>{language === 'ar' ? 'الحضور قبل موعد بدء الامتحان بـ 15 دقيقة على الأقل.' : 'Arrive at least 15 minutes before exam start.'}</li>
                    <li>{language === 'ar' ? 'يُحظر تماماً اصطحاب الهاتف المحمول أو الساعات الذكية داخل اللجان.' : 'Smartphones and smartwatches are strictly prohibited.'}</li>
                    <li>{language === 'ar' ? 'الالتزام برقم المقعد والمعمل الموضحين بالبطاقة تجنباً لإلغاء الامتحان.' : 'Strictly adhere to the designated seat and lab.'}</li>
                    <li>{language === 'ar' ? 'إبراز هذه البطاقة والكارنيه الجامعي عند المناداة للتحقق.' : 'Present this pass with university ID card at check-in.'}</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {language === 'ar'
                ? 'بيانات معتمدة من الكنترول الرسمي لكلية الذكاء الاصطناعي'
                : 'Official certified data from Examination Control'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs transition"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
