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

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {language === 'ar' ? 'استعلام مقر ولجنة ورقم جلوس الطالب' : 'Student Seat & Venue Finder'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'ابحث بكود الطالب الجامعي لمعرفة قاعات ومواعيد ورقم الجلوس في كل مادة'
                  : 'Search by university Student ID to locate exam room, time, and seat number'}
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

        {/* Search Bar */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-3.5 right-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'ar'
                    ? 'أدخل كود الطالب الجامعي (مثال: 4211015) أو اسم الطالب...'
                    : 'Enter Student ID (e.g. 4211015) or Student Name...'
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pr-10 pl-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl text-sm transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
            >
              {loading ? (
                <span>{language === 'ar' ? 'جاري البحث...' : 'Searching...'}</span>
              ) : (
                <span>{language === 'ar' ? 'استعلام' : 'Search'}</span>
              )}
            </button>
          </form>

          {/* Quick chips examples */}
          <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
            <span>{language === 'ar' ? 'أمثلة سريعة للتجربة:' : 'Try sample IDs:'}</span>
            {['4211015', '4231451', '4211186', '4221300'].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setSearchQuery(ex);
                  api.students.lookup(ex).then(setResult).catch(() => {});
                }}
                className="font-mono text-cyan-400 hover:underline hover:text-cyan-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-12 text-slate-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-medium">
                {language === 'ar'
                  ? 'اكتب كود الطالب في الأعلى واضغط استعلام لعرض المقرات وأرقام الجلوس'
                  : 'Enter student code above and press Search to view venues and seat numbers'}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Student Profile Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-800 to-slate-800/60 border border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                      #{result.student_code}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {result.department}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {result.full_name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {language === 'ar' ? 'العام الأكاديمي:' : 'Academic Year:'}{' '}
                    <span className="text-slate-300">{result.academic_year}</span> •{' '}
                    {language === 'ar' ? 'عدد المواد المسجلة:' : 'Scheduled Exams:'}{' '}
                    <span className="text-cyan-400 font-bold">{result.total_exams}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleShareWhatsApp(result)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                  title="مشاركة الكرت عبر واتساب"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'مشاركة عبر WhatsApp' : 'Share via WhatsApp'}</span>
                </button>
              </div>

              {/* Exams Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {language === 'ar' ? 'جدول لجان ومقرات الامتحانات' : 'Exam Venues & Seating Schedule'}
                </h4>

                {result.seatings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {language === 'ar' ? 'لا توجد امتحانات مسجلة لهذا الطالب' : 'No exams scheduled for this student'}
                  </p>
                ) : (
                  result.seatings.map((exam, i) => (
                    <div
                      key={exam.seating_id || i}
                      className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/80 hover:border-cyan-500/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {exam.course_name}
                          </span>
                          {exam.department && (
                            <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                              {exam.department}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          {exam.exam_date && (
                            <div className="flex items-center gap-1 text-slate-300">
                              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{exam.exam_date}</span>
                            </div>
                          )}
                          {exam.start_time && (
                            <div className="flex items-center gap-1 text-slate-300">
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
                              <span>
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
                        <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-end">
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
                            {language === 'ar' ? 'رقم الجلوس' : 'Seat No.'}
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-400">
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
