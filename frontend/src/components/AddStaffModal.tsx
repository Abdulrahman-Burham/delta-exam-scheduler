import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface AddStaffModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({ onClose, onSuccess }) => {
  const { language, isRtl } = useLanguage();
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('DeltaPass123!');
  const [role, setRole] = useState<'DOCTOR' | 'TA'>('TA');
  const [department, setDepartment] = useState('Artificial Intelligence');
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('+20 ');
  const [isMasterStudent, setIsMasterStudent] = useState(false);
  const [maxDays, setMaxDays] = useState<number>(3);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleToggle = (newRole: 'DOCTOR' | 'TA') => {
    setRole(newRole);
    if (newRole === 'DOCTOR') {
      setTitle(language === 'ar' ? 'مدرس دكتور' : 'Lecturer / Doctor');
      setMaxDays(5);
      setIsMasterStudent(false);
    } else {
      setTitle(language === 'ar' ? 'معيد' : 'Teaching Assistant');
      setMaxDays(isMasterStudent ? 2 : 3);
    }
  };

  const handleMasterToggle = (val: boolean) => {
    setIsMasterStudent(val);
    if (val) {
      setMaxDays(2);
    } else {
      setMaxDays(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !staffId.trim() || !email.trim()) {
      setError(language === 'ar' ? 'يرجى ملء الحقول الإلزامية (الاسم، الرقم التعريفي، البريد)' : 'Please fill required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.users.create({
        full_name: fullName.trim(),
        staff_id: staffId.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        password: password,
        role: role,
        department: department,
        title: title || (role === 'DOCTOR' ? 'Lecturer' : 'Teaching Assistant'),
        phone: phone.trim(),
        is_master_student: isMasterStudent,
        max_days_per_week: Number(maxDays),
        max_daily_shifts: 2,
        max_total_shifts: role === 'DOCTOR' ? 8 : 6,
        is_active: true,
      });

      toast.success(
        language === 'ar' ? 'تمت إضافة العضو بنجاح' : 'Staff member registered successfully'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل حفظ العضو' : 'Failed to register staff member'));
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
              {language === 'ar' ? 'إضافة عضو جديد للهيئة الأكاديمية' : 'Register New Faculty Staff'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar'
                ? 'إدراج دكتور أو معيد جديد مع تحديد القسم وسقف الحضور الأسبوعي'
                : 'Add a new Doctor or TA with attendance quota and departmental allocation'}
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
          {/* Role Toggle Chips */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'التصنيف الأكاديمي' : 'Staff Category'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRoleToggle('DOCTOR')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  role === 'DOCTOR'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm shadow-blue-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'عضو هيئة تدريس (دكتور / أستاذ)' : 'Doctor / Professor'}
              </button>
              <button
                type="button"
                onClick={() => handleRoleToggle('TA')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  role === 'TA'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'هيئة معاونة (معيد / مساعد باحث)' : 'Teaching Assistant (TA)'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'الاسم ثلاثي / رباعي' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === 'DOCTOR' ? 'د/ عصام الشافعي' : 'م/ شريف فتحي'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'الرقم الأكاديمي (Staff ID)' : 'Staff ID'} *
              </label>
              <input
                type="text"
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder={role === 'DOCTOR' ? 'DU-DOC-08' : 'DU-TA-019'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs uppercase font-mono focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'البريد الجامعي' : 'University Email'} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@deltauniv.edu.eg"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'رقم الهاتف / الواتساب' : 'Phone Number'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                {language === 'ar' ? 'الحد الأقصى لأيام الحضور أسبوعياً' : 'Max Days/Week Cap'}
              </label>
              <select
                value={maxDays}
                onChange={(e) => setMaxDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              >
                <option value={2}>2 {language === 'ar' ? 'أيام (معيد ماجستير وبحث علمي)' : 'Days (Master TA)'}</option>
                <option value={3}>3 {language === 'ar' ? 'أيام (معيد متفرغ قياسي)' : 'Days (Standard TA)'}</option>
                <option value={4}>4 {language === 'ar' ? 'أيام (أعضاء اللجان)' : 'Days (Committee)'}</option>
                <option value={5}>5 {language === 'ar' ? 'أيام (إشراف عام دائم)' : 'Days (Full)'}</option>
              </select>
            </div>
          </div>

          {/* Master TA Checkbox */}
          {role === 'TA' && (
            <div className="flex items-center space-x-2 space-x-reverse p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30">
              <input
                type="checkbox"
                id="masterCheckbox"
                checked={isMasterStudent}
                onChange={(e) => handleMasterToggle(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 bg-slate-900 border-slate-700 focus:ring-0"
              />
              <label htmlFor="masterCheckbox" className="text-[11px] text-purple-200 cursor-pointer">
                {language === 'ar'
                  ? 'مقيد بالدراسات العليا / تمهيدي ماجستير (يمنح يومين راحة وبحث علمي ويحدد حضوره بيومين فقط)'
                  : 'Enrolled in Master\'s research (Automatically caps weekly attendance to 2 days)'}
              </label>
            </div>
          )}

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
                <span>{language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة العضو' : 'Save Member'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
