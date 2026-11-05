'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  ShieldAlert,
  GraduationCap,
  UserCheck,
  Sparkles,
  ArrowLeft,
  Database,
  Cpu,
  Layers,
  Award
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 max-w-6xl mx-auto w-full text-right" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between pb-8 border-b border-slate-800">
        <div className="flex items-center space-x-3.5 space-x-reverse">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <CalendarCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-extrabold text-xl text-white tracking-tight">نظام جدولة المراقبات الذكي</span>
              <Badge variant="default" className="gap-1">
                <Sparkles className="w-3 h-3" /> جامعة الدلتا
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">كلية الذكاء الاصطناعي — Delta University for Science & Technology</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 space-x-reverse text-xs text-slate-400 font-mono">
          <span>امتحانات منتصف الفصل الدراسي خريف 2026-2027</span>
          <span>•</span>
          <span className="text-emerald-400 font-bold">471 فترة بالقاعات والمعامل</span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="my-10 text-center space-y-4 max-w-3xl mx-auto">
        <Badge variant="outline" className="px-3 py-1 text-xs border-cyan-500/40 text-cyan-300">
          محرك حل القيود الذكي Google OR-Tools CP-SAT
        </Badge>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          النظام الآلي لإدارة وتوزيع <br className="hidden sm:inline" />
          <span className="bg-gradient-to-l from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            المراقبات ولجان الامتحانات الجامعية
          </span>
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          نظام ذكاء اصطناعي على مستوى الكلية لجدولة وتوزيع أطقم المراقبة والإشراف بدقة رياضية متناهية تضمن انعدام التضارب بنسبة 100% وتحقق أقصى درجات العدالة في توزيع الفترات وساعات العمل عبر 33 قاعة ومعمل حاسب.
        </p>
      </div>

      {/* Role Selection Portals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
        {/* Admin Card */}
        <Card className="hover:border-cyan-500/50 transition-all duration-300 hover:shadow-cyan-500/10 flex flex-col justify-between">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle>بوابة القيادة وإدارة الامتحانات</CardTitle>
            <CardDescription>
              عميد الكلية أ.م.د/ هناء سالم • وكيل الكلية أ.م.د/ طارق حسن
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              تحكم كامل في أوزان خوارزمية التحسين، توليد الجداول اللحظي، التعديل اليدوي المقفل، فحص مصفوفة القاعات، وتصدير جداول الماستر الرسمية PDF.
            </p>
            <Link href="/admin" className="block w-full">
              <Button variant="gradient" className="w-full gap-2">
                <span>الدخول لمركز قيادة الكنترول</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Professor Card */}
        <Card className="hover:border-blue-500/50 transition-all duration-300 hover:shadow-blue-500/10 flex flex-col justify-between">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
              <GraduationCap className="w-6 h-6" />
            </div>
            <CardTitle>بوابة أعضاء هيئة التدريس</CardTitle>
            <CardDescription>
              رؤساء لجان الامتحانات، أساتذة المقررات، ومنسقو الأقسام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              متابعة لجان الإشراف المسندة، استعراض أطقم المراقبين المعاونين داخل كل قاعة ومعمل، وتحميل إخطار الإشراف الرسمي وطباعته.
            </p>
            <Link href="/professor" className="block w-full">
              <Button variant="outline" className="w-full gap-2 hover:border-blue-500 hover:text-blue-300">
                <span>الدخول لبوابة أستاذ المقرر</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* TA Card */}
        <Card className="hover:border-emerald-500/50 transition-all duration-300 hover:shadow-emerald-500/10 flex flex-col justify-between">
          <CardHeader>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <UserCheck className="w-6 h-6" />
            </div>
            <CardTitle>بوابة الهيئة المعاونة (معيدون)</CardTitle>
            <CardDescription>
              السادة مراقبو القاعات والمعامل (أعضاء الهيئة المعاونة)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              جدول شخصي مخصص يوضح المواعيد بدقة، القاعة والمعمل، الأستاذ المشرف، مع إمكانية تحميل الإخطار بصيغة PDF ومزامنة التقويم بنقرة واحدة.
            </p>
            <Link href="/ta" className="block w-full">
              <Button variant="outline" className="w-full gap-2 hover:border-emerald-500 hover:text-emerald-300">
                <span>الدخول لجدول مراقبات المعيد</span>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <footer className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center space-x-4 space-x-reverse">
          <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-cyan-400" /> Google OR-Tools CP-SAT</span>
          <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-blue-400" /> PostgreSQL & SQLAlchemy</span>
          <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-purple-400" /> Next.js & Tailwind CSS</span>
        </div>
        <div>
          جامعة الدلتا للعلوم والتكنولوجيا — كلية الذكاء الاصطناعي © 2026-2027
        </div>
      </footer>
    </div>
  );
}
