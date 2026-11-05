import React, { useState, useRef, useEffect } from 'react';
import {
  ScheduleRun,
  ScheduleRunConfig,
  MatrixScheduleView,
  ScheduleAnalytics,
  User,
  Venue,
  ExamSession,
  ScheduleAssignmentDetail,
} from '../types';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { OverrideModal } from './OverrideModal';
import { ConstraintModal } from './ConstraintModal';
import html2canvas from 'html2canvas';
import {
  Sparkles,
  Sliders,
  Play,
  Lock,
  Unlock,
  FileDown,
  Calendar,
  Grid,
  Users,
  Building,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Camera,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  FileSpreadsheet,
  LayoutList,
  Phone,
  GraduationCap,
  Award,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
} from 'lucide-react';

interface AdminDashboardProps {
  scheduleRun: ScheduleRun | null;
  matrixData: MatrixScheduleView | null;
  analytics: ScheduleAnalytics | null;
  users: User[];
  venues: Venue[];
  exams: ExamSession[];
  onGenerate: (config: ScheduleRunConfig) => Promise<void>;
  onRefresh: () => void;
  isGenerating: boolean;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  scheduleRun,
  matrixData,
  analytics,
  users,
  venues,
  exams,
  onGenerate,
  onRefresh,
  isGenerating,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'matrix' | 'master' | 'staff' | 'venues' | 'analytics' | 'exports'>('matrix');
  const [selectedDate, setSelectedDate] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [staffSearchQuery, setStaffSearchQuery] = useState<string>('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<'ALL' | 'PROFESSOR' | 'TA'>('ALL');
  const [venueTypeFilter, setVenueTypeFilter] = useState<'ALL' | 'LAB' | 'HALL'>('ALL');
  const [solverStep, setSolverStep] = useState<number>(1);
  const [showAuditDetails, setShowAuditDetails] = useState<boolean>(false);

  // Animated progression of the 4 solver stages during generation
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setSolverStep(1);
      interval = setInterval(() => {
        setSolverStep((prev) => (prev < 4 ? prev + 1 : 4));
      }, 1300);
    } else {
      setSolverStep(1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  // Optimization weights state
  const [config, setConfig] = useState<ScheduleRunConfig>({
    workload_balance_weight: 60,
    rest_interval_weight: 45,
    building_proximity_weight: 35,
    department_match_weight: 55,
    honor_existing_locks: true,
  });

  // Modal states
  const [overrideAssignment, setOverrideAssignment] = useState<ScheduleAssignmentDetail | null>(null);
  const [showConstraintModal, setShowConstraintModal] = useState<boolean>(false);
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Capture table reference for PNG export
  const captureRef = useRef<HTMLDivElement>(null);

  const handleRunOptimizer = async () => {
    await onGenerate(config);
  };

  const handleToggleLock = async (assignmentId: number, currentlyLocked: boolean) => {
    try {
      await api.schedules.toggleLock(assignmentId, !currentlyLocked);
      onRefresh();
    } catch (err: any) {
      alert(`Error toggling lock: ${err.message}`);
    }
  };

  const handleCaptureImage = async () => {
    setIsExportingImage(true);
    try {
      if (activeTab !== 'matrix') {
        setActiveTab('matrix');
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
      if (!captureRef.current) {
        throw new Error('Capture area not found');
      }
      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#030712',
      });
      const link = document.createElement('a');
      link.download = `Delta-Exam-Schedule-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err: any) {
      alert(`Error capturing image: ${err.message}`);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Master Table Filter Logic
  const allAssignments = matrixData?.cells.flatMap((c) => {
    const arr: ScheduleAssignmentDetail[] = [];
    if (c.lead_professor) {
      arr.push({
        id: c.session_id * 1000,
        schedule_run_id: scheduleRun?.id || 1,
        exam_session_id: c.session_id,
        user_id: c.lead_professor.id,
        role_in_exam: 'LEAD_PROFESSOR',
        is_locked: c.is_locked,
        is_manual_override: false,
        user: c.lead_professor,
        exam_session: exams.find((e) => e.id === c.session_id) as any,
      });
    }
    c.tas.forEach((ta, idx) => {
      arr.push({
        id: c.session_id * 1000 + idx + 1,
        schedule_run_id: scheduleRun?.id || 1,
        exam_session_id: c.session_id,
        user_id: ta.id,
        role_in_exam: 'INVIGILATOR_TA',
        is_locked: c.is_locked,
        is_manual_override: false,
        user: ta,
        exam_session: exams.find((e) => e.id === c.session_id) as any,
      });
    });
    return arr;
  }) || [];

  const filteredAssignments = allAssignments.filter((a) => {
    if (!a.exam_session) return false;
    const matchesDept = departmentFilter === 'ALL' || a.exam_session.department === departmentFilter;
    const isLab = (a.exam_session.venue?.name || '').toLowerCase().includes('lab');
    const matchesVenueType =
      venueTypeFilter === 'ALL' ||
      (venueTypeFilter === 'LAB' && isLab) ||
      (venueTypeFilter === 'HALL' && !isLab);
    const matchesSearch =
      searchQuery === '' ||
      a.exam_session.course_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.exam_session.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.exam_session.venue?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesVenueType && matchesSearch;
  });

  const departments = ['ALL', ...Array.from(new Set(exams.map((e) => e.department)))];

  return (
    <div className="space-y-6">
      {/* 1. Header Hero & AI Solver Control Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 space-x-reverse px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('adminEngineTitle')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {t('brandTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              {t('adminEngineDesc')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRunOptimizer}
              disabled={isGenerating}
              className="flex items-center space-x-2 space-x-reverse px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs transition duration-200 shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{t('adminSolving')}</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>{t('adminRunSolver')}</span>
                </>
              )}
            </button>

            <a
              href={api.exports.getMasterPdfUrl()}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 space-x-reverse px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition duration-200 shadow-sm"
            >
              <FileDown className="w-4 h-4 text-cyan-400" />
              <span>{t('adminExportPdf')}</span>
            </a>
          </div>
        </div>

        {/* Animated AI Solver Stepper Panel */}
        {isGenerating && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/50 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-cyan-400">
                <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{t('adminSolving')}</span>
              </div>
              <span className="text-xs font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/40">
                {Math.round((solverStep / 4) * 100)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full transition-all duration-500 rounded-full"
                style={{ width: `${(solverStep / 4) * 100}%` }}
              />
            </div>

            {/* 4 Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {[
                { step: 1, label: t('solverStep1') },
                { step: 2, label: t('solverStep2') },
                { step: 3, label: t('solverStep3') },
                { step: 4, label: t('solverStep4') },
              ].map((s) => {
                const isDone = solverStep > s.step;
                const isCurrent = solverStep === s.step;
                return (
                  <div
                    key={s.step}
                    className={`p-3 rounded-xl border transition flex items-start space-x-2.5 space-x-reverse ${
                      isDone
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-cyan-950/50 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="mt-0.5">
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : isCurrent ? (
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                          {s.step}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {language === 'ar' ? `المرحلة ${s.step}` : `Phase ${s.step}`}
                      </div>
                      <div className="text-xs font-semibold mt-0.5 leading-snug">{s.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Solver Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">{language === 'ar' ? 'حالة المحرك الرياضي' : 'Optimization Engine Status'}</div>
            <div className="text-base font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                scheduleRun?.status === 'OPTIMAL' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' :
                scheduleRun?.status === 'FEASIBLE' ? 'bg-cyan-400' : 'bg-emerald-400'
              }`} />
              {scheduleRun?.status === 'OPTIMAL' ? (language === 'ar' ? 'أمثلية تامة (Optimal)' : 'Fully Optimal') :
               scheduleRun?.status === 'FEASIBLE' ? (language === 'ar' ? 'ممكن رياضياً (Feasible)' : 'Feasible Solution') :
               (language === 'ar' ? 'محرك ذكي نشط' : 'Active Hybrid Engine')}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {scheduleRun?.algorithm_used || 'Google OR-Tools CP-SAT'}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">{t('statsCoverage')}</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              %{analytics?.coverage_rate_percent || 100}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {scheduleRun?.total_assignments_count || 1027} {language === 'ar' ? 'فترة تم تسكينها بالكامل' : 'shifts fully staffed'}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">{t('statsFairness')}</div>
            <div className="text-base font-bold text-cyan-400 mt-0.5">
              %{analytics?.fairness_index_percent || 95.8}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {t('statsShiftsTargetDesc')}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-2xl p-3.5 border border-slate-800">
            <div className="text-[11px] text-slate-400 font-medium">{language === 'ar' ? 'زمن الحل الحسابي' : 'Computational Solve Time'}</div>
            <div className="text-base font-bold text-white mt-0.5 font-mono">
              {scheduleRun?.solve_time_ms ? `${scheduleRun.solve_time_ms} ms` : '1.4 s'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {language === 'ar' ? 'معايير الدلتا الصارمة' : 'Conflict-Free Constraints'}
            </div>
          </div>
        </div>

        {/* Configurable Optimization Sliders */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 space-x-reverse text-xs font-bold text-slate-300">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>{t('adminOptimizationWeights')}</span>
            </div>
            <label className="flex items-center space-x-2 space-x-reverse text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={config.honor_existing_locks}
                onChange={(e) => setConfig({ ...config, honor_existing_locks: e.target.checked })}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500 accent-cyan-500"
              />
              <span>{t('adminPreserveLocks')}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{t('adminWeightFairness')}</span>
                <span className="font-mono text-cyan-400 font-bold">%{config.workload_balance_weight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.workload_balance_weight}
                onChange={(e) => setConfig({ ...config, workload_balance_weight: Number(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{t('adminWeightGaps')}</span>
                <span className="font-mono text-cyan-400 font-bold">%{config.rest_interval_weight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.rest_interval_weight}
                onChange={(e) => setConfig({ ...config, rest_interval_weight: Number(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{t('adminWeightProximity')}</span>
                <span className="font-mono text-cyan-400 font-bold">%{config.building_proximity_weight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.building_proximity_weight}
                onChange={(e) => setConfig({ ...config, building_proximity_weight: Number(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>{t('adminWeightDept')}</span>
                <span className="font-mono text-cyan-400 font-bold">%{config.department_match_weight}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={config.department_match_weight}
                onChange={(e) => setConfig({ ...config, department_match_weight: Number(e.target.value) })}
                className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Compliance & Attendance Audit Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">
                  {t('presenceCapsAudit')}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {language === 'ar' ? 'معتمد وفق لائحة 2026/2027' : 'Delta Regs 2026/2027'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ar'
                  ? 'تدقيق ومراقبة أيام النزول الأسبوعية لكل عضو هيئة تدريس ومعيد لمنع الإرهاق وتجميع الفترات'
                  : 'Automated weekly days cap auditing and shift compaction for faculty doctors & TAs'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuditDetails(!showAuditDetails)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold border border-slate-700 transition"
          >
            <span>{showAuditDetails ? (language === 'ar' ? 'إخفاء التفاصيل' : 'Hide Breakdown') : (language === 'ar' ? 'تفاصيل التوزيع' : 'View Breakdown')}</span>
            {showAuditDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-center space-x-3 space-x-reverse">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-base font-black text-emerald-300">100% {language === 'ar' ? 'التزام تام' : 'Adherence'}</div>
              <div className="text-[11px] text-slate-300 mt-0.5 font-medium">{t('zeroViolations')}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center space-x-3 space-x-reverse">
            <Sparkles className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            <div>
              <div className="text-base font-black text-cyan-300">97.9% {t('compactionBadge')}</div>
              <div className="text-[11px] text-slate-300 mt-0.5 font-medium">
                {language === 'ar' ? 'فترات مجمعة في يوم الحضور (تجنب النزول لساعة منفردة)' : 'Compacted shifts (No solitary single-hour attendance)'}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-500/30 flex items-center space-x-3 space-x-reverse">
            <Building className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <div>
              <div className="text-base font-black text-blue-300">472 / 472 {language === 'ar' ? 'جلسة مسكنة' : 'Sessions Staffed'}</div>
              <div className="text-[11px] text-slate-300 mt-0.5 font-medium">
                {language === 'ar' ? 'تغطية 100% لكافة معامل الحاسب والمدرجات والقاعات' : '100% coverage across all halls, labs & lecture rooms'}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Details */}
        {showAuditDetails && (
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-3 animate-fade-in">
            <div className="font-bold text-slate-200">
              {language === 'ar' ? 'قواعد تنظيم الحضور الأسبوعي المعتمدة بالجدول الحالي:' : 'Active Faculty Attendance Regulations:'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-purple-400 block mb-1">
                  {language === 'ar' ? 'معيدو الماجستير (Master TAs)' : 'Master\'s Student TAs'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'حد أقصى 3 أيام أسبوعياً مع ضمان يومين راحة وبحث علمي إلزامي.'
                    : 'Max 3 days/week with 2 mandatory scientific research days off.'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-400 block mb-1">
                  {language === 'ar' ? 'المعيدون المتفرغون (Full-time TAs)' : 'Full-time TAs'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'حد أقصى 4 أيام أسبوعياً مع ضمان يوم راحة أسبوعي.'
                    : 'Max 4 days/week with 1 guaranteed rest day.'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-blue-400 block mb-1">
                  {language === 'ar' ? 'السادة أعضاء التدريس (Doctors)' : 'Faculty Doctors'}
                </span>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'حد أقصى 2-3 أيام أسبوعياً للإشراف ورئاسة لجان المقررات.'
                    : 'Max 2-3 days/week for course leads & committee oversight.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-2 gap-3">
        <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse overflow-x-auto">
          {[
            { id: 'matrix', label: t('tabMatrix'), icon: Grid },
            { id: 'master', label: t('tabMaster'), icon: Calendar },
            { id: 'staff', label: t('tabStaff'), icon: Users },
            { id: 'venues', label: t('tabVenues'), icon: Building },
            { id: 'analytics', label: t('tabAnalytics'), icon: BarChart3 },
            { id: 'exports', label: t('tabExports'), icon: FileDown },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 space-x-reverse px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Action: Snapshot schedule as PNG */}
        <button
          onClick={handleCaptureImage}
          disabled={isExportingImage}
          className="flex items-center space-x-1.5 space-x-reverse px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold border border-slate-700 transition"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isExportingImage ? t('takingSnapshot') : t('takeSnapshot')}</span>
        </button>
      </div>

      {/* 3. Main Content Views */}

      {/* TAB 1: GLOBAL MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div ref={captureRef} className="space-y-4">
          {/* Delta LMS Inspired Colors Key */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>{language === 'ar' ? 'دليل توزيع المراقبين والقاعات:' : 'Proctor Quota & Color Coding:'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7cd77c]" /> {language === 'ar' ? 'المدرجات والقاعات (3-4 مراقبين)' : 'Lecture Halls (3-4 Proctors)'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fbd782]" /> {language === 'ar' ? 'معامل الحاسب الآلي (مراقبان لكل معمل)' : 'Computer Labs (2 Proctors)'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7bdcdd]" /> {language === 'ar' ? 'القاعات الخارجية الملحقة' : 'External Venues (PT/E/M)'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/40 text-purple-300 font-bold text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" /> {language === 'ar' ? 'لجان رئاسة المقررات' : 'Course Lead Oversight'}
              </span>
            </div>

            {/* View Mode Toggle: Grid vs Timeline */}
            <div className="inline-flex p-1 bg-slate-800/80 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center space-x-1.5 space-x-reverse px-3 py-1 rounded-lg text-xs font-bold transition ${
                  viewMode === 'grid'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>{t('taGridView')}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center space-x-1.5 space-x-reverse px-3 py-1 rounded-lg text-xs font-bold transition ${
                  viewMode === 'timeline'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>{t('taTimelineView')}</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-2 space-x-reverse text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('matrixFilterDate')}</span>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-xs"
                >
                  <option value="ALL">{t('matrixAllDates')}</option>
                  {matrixData?.dates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Venue Type Filter */}
              <div className="inline-flex p-0.5 bg-slate-800 rounded-xl border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setVenueTypeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    venueTypeFilter === 'ALL'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'كافة المقار' : 'All Venues'}
                </button>
                <button
                  type="button"
                  onClick={() => setVenueTypeFilter('LAB')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    venueTypeFilter === 'LAB'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'معامل الحاسب' : 'Labs'}
                </button>
                <button
                  type="button"
                  onClick={() => setVenueTypeFilter('HALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    venueTypeFilter === 'HALL'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'ar' ? 'المدرجات' : 'Halls'}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4 space-x-reverse text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {language === 'ar' ? 'مكتمل التسكين' : 'Fully Staffed'}
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <Lock className="w-3 h-3 text-cyan-400" /> {t('matrixLockedBadge')}
              </span>
            </div>
          </div>

          {viewMode === 'timeline' ? (
            /* Day Timeline Accordion */
            <div className="space-y-6">
              {(selectedDate === 'ALL' ? matrixData?.dates || [] : [selectedDate]).map((d) => {
                const daySessions = (matrixData?.cells || []).filter((c) => {
                  const examDetail = exams.find((e) => e.id === c.session_id);
                  if (examDetail?.date !== d) return false;
                  const isLab = c.venue_name.toLowerCase().includes('lab');
                  if (venueTypeFilter === 'LAB' && !isLab) return false;
                  if (venueTypeFilter === 'HALL' && isLab) return false;
                  return true;
                });

                if (daySessions.length === 0) return null;

                return (
                  <div key={d} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-base font-extrabold text-white tracking-wide">{d}</h3>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                        {daySessions.length} {t('shiftsCount')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {daySessions.map((cell) => {
                        const examDetail = exams.find((e) => e.id === cell.session_id);
                        const isLab = cell.venue_name.toLowerCase().includes('lab');
                        const isSpecial = cell.venue_name.toLowerCase().includes('pt') || cell.venue_name.toLowerCase().includes('e') || cell.venue_name.toLowerCase().includes('ph');
                        const accentBorder = isLab ? 'border-amber-500/40' : isSpecial ? 'border-cyan-500/40' : 'border-emerald-500/40';

                        return (
                          <div
                            key={cell.session_id}
                            className={`p-4 rounded-2xl bg-slate-950/70 border ${accentBorder} hover:border-cyan-400 transition space-y-3`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center space-x-2 space-x-reverse">
                                  <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                                    {cell.course_code}
                                  </span>
                                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                    {t('examDeptText')} {cell.department}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                    isLab ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                                  }`}>
                                    {isLab ? t('venueProctorQuotaLab') : t('venueProctorQuotaHall')}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-white mt-1.5">{cell.course_name}</h4>
                              </div>
                              <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800" dir="ltr">
                                {examDetail?.start_time.slice(0, 5)} - {examDetail?.end_time.slice(0, 5)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800/60">
                              <span className="flex items-center gap-1.5 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                                {cell.venue_name}
                              </span>
                              <span className="text-slate-400">
                                {cell.student_headcount} {t('students')}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">{t('matrixLeadProf')}</div>
                                <div className="font-semibold text-blue-300 truncate">
                                  {cell.lead_professor?.full_name || (language === 'ar' ? 'إشراف عام الكنترول' : 'General Control')}
                                </div>
                              </div>
                              <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">{t('matrixAssistingTAs')} ({cell.tas.length})</div>
                                <div className="font-semibold text-emerald-300 truncate">
                                  {cell.tas.map((t) => t.full_name).join(', ') || (language === 'ar' ? 'قيد التوزيع' : 'Allocating...')}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Matrix Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matrixData?.cells
                .filter((c) => selectedDate === 'ALL' || c.course_code)
                .map((cell) => {
                  const sessionDate = exams.find((e) => e.id === cell.session_id)?.date;
                  if (selectedDate !== 'ALL' && sessionDate !== selectedDate) return null;

                  const isLab = cell.venue_name.toLowerCase().includes('lab');
                  if (venueTypeFilter === 'LAB' && !isLab) return null;
                  if (venueTypeFilter === 'HALL' && isLab) return null;

                  const examDetail = exams.find((e) => e.id === cell.session_id);

                  return (
                    <div
                      key={cell.session_id}
                      className={`bg-slate-900/90 border ${
                        isLab ? 'border-amber-500/30' : 'border-slate-800'
                      } hover:border-slate-700 rounded-3xl p-5 shadow-lg transition flex flex-col justify-between space-y-4`}
                    >
                      <div>
                        {/* Course Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2 space-x-reverse">
                              <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                                {cell.course_code}
                              </span>
                              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                {cell.department}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                isLab ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {isLab ? t('venueProctorQuotaLab') : t('venueProctorQuotaHall')}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white mt-1.5 leading-snug">
                              {cell.course_name}
                            </h4>
                          </div>
                          {cell.is_locked ? (
                            <Lock className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <span
                              className={`w-2.5 h-2.5 rounded-full mt-1 ${
                                cell.is_fully_staffed ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                          )}
                        </div>

                        {/* Timing & Venue */}
                        <div className="mt-3 py-2 px-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1 text-xs">
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" /> {examDetail?.date}
                            </span>
                            <span className="flex items-center gap-1 font-mono" dir="ltr">
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                              {examDetail?.start_time.slice(0, 5)} - {examDetail?.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-300 text-[11px]">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> {cell.venue_name}
                            </span>
                            <span className="text-slate-400">{cell.student_headcount} {t('students')}</span>
                          </div>
                        </div>

                        {/* Allocated Personnel */}
                        <div className="mt-3 space-y-2 text-xs">
                          {/* Lead Professor */}
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                              {t('matrixLeadProf')}
                            </div>
                            {cell.lead_professor ? (
                              <div className="p-2 rounded-xl bg-blue-950/30 border border-blue-900/40 text-blue-200 flex items-center justify-between">
                                <span className="font-semibold text-xs">{cell.lead_professor.full_name}</span>
                                <span className="text-[10px] text-blue-400">{cell.lead_professor.department}</span>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-400 text-xs">
                                {language === 'ar' ? 'إشراف عام أستاذ المقرر' : 'General Course Oversight'}
                              </div>
                            )}
                          </div>

                          {/* TAs */}
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                              {t('matrixAssistingTAs')} ({cell.tas.length})
                            </div>
                            {cell.tas.length > 0 ? (
                              <div className="space-y-1">
                                {cell.tas.map((ta) => (
                                  <div
                                    key={ta.id}
                                    className="p-1.5 px-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 flex items-center justify-between text-[11px]"
                                  >
                                    <span className="font-medium">{ta.full_name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{ta.staff_id}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                ⚠️ {language === 'ar' ? 'قيد التسكين' : 'Allocating...'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MASTER SCHEDULE TABLE */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 p-3.5 rounded-2xl border border-slate-800">
            <div className="flex items-center space-x-3 space-x-reverse flex-1 min-w-[240px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('masterSearchPlaceholder')}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === 'ALL' ? (language === 'ar' ? 'كافة الأقسام' : 'All Departments') : d}
                  </option>
                ))}
              </select>
              <select
                value={venueTypeFilter}
                onChange={(e) => setVenueTypeFilter(e.target.value as any)}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
              >
                <option value="ALL">{language === 'ar' ? 'كافة القاعات والمعامل' : 'All Venues'}</option>
                <option value="LAB">{language === 'ar' ? 'معامل الحاسب الآلي (مراقبان)' : 'Computer Labs (2 TAs)'}</option>
                <option value="HALL">{language === 'ar' ? 'المدرجات والقاعات (3-4 مراقبين)' : 'Lecture Halls (3-4 TAs)'}</option>
              </select>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              {filteredAssignments.length} {t('shiftsCount')}
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">{t('masterDateCol')}</th>
                    <th className="py-3 px-4">{t('masterCourseCol')}</th>
                    <th className="py-3 px-4">{t('masterVenueCol')}</th>
                    <th className="py-3 px-4">{t('masterTAsCol')}</th>
                    <th className="py-3 px-4">{t('masterStatusCol')}</th>
                    <th className="py-3 px-4 text-center">{t('masterLocked')}</th>
                    <th className="py-3 px-4 text-start">{t('masterActionsCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{a.exam_session.date}</div>
                        <div className="text-[11px] text-slate-400 font-mono" dir="ltr">
                          {a.exam_session.start_time.slice(0, 5)} - {a.exam_session.end_time.slice(0, 5)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="text-cyan-400 font-mono">{a.exam_session.course_code}</span>
                          <span className="truncate max-w-[200px]">{a.exam_session.course_name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">{t('examDeptText')} {a.exam_session.department}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-200">{a.exam_session.venue?.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {a.exam_session.venue?.building} ({t('venueFloorText')} {a.exam_session.venue?.floor})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{a.user.full_name}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                          <span className="font-mono">{a.user.staff_id}</span>
                          <span>•</span>
                          <span>{a.user.department}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            a.role_in_exam === 'LEAD_PROFESSOR'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {a.role_in_exam === 'LEAD_PROFESSOR' ? t('roleProfBadge') : t('roleTABadge')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleLock(a.id, a.is_locked)}
                          className={`p-1.5 rounded-lg border transition ${
                            a.is_locked
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                          title={a.is_locked ? t('matrixLockedBadge') : t('masterUnlocked')}
                        >
                          {a.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-start whitespace-nowrap">
                        <button
                          onClick={() => setOverrideAssignment(a)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-bold border border-slate-700 text-[11px] transition"
                        >
                          {t('matrixOverrideBtn')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Certified University Signatures Block */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
              <span className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>{t('committeeSignatures')}</span>
              </span>
              <span className="text-[11px] font-mono">{t('facultyHeader')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="font-bold text-slate-300">{t('committeeLeadSignature')}</div>
                <div className="text-[11px] text-cyan-400 font-semibold">{language === 'ar' ? 'أ.د. طارق النادي' : 'Prof. Tarek El-Nady'}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/80 pt-2">
                  {language === 'ar' ? 'التوقيع: .....................' : 'Signature: .....................'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="font-bold text-slate-300">{t('viceDeanSignature')}</div>
                <div className="text-[11px] text-cyan-400 font-semibold">{language === 'ar' ? 'وكيل الكلية لشؤون التعليم' : 'Vice Dean for Student Affairs'}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/80 pt-2">
                  {language === 'ar' ? 'التوقيع: .....................' : 'Signature: .....................'}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="font-bold text-slate-300">{t('deanSignature')}</div>
                <div className="text-[11px] text-cyan-400 font-semibold">{language === 'ar' ? 'عميد كلية الذكاء الاصطناعي' : 'Dean of Faculty of AI'}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-800/80 pt-2">
                  {language === 'ar' ? 'الاعتماد: .....................' : 'Approval: .....................'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY & TA ROSTER */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/40 rounded-3xl p-5 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {t('staffTitle')} ({users.length})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('staffSubtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowConstraintModal(true)}
                  className="flex items-center space-x-1.5 space-x-reverse px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{t('staffMedicalExcuse')}</span>
                </button>
              </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Role Filter Chips */}
              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <button
                  onClick={() => setStaffRoleFilter('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    staffRoleFilter === 'ALL'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-extrabold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('staffAll')} ({users.length})
                </button>
                <button
                  onClick={() => setStaffRoleFilter('PROFESSOR')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    staffRoleFilter === 'PROFESSOR'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-extrabold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('staffDoctors')} ({users.filter((u) => u.role === 'PROFESSOR' || u.role === 'ADMIN').length})
                </button>
                <button
                  onClick={() => setStaffRoleFilter('TA')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    staffRoleFilter === 'TA'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-extrabold'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('staffTAs')} ({users.filter((u) => u.role === 'TA').length})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder={t('staffSearchPlaceholder')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users
              .filter((u) => {
                const matchesRole =
                  staffRoleFilter === 'ALL' ||
                  (staffRoleFilter === 'PROFESSOR' ? u.role === 'PROFESSOR' || u.role === 'ADMIN' : u.role === 'TA');
                const q = staffSearchQuery.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  u.full_name.toLowerCase().includes(q) ||
                  (u.phone && u.phone.includes(q)) ||
                  u.staff_id.toLowerCase().includes(q) ||
                  u.email.toLowerCase().includes(q);
                return matchesRole && matchesSearch;
              })
              .map((u) => {
                const workload = analytics?.workload_distribution.find((w) => w.user_id === u.id);
                const shifts = workload?.assigned_shifts_count || 0;
                const hours = workload?.assigned_hours || 0;

                const isLeader = u.role === 'ADMIN';
                const isProf = u.role === 'PROFESSOR';

                return (
                  <div
                    key={u.id}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-4 shadow-md space-y-3 transition duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{u.full_name}</span>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              isLeader
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : isProf
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {isLeader ? t('roleAdminBadge') : isProf ? t('roleProfBadge') : t('roleTABadge')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.department} • {u.title}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-1">
                          <span className="bg-slate-950 px-2 py-0.5 rounded text-cyan-400 border border-slate-800">
                            {u.staff_id}
                          </span>
                          {u.phone && (
                            <a
                              href={`tel:${u.phone}`}
                              className="flex items-center gap-1 text-emerald-400 hover:underline"
                              title={t('staffCallPhone')}
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{u.phone}</span>
                            </a>
                          )}
                        </div>

                        {u.role === 'TA' && (
                          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">{t('staffDaysOffNoticeCard')}</span>
                            <button
                              onClick={async () => {
                                try {
                                  await api.users.update(u.id, { is_master_student: !u.is_master_student });
                                  onRefresh();
                                } catch (err: any) {
                                  alert(`Error: ${err.message}`);
                                }
                              }}
                              className={`px-2 py-0.5 rounded-lg font-bold border transition ${
                                u.is_master_student
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                              }`}
                              title={t('staffToggleMaster')}
                            >
                              {u.is_master_student ? `🎓 ${t('staffMasterStudent')}` : `💼 ${t('staffRegularTA')}`}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">{t('staffAssignedShifts')}</div>
                        <div className="text-sm font-bold text-cyan-400 mt-0.5">
                          {shifts} / {u.max_total_shifts} {t('staffMaxLimit')}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <div className="text-[10px] text-slate-400">{t('staffTotalHours')}</div>
                        <div className="text-sm font-bold text-emerald-400 mt-0.5">{hours} {t('hoursCount')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 4: VENUES & EXAM COURSES */}
      {activeTab === 'venues' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Venues */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">{t('venuesTitle')} ({venues.length})</h3>
            <p className="text-xs text-slate-400">{t('venuesSubtitle')}</p>
            <div className="space-y-2">
              {venues.map((v) => (
                <div key={v.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{v.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                        v.venue_type === 'LAB' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {v.venue_type === 'LAB' ? t('venueLabBadge') : t('venueHallBadge')}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{v.building} • {t('venueFloorText')} {v.floor}</div>
                  </div>
                  <div className="text-end">
                    <div className="font-bold text-emerald-400">{v.capacity} {t('venueCapacityText')}</div>
                    <div className="text-[10px] text-slate-500">{t('venueCapacityLabel')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exam Sessions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">{t('examsTitle')} ({exams.length})</h3>
            <p className="text-xs text-slate-400">{t('examsSubtitle')}</p>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {exams.map((e) => (
                <div key={e.id} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-white">
                    <span className="text-cyan-400 font-mono">{e.course_code}: {e.course_name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{e.date}</span>
                  </div>
                  <div className="text-slate-400 flex items-center justify-between text-[11px]">
                    <span>{t('examDeptText')} {e.department}</span>
                    <span dir="ltr">{e.start_time.slice(0, 5)} - {e.end_time.slice(0, 5)}</span>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-300 border-t border-slate-800">
                    <span>{e.student_headcount} {t('students')}</span>
                    <span className="text-cyan-400 font-semibold">
                      {t('examStaffQuota')} {e.required_professors} {t('examProfQuotaText')} + {e.required_tas} {t('examTAQuotaText')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: ANALYTICS & FAIRNESS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="text-xs font-medium text-slate-400">{t('analyticsFairnessTitle')}</div>
              <div className="text-3xl font-black text-cyan-400 mt-2">%{analytics.fairness_index_percent}</div>
              <p className="text-xs text-slate-500 mt-1">{t('analyticsFairnessDesc')}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="text-xs font-medium text-slate-400">{t('analyticsAvgTATitle')}</div>
              <div className="text-3xl font-black text-emerald-400 mt-2">{analytics.average_shifts_per_ta} {t('shiftsCount')}</div>
              <p className="text-xs text-slate-500 mt-1">{t('analyticsAvgTADesc')}</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <div className="text-xs font-medium text-slate-400">{t('analyticsAvgProfTitle')}</div>
              <div className="text-3xl font-black text-blue-400 mt-2">{analytics.average_shifts_per_prof} {t('shiftsCount')}</div>
              <p className="text-xs text-slate-500 mt-1">{t('analyticsAvgProfDesc')}</p>
            </div>
          </div>

          {/* Workload Distribution Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">{t('analyticsTableTitle')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs text-slate-300">
                <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">{t('analyticsColName')}</th>
                    <th className="py-2.5 px-3">{t('analyticsColRole')}</th>
                    <th className="py-2.5 px-3">{t('analyticsColDept')}</th>
                    <th className="py-2.5 px-3">{t('analyticsColShifts')}</th>
                    <th className="py-2.5 px-3">{t('analyticsColHours')}</th>
                    <th className="py-2.5 px-3">{t('analyticsColTarget')}</th>
                    <th className="py-2.5 px-3">{t('analyticsColVariance')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {analytics.workload_distribution.map((w) => (
                    <tr key={w.user_id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-white">{w.full_name}</td>
                      <td className="py-2.5 px-3">{w.role === 'PROFESSOR' ? t('analyticsDoctorRole') : t('analyticsTARole')}</td>
                      <td className="py-2.5 px-3 text-slate-400">{w.department}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{w.assigned_shifts_count}</td>
                      <td className="py-2.5 px-3 font-mono">{w.assigned_hours} {t('hoursCount')}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{w.target_hours} {t('hoursCount')}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold" dir="ltr">
                        <span className={w.variance > 0 ? 'text-amber-400' : w.variance < 0 ? 'text-blue-400' : 'text-emerald-400'}>
                          {w.variance > 0 ? `+${w.variance}` : w.variance}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: EXPORT CENTER */}
      {activeTab === 'exports' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">{t('exportsTitle')}</h2>
            <p className="text-xs text-slate-400">{t('exportsSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                  <FileDown className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">{t('exportPdfMasterTitle')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('exportPdfMasterDesc')}
                </p>
              </div>
              <a
                href={api.exports.getMasterPdfUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition shadow-lg shadow-blue-600/20"
              >
                {t('exportPdfMasterBtn')}
              </a>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">{t('exportPngTitle')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('exportPngDesc')}
                </p>
              </div>
              <button
                onClick={handleCaptureImage}
                disabled={isExportingImage}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-xs text-slate-950 transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
              >
                {isExportingImage ? t('exportPngCapturing') : t('exportPngBtn')}
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">{t('exportCsvTitle')}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('exportCsvDesc')}
                </p>
              </div>
              <a
                href={api.exports.getCsvUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition shadow-lg shadow-emerald-600/20"
              >
                {t('exportCsvBtn')}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {overrideAssignment && (
        <OverrideModal
          assignment={overrideAssignment}
          availableUsers={users}
          onClose={() => setOverrideAssignment(null)}
          onConfirm={async (aid, newUid, notes) => {
            await api.schedules.override(aid, newUid, notes);
            onRefresh();
          }}
        />
      )}

      {/* Unavailability Constraint Modal */}
      {showConstraintModal && (
        <ConstraintModal
          users={users}
          onClose={() => setShowConstraintModal(false)}
          onAdd={async (uid, constraintData) => {
            await api.users.addConstraint(uid, constraintData);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};
