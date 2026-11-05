import React, { useState } from 'react';
import { User } from '../types';
import {
  CalendarCheck,
  UserCheck,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  ChevronDown,
  RefreshCw,
  Languages
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface NavbarProps {
  currentUser: User | null;
  onSwitchUser: (email: string) => Promise<void>;
  onRefresh: () => void;
  isGenerating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  onRefresh,
  isGenerating,
}) => {
  const { language, toggleLanguage, t, isRtl } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const demoPersonas = [
    { email: 'admin@faculty.edu', name: language === 'ar' ? 'أ.م.د/ هناء سالم' : 'Dr. Hanaa Salem', role: language === 'ar' ? 'عميد الكلية (رئيس لجنة الامتحانات)' : 'Dean of Faculty (Committee Chair)', icon: ShieldAlert, badge: t('roleAdminBadge') },
    { email: 'tarek.hassan@deltauniv.edu.eg', name: language === 'ar' ? 'أ.م.د/ طارق حسن' : 'Dr. Tarek Hassan', role: language === 'ar' ? 'وكيل الكلية لشؤون التعليم والطلاب' : 'Vice Dean for Student Affairs', icon: GraduationCap, badge: language === 'ar' ? 'وكيل الكلية' : 'Vice Dean' },
    { email: 'noha.elattar@deltauniv.edu.eg', name: language === 'ar' ? 'أ.م.د/ نهى العطار' : 'Dr. Noha El-Attar', role: language === 'ar' ? 'أستاذ مساعد / إشراف عام' : 'Assoc. Prof. / General Supervisor', icon: GraduationCap, badge: t('roleProfBadge') },
    { email: 'sayed.haggag@deltauniv.edu.eg', name: language === 'ar' ? 'د/ السيد حجاج' : 'Dr. El-Sayed Haggag', role: language === 'ar' ? 'مدرس دكتور / رئيس لجان' : 'Lecturer / Committee Lead', icon: GraduationCap, badge: t('roleProfBadge') },
    { email: 'ahmed.fekry@deltauniv.edu.eg', name: language === 'ar' ? 'م/ أحمد فكري باغه' : 'Eng. Ahmed Fekry', role: language === 'ar' ? 'مساعد باحث / معيد #1' : 'Research Assistant / TA #1', icon: UserCheck, badge: t('roleTABadge') },
    { email: 'nouran.emad@deltauniv.edu.eg', name: language === 'ar' ? 'م/ نوران عماد النمر' : 'Eng. Nouran Emad', role: language === 'ar' ? 'معيدة #7 / مراقبة معامل' : 'TA #7 / Computer Lab Proctor', icon: UserCheck, badge: t('roleTABadge') },
    { email: 'shady.emad@deltauniv.edu.eg', name: language === 'ar' ? 'م/ شادي عماد أبوريه' : 'Eng. Shady Emad', role: language === 'ar' ? 'معيد #17 / مراقبة قاعات' : 'TA #17 / Exam Hall Proctor', icon: UserCheck, badge: t('roleTABadge') },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN': return t('roleAdmin');
      case 'PROFESSOR':
      case 'DOCTOR': return t('roleProf');
      case 'TA': return t('roleTA');
      default: return role || '';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <span className="font-extrabold text-lg text-white tracking-tight">{t('brandTitle')}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {t('brandTag')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">{t('brandSubtitle')}</p>
          </div>
        </div>

        {/* Right Action & Persona Switcher */}
        <div className="flex items-center space-x-3 space-x-reverse">
          {/* Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            title={language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 border border-slate-700 text-xs font-bold text-slate-200 transition shadow-sm"
          >
            <Languages className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'ar' ? 'English' : 'العربية'}</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isGenerating}
            title={t('refreshTooltip')}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* Quick Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center space-x-3 space-x-reverse bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 px-3.5 py-1.5 rounded-xl transition shadow-sm ${isRtl ? 'text-right' : 'text-left'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-semibold text-xs">
                {currentUser?.role === 'ADMIN' ? '👑' : (currentUser?.role === 'PROFESSOR' || currentUser?.role === 'DOCTOR') ? '👨‍🏫' : '🎓'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                  {currentUser?.full_name || t('selectUser')}
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    currentUser?.role === 'ADMIN'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : (currentUser?.role === 'PROFESSOR' || currentUser?.role === 'DOCTOR')
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {getRoleBadge(currentUser?.role)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">{currentUser?.department || (language === 'ar' ? 'كلية الذكاء الاصطناعي' : 'Faculty of AI')}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className={`absolute ${isRtl ? 'left-0 text-right' : 'right-0 text-left'} mt-2 w-84 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50`}>
                  <div className="px-3.5 py-2 border-b border-slate-800">
                    <span className="text-[11px] tracking-wider text-slate-400 font-bold">
                      {t('switchUser')}
                    </span>
                  </div>
                  <div className="py-1 max-h-80 overflow-y-auto">
                    {demoPersonas.map((persona) => {
                      const Icon = persona.icon;
                      const isSelected = currentUser?.email === persona.email;
                      return (
                        <button
                          key={persona.email}
                          onClick={() => {
                            onSwitchUser(persona.email);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-3.5 py-2.5 flex items-start space-x-3 space-x-reverse ${isRtl ? 'text-right' : 'text-left'} hover:bg-slate-800/80 transition-colors ${
                            isSelected ? 'bg-cyan-950/40 border-r-2 border-cyan-400' : ''
                          }`}
                        >
                          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-white flex items-center justify-between">
                              <span className="truncate">{persona.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                                {persona.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{persona.role}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
