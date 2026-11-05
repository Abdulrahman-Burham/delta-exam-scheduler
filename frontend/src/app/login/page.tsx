'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Building2,
  Sparkles,
  UserCheck,
  ArrowRight,
  Languages,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../services/api';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'البريد الإلكتروني مطلوب' })
    .email({ message: 'صيغة البريد الإلكتروني غير صالحة' })
    .transform((val) => val.trim().toLowerCase()),
  password: z
    .string()
    .min(6, { message: 'كلمة المرور يجب ألا تقل عن 6 أحرف' })
    .max(128, { message: 'كلمة المرور طويلة جداً' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');

  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [serverError, setServerError] = useState<string | null>(null);
  const [successRole, setSuccessRole] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const res = await api.auth.login(data.email, data.password);
      const user = res.user;

      // Fallback token storage for local legacy requests
      if (res.access_token) {
        localStorage.setItem('access_token', res.access_token);
      }

      setSuccessRole(user.role);

      // Automated role-based routing
      setTimeout(() => {
        if (redirectPath && !redirectPath.includes('login') && !redirectPath.includes('unauthorized')) {
          router.push(redirectPath);
          return;
        }

        const roleUpper = String(user.role).toUpperCase();
        if (roleUpper === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (roleUpper === 'DOCTOR' || roleUpper === 'PROFESSOR') {
          router.push('/doctor/dashboard');
        } else {
          router.push('/ta/dashboard');
        }
      }, 400);
    } catch (err: any) {
      // Neutral OWASP error message to prevent user enumeration
      setServerError(
        lang === 'ar'
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : 'Invalid email or password'
      );
    }
  };

  const handleFillDemo = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setServerError(null);
  };

  const isRtl = lang === 'ar';

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-white"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))] pointer-events-none" />

      {/* Language Toggle Bar */}
      <div className="w-full max-w-md flex justify-between items-center mb-4 z-10">
        <div className="flex items-center space-x-2 space-x-reverse text-xs text-slate-400">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span>{lang === 'ar' ? 'جامعة الدلتا للعلوم والتكنولوجيا' : 'Delta University for Science & Technology'}</span>
        </div>
        <button
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
          className="flex items-center space-x-1.5 space-x-reverse text-xs bg-slate-900 hover:bg-slate-800 border border-slate-800 px-2.5 py-1 rounded-xl text-slate-300 transition-colors"
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden">
        {/* Accent top stripe */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {lang === 'ar' ? 'بوابة تسجيل الدخول الأكاديمية' : 'Faculty Access Portal'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'ar'
              ? 'كلية الذكاء الاصطناعي — نظام إدارة وجدولة المراقبات'
              : 'Faculty of AI — Exam Invigilation Management System'}
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 space-x-reverse text-rose-300 text-xs animate-shake">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <div className="flex-1 font-medium">{serverError}</div>
          </div>
        )}

        {/* Success Alert */}
        {successRole && (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 space-x-reverse text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            <div className="flex-1 font-medium">
              {lang === 'ar'
                ? `تم التحقق بنجاح! جاري التوجيه إلى لوحة ${successRole}...`
                : `Verified! Redirecting to ${successRole} dashboard...`}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {lang === 'ar' ? 'البريد الجامعي / الأكاديمي' : 'Faculty Email Address'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                dir="ltr"
                placeholder="name@faculty.edu"
                disabled={isSubmitting}
                {...register('email')}
                className={`w-full bg-slate-950/70 border ${
                  errors.email ? 'border-rose-500/60 focus:border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                } rounded-xl ps-10 pe-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                dir="ltr"
                placeholder="••••••••••••"
                disabled={isSubmitting}
                {...register('password')}
                className={`w-full bg-slate-950/70 border ${
                  errors.password ? 'border-rose-500/60 focus:border-rose-500' : 'border-slate-800 focus:border-cyan-500'
                } rounded-xl ps-10 pe-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50`}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !!successRole}
            className="w-full mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-600/25 flex items-center justify-center space-x-2 space-x-reverse transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'ar' ? 'جاري التحقق والمصادقة...' : 'Authenticating...'}</span>
              </>
            ) : (
              <>
                <span>{lang === 'ar' ? 'تسجيل الدخول الآمن' : 'Sign In Securely'}</span>
                <ArrowRight className="w-4 h-4 rotate-180 rtl:rotate-0" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Account Selector */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {lang === 'ar' ? 'حسابات التجربة السريعة (Demo Roles):' : 'Quick Test Accounts:'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Admin */}
            <button
              type="button"
              onClick={() => handleFillDemo('admin@faculty.edu', 'AdminPass123!')}
              className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-cyan-500/50 text-center transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-cyan-400 group-hover:text-cyan-300">
                {lang === 'ar' ? 'أدمن (د/ طارق)' : 'Admin (Dr. Tarek)'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">AdminPass123!</div>
            </button>

            {/* Doctor */}
            <button
              type="button"
              onClick={() => handleFillDemo('doctor@faculty.edu', 'DoctorPass123!')}
              className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-blue-500/50 text-center transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300">
                {lang === 'ar' ? 'دكتور (عضو تدريس)' : 'Doctor (Faculty)'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">DoctorPass123!</div>
            </button>

            {/* TA */}
            <button
              type="button"
              onClick={() => handleFillDemo('ta@faculty.edu', 'TAPass123!')}
              className="p-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 hover:border-emerald-500/50 text-center transition-colors group cursor-pointer"
            >
              <div className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">
                {lang === 'ar' ? 'معيد (مراقب)' : 'TA (Invigilator)'}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">TAPass123!</div>
            </button>
          </div>
        </div>
      </div>

      {/* Security Footer Note */}
      <div className="mt-6 text-center text-[11px] text-slate-500 max-w-sm">
        <span>{lang === 'ar' ? 'محمي ببروتوكولات التشفير القياسية (OWASP Top 10) • HttpOnly Cookies • bcrypt' : 'Hardened with OWASP Top 10 • HttpOnly Cookies • bcrypt rounds=12'}</span>
      </div>
    </div>
  );
}
