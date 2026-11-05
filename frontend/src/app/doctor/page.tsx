'use client';

import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { Navbar } from '../../components/Navbar';
import { ProfessorDashboard } from '../../components/ProfessorDashboard';

export default function DoctorPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    initDoctor();
  }, []);

  const initDoctor = async () => {
    setLoading(true);
    try {
      const me = await api.auth.getMe();
      setCurrentUser(me);
    } catch {
      // Fallback to doctor account if not logged in
      try {
        const authRes = await api.auth.switchDemoUser('doctor@faculty.edu');
        localStorage.setItem('access_token', authRes.access_token);
        const me = await api.auth.getMe();
        setCurrentUser(me);
      } catch (err) {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async (email: string) => {
    setLoading(true);
    try {
      const authRes = await api.auth.switchDemoUser(email);
      localStorage.setItem('access_token', authRes.access_token);
      const me = await api.auth.getMe();
      setCurrentUser(me);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSwitchUser}
        onRefresh={() => {}}
        isGenerating={false}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser && <ProfessorDashboard currentUser={currentUser} />}
      </main>
    </div>
  );
}
