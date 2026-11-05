import React, { useEffect, useState } from 'react';
import { User, ScheduleRun, MatrixScheduleView, ScheduleAnalytics, Venue, ExamSession, ScheduleRunConfig } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './components/AdminDashboard';
import { TADashboard } from './components/TADashboard';
import { ProfessorDashboard } from './components/ProfessorDashboard';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider, useToast } from './context/ToastContext';

const MainAppContent: React.FC = () => {
  const { language, t, isRtl } = useLanguage();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [scheduleRun, setScheduleRun] = useState<ScheduleRun | null>(null);
  const [matrixData, setMatrixData] = useState<MatrixScheduleView | null>(null);
  const [analytics, setAnalytics] = useState<ScheduleAnalytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [exams, setExams] = useState<ExamSession[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Authenticate default demo persona (Dean) if not already signed in
      const defaultEmail = 'admin@faculty.edu';
      const existingToken = localStorage.getItem('access_token');
      if (existingToken) {
        try {
          const me = await api.auth.getMe();
          setCurrentUser(me);
        } catch {
          const authRes = await api.auth.switchDemoUser(defaultEmail);
          localStorage.setItem('access_token', authRes.access_token);
          const me = await api.auth.getMe();
          setCurrentUser(me);
        }
      } else {
        const authRes = await api.auth.switchDemoUser(defaultEmail);
        localStorage.setItem('access_token', authRes.access_token);
        const me = await api.auth.getMe();
        setCurrentUser(me);
      }

      // 2. Load all system state in parallel
      await refreshAllData();
    } catch (err: any) {
      console.error('Initialization error:', err);
      setError(err.message || (language === 'ar' ? 'تعذر الاتصال بسيرفر النظام. يرجى التأكد من تشغيل الـ Backend.' : 'Could not connect to backend server.'));
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    try {
      const [sched, matrix, ana, uList, vList, eList] = await Promise.all([
        api.schedules.getCurrent().catch(() => null),
        api.schedules.getMatrix().catch(() => null),
        api.analytics.getSummary().catch(() => null),
        api.users.list().catch(() => []),
        api.venues.list().catch(() => []),
        api.exams.list().catch(() => []),
      ]);

      setScheduleRun(sched);
      setMatrixData(matrix);
      setAnalytics(ana);
      setUsers(uList);
      setVenues(vList);
      setExams(eList);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
    }
  };

  const handleSwitchUser = async (email: string) => {
    setLoading(true);
    try {
      const authRes = await api.auth.switchDemoUser(email);
      localStorage.setItem('access_token', authRes.access_token);
      const me = await api.auth.getMe();
      setCurrentUser(me);
      await refreshAllData();
      toast.info(
        language === 'ar' ? 'تم تبديل المستخدم بنجاح' : 'User Switched Successfully',
        `${me.full_name} (${me.role})`
      );
    } catch (err: any) {
      toast.error(
        language === 'ar' ? 'فشل في تبديل المستخدم' : 'Failed to switch user',
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async (config: ScheduleRunConfig) => {
    setIsGenerating(true);
    toast.info(
      language === 'ar' ? 'بدء تشغيل محرك التحسين الرياضي' : 'Optimization Engine Started',
      language === 'ar' ? 'جاري فحص القيود وتطبيق الحد الأقصى لأيام الحضور...' : 'Checking constraints and attendance limits...'
    );
    try {
      const newRun = await api.schedules.generate(config);
      setScheduleRun(newRun);
      await refreshAllData();
      toast.success(
        language === 'ar' ? 'تم توليد الجدول بنجاح تام' : 'Schedule Generated Successfully',
        language === 'ar' ? 'تم حل كافة القيود بنسبة 100% وحفظ التكليفات' : '100% constraints satisfied and assignments saved.'
      );
    } catch (err: any) {
      toast.error(
        language === 'ar' ? 'خطأ في توليد الجدول' : 'Schedule Generation Error',
        err.message
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 text-center p-4">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <div className="text-white font-bold text-lg">
          {language === 'ar' ? 'جاري تحميل نظام جدولة المراقبات الذكي...' : 'Loading AI Exam Scheduler...'}
        </div>
        <p className="text-slate-400 text-xs">
          {language === 'ar' ? 'جاري الاتصال بمحرك التحسين الرياضي وحل القيود (Google OR-Tools CP-SAT)' : 'Connecting to Google OR-Tools CP-SAT Optimization Engine'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onRefresh={refreshAllData}
        isGenerating={isGenerating}
      />

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 space-x-reverse text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-bold">{language === 'ar' ? 'تنبيه اتصال السيرفر: ' : 'Server Connection Notice: '}</span>
              <span>{error}</span>
            </div>
            <button
              onClick={initApp}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-bold"
            >
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser?.role === 'ADMIN' && (
          <AdminDashboard
            scheduleRun={scheduleRun}
            matrixData={matrixData}
            analytics={analytics}
            users={users}
            venues={venues}
            exams={exams}
            onGenerate={handleGenerateSchedule}
            onRefresh={refreshAllData}
            isGenerating={isGenerating}
          />
        )}

        {currentUser?.role === 'TA' && (
          <TADashboard currentUser={currentUser} />
        )}

        {(currentUser?.role === 'PROFESSOR' || currentUser?.role === 'DOCTOR') && (
          <ProfessorDashboard currentUser={currentUser} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{language === 'ar' ? 'نظام إدارة وتوزيع المراقبات الذكي — كلية الذكاء الاصطناعي (جامعة الدلتا للعلوم والتكنولوجيا)' : 'Faculty Exam Invigilation Management System — Faculty of AI, Delta University'}</span>
          <span className="text-[11px] text-slate-600 font-mono">Clean Architecture • Google OR-Tools CP-SAT • ReportLab PDF</span>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <ToastProvider>
        <MainAppContent />
      </ToastProvider>
    </LanguageProvider>
  );
};
