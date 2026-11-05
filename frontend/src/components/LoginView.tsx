import React, { useState } from 'react';
import {
  CalendarCheck,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  GraduationCap,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Languages,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { language, toggleLanguage, isRtl } = useLanguage();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickPersonas = [
    {
      title: language === 'ar' ? 'أ.م.د/ هناء سالم' : 'Dr. Hanaa Salem',
      role: language === 'ar' ? 'عميد الكلية (رئيس لجنة الامتحانات)' : 'Dean of Faculty (Admin)',
      email: 'admin@faculty.edu',
      password: 'AdminPass123!',
      badge: language === 'ar' ? 'مدير النظام' : 'Admin',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      icon: ShieldAlert,
    },
    {
      title: language === 'ar' ? 'أ.م.د/ طارق حسن' : 'Dr. Tarek Hassan',
      role: language === 'ar' ? 'وكيل الكلية لشؤون التعليم والطلاب' : 'Vice Dean for Student Affairs',
      email: 'tarek.hassan@deltauniv.edu.eg',
      password: 'AdminPass123!',
      badge: language === 'ar' ? 'وكيل الكلية' : 'Vice Dean',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: GraduationCap,
    },
    {
      title: language === 'ar' ? 'أ.م.د/ نهى العطار' : 'Dr. Noha El-Attar',
      role: language === 'ar' ? 'أستاذ مساعد / إشراف عام على الامتحانات' : 'Assoc. Prof. / General Supervisor',
      email: 'noha.elattar@deltauniv.edu.eg',
      password: 'DoctorPass123!',
      badge: language === 'ar' ? 'عضو هيئة تدريس' : 'Doctor',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: GraduationCap,
    },
    {
      title: language === 'ar' ? 'م/ أحمد فكري باغه' : 'Eng. Ahmed Fekry',
      role: language === 'ar' ? 'مساعد باحث / معيد #1 (مراقبة قاعات)' : 'Research Assistant / TA #1 (Hall)',
      email: 'ahmed.fekry@deltauniv.edu.eg',
      password: 'TAPass123!',
      badge: language === 'ar' ? 'معيد' : 'TA',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: UserCheck,
    },
    {
      title: language === 'ar' ? 'م/ نوران عماد النمر' : 'Eng. Nouran Emad',
      role: language === 'ar' ? 'معيدة #7 (مراقبة معامل حاسب)' : 'TA #7 (Lab Proctor)',
      email: 'nouran.emad@deltauniv.edu.eg',
      password: 'TAPass123!',
      badge: language === 'ar' ? 'معيدة' : 'TA',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      icon: UserCheck,
    },
  ];

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    const targetEmail = (loginEmail || email).trim();
    const targetPass = loginPassword || password;

    if (!targetEmail || !targetPass) {
      setError(language === 'ar' ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور' : 'Please enter email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.auth.login(targetEmail, targetPass);
      localStorage.setItem('access_token', res.access_token);
      toast.success(
        language === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Authentication Successful',
        language === 'ar' ? `مرحباً بك: ${res.user.full_name}` : `Welcome back, ${res.user.full_name}`
      );
      onLoginSuccess(res.user);
    } catch (err: any) {
      const msg = err.message || (language === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid email or password');
      setError(msg);
      toast.error(language === 'ar' ? 'فشل تسجيل الدخول' : 'Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPersona = (p: typeof quickPersonas[0]) => {
    setEmail(p.email);
    setPassword(p.password);
    handleLogin(p.email, p.password);
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Bar Language Switcher */}
      <div className="absolute top-6 right-6 left-6 flex justify-between items-center max-w-5xl mx-auto w-full">
        <div className="flex items-center space-x-2 space-x-reverse">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <CalendarCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white hidden sm:inline">
            {language === 'ar' ? 'جامعة الدلتا للعلوم والتكنولوجيا' : 'Delta University for Science & Technology'}
          </span>
        </div>

        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition shadow-sm"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-12 mb-8">
        {/* Left / Main Login Form */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {language === 'ar' ? 'النسخة الأكاديمية 2026' : 'Academic Release 2026'}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">
                Google OR-Tools CP-SAT
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              {language === 'ar' ? 'منظومة جداول مراقبات الامتحانات' : 'Faculty Exam Invigilation Platform'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'ar'
                ? 'كلية الذكاء الاصطناعي — نظام توزيع ومتابعة لجان الامتحانات والمراقبات'
                : 'Faculty of Artificial Intelligence — Automated Proctoring & Exam Allocation System'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 space-x-reverse text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {language === 'ar' ? 'البريد الإلكتروني الجامعي' : 'Faculty University Email'}
              </label>
              <div className="relative">
                <Mail className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={language === 'ar' ? 'name@faculty.edu أو name@deltauniv.edu.eg' : 'user@faculty.edu'}
                  required
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition ${
                    isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {language === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className={`w-4 h-4 text-slate-500 absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className={`w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition ${
                    isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
                  }`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>{language === 'ar' ? 'جاري التحقق والاعتماد...' : 'Authenticating...'}</span>
                </>
              ) : (
                <>
                  <span>{language === 'ar' ? 'تسجيل الدخول للمنظومة' : 'Sign In to Portal'}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              {language === 'ar' ? 'طبقة تشفير وحماية Bcrypt + SlowAPI' : 'Bcrypt + SlowAPI Hardened'}
            </span>
            <span className="font-mono text-[10px]">v2.6 Enterprise</span>
          </div>
        </div>

        {/* Right / Demo Persona Presets */}
        <div className="lg:col-span-5 space-y-3">
          <div className="px-1">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === 'ar' ? 'الحسابات المعتمدة (تسجيل فوري)' : 'Verified Roles (One-Click Sign In)'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'ar'
                ? 'اختر أي حساب للمعاينة واستعراض صلاحيات الدور المخصص'
                : 'Select an authorized faculty persona for instant role evaluation'}
            </p>
          </div>

          <div className="space-y-2">
            {quickPersonas.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.email}
                  onClick={() => handleSelectPersona(p)}
                  disabled={loading}
                  className="w-full text-start p-3 rounded-2xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-cyan-500/40 transition group flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 group-hover:bg-cyan-500/10 border border-slate-700/60 group-hover:border-cyan-500/30 flex items-center justify-center shrink-0 transition">
                      <Icon className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-2">
                        <span>{p.title}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full border font-bold ${p.badgeColor}`}>
                          {p.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{p.role}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-600 group-hover:text-cyan-400 transition">
                    {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
