import React, { useState } from 'react';
import { X, CalendarPlus, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Venue } from '../types';

interface AddExamModalProps {
  venues: Venue[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AddExamModal: React.FC<AddExamModalProps> = ({ venues, onClose, onSuccess }) => {
  const { language, isRtl } = useLanguage();
  const toast = useToast();

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [department, setDepartment] = useState('Artificial Intelligence');
  const [date, setDate] = useState('2026-06-01');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('11:00:00');
  const [studentHeadcount, setStudentHeadcount] = useState<number>(120);
  const [venueId, setVenueId] = useState<number>(venues[0]?.id ?? 1);
  const [requiredProfessors, setRequiredProfessors] = useState<number>(1);
  const [requiredTas, setRequiredTas] = useState<number>(2);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !courseName.trim() || !date) {
      setError(language === 'ar' ? 'يرجى إدخال كود المادة واسمها وتاريخ الامتحان' : 'Please fill required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.exams.create({
        course_code: courseCode.trim().toUpperCase(),
        course_name: courseName.trim(),
        department: department,
        date: date,
        start_time: startTime.length === 5 ? `${startTime}:00` : startTime,
        end_time: endTime.length === 5 ? `${endTime}:00` : endTime,
        student_headcount: Number(studentHeadcount),
        venue_id: Number(venueId),
        required_professors: Number(requiredProfessors),
        required_tas: Number(requiredTas),
        status: 'SCHEDULED',
      });

      toast.success(
        language === 'ar' ? 'تمت إضافة الجلسة الامتحانية بنجاح' : 'Exam session created successfully'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل إضافة الامتحان' : 'Failed to create exam session'));
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
            <CalendarPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {language === 'ar' ? 'إضافة جلسة امتحانية جديدة' : 'Add New Exam Session'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'جدولة امتحان لمقر دراسي وتحديد القاعة وكوتة المراقبين' : 'Schedule course exam session and assign proctor quota'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'كود المادة' : 'Course Code'} *
              </label>
              <input
                type="text"
                required
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                placeholder="AI-302"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs uppercase font-mono focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'اسم المقرر الدراسي' : 'Course Name'} *
              </label>
              <input
                type="text"
                required
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="Machine Learning & Deep Neural Nets"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'القسم الأكاديمي' : 'Department'}
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="Artificial Intelligence">Artificial Intelligence (الذكاء الاصطناعي)</option>
                <option value="Computer Science">Computer Science (علوم الحاسب)</option>
                <option value="Cybersecurity">Cybersecurity (الأمن السيبراني)</option>
                <option value="Data Science">Data Science (علوم البيانات)</option>
                <option value="Software Engineering">Software Engineering (هندسة البرمجيات)</option>
                <option value="Bioinformatics">Bioinformatics (المعلوماتية الحيوية)</option>
                <option value="Information Systems">Information Systems (نظم المعلومات)</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'المقر / القاعة' : 'Examination Venue'}
              </label>
              <select
                value={venueId}
                onChange={(e) => setVenueId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
              >
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.capacity} {language === 'ar' ? 'طالب' : 'seats'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'تاريخ الامتحان' : 'Date'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'وقت البدء' : 'Start Time'}
              </label>
              <input
                type="time"
                required
                value={startTime.slice(0, 5)}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'وقت الانتهاء' : 'End Time'}
              </label>
              <input
                type="time"
                required
                value={endTime.slice(0, 5)}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'عدد الطلاب' : 'Headcount'}
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={studentHeadcount}
                onChange={(e) => setStudentHeadcount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'عدد الدكاترة' : 'Professors'}
              </label>
              <input
                type="number"
                min={0}
                max={5}
                value={requiredProfessors}
                onChange={(e) => setRequiredProfessors(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'عدد المعيدين' : 'TAs'}
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={requiredTas}
                onChange={(e) => setRequiredTas(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
          </div>

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
                <span>{language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'حفظ الامتحان' : 'Save Session'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
