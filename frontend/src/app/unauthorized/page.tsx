'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogOut, Home, Lock } from 'lucide-react';
import { api } from '../../services/api';

export default function UnauthorizedPage() {
  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white text-center"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Accent top stripe */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-4 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">
          غير مصرح بالوصول (403 Forbidden)
        </h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          عذراً، حسابك الحالي لا يمتلك الصلاحيات الإدارية الكافية لفتح هذه الصفحة. تم تطبيق نظام عزل الصلاحيات المشدد (RBAC) لحماية بيانات لجان الامتحانات.
        </p>

        <div className="space-y-2.5">
          <Link
            href="/login"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 space-x-reverse text-xs transition-colors"
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>العودة لصفحة تسجيل الدخول</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 space-x-reverse text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج والتبديل لحساب آخر</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
          Strict Role-Based Access Control • Delta University Faculty of AI
        </div>
      </div>
    </div>
  );
}
