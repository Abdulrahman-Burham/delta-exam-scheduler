'use client';

import React, { useEffect, useState } from 'react';
import { User, ScheduleRun, MatrixScheduleView, ScheduleAnalytics, Venue, ExamSession, ScheduleRunConfig } from '../../types';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { AdminDashboard } from '../../components/AdminDashboard';
import { AlertCircle } from 'lucide-react';

export default function AdminPage() {
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
    initAdmin();
  }, []);

  const initAdmin = async () => {
    setLoading(true);
    setError(null);
    try {
      let me: User;
      try {
        me = await api.auth.getMe();
      } catch {
        const authRes = await api.auth.switchDemoUser('admin@faculty.edu');
        localStorage.setItem('access_token', authRes.access_token);
        me = await api.auth.getMe();
      }
      setCurrentUser(me);
      await refreshAllData();
    } catch (err: any) {
      console.error('Failed to init Admin:', err);
      setError(err.message || 'Error connecting to backend');
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
    } catch (err: any) {
      alert(`Switch failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSchedule = async (config: ScheduleRunConfig) => {
    setIsGenerating(true);
    try {
      const newRun = await api.schedules.generate(config);
      setScheduleRun(newRun);
      await refreshAllData();
    } catch (err: any) {
      alert(`Generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onRefresh={refreshAllData}
        isGenerating={isGenerating}
      />

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4 w-full">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center space-x-3 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 font-semibold">{error}</div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </main>
    </div>
  );
}
