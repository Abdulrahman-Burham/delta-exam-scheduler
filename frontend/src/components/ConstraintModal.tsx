import React, { useState } from 'react';
import { User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { X, CalendarX2 } from 'lucide-react';

interface ConstraintModalProps {
  users: User[];
  onClose: () => void;
  onAdd: (userId: string | number, constraint: any) => Promise<void>;
}

export const ConstraintModal: React.FC<ConstraintModalProps> = ({ users, onClose, onAdd }) => {
  const { t, language } = useLanguage();
  const [userId, setUserId] = useState<string | number>(users[0]?.id || '');
  const [date, setDate] = useState<string>('2026-11-07');
  const [fullDay, setFullDay] = useState<boolean>(true);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [constraintType, setConstraintType] = useState<string>('UNAVAILABLE');
  const [reason, setReason] = useState<string>(
    language === 'ar' ? 'عذر طبي / مهمة علمية رسمية معتمدة' : 'Approved medical excuse / official scientific mission'
  );
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdd(userId, {
        user_id: userId,
        date,
        start_time: fullDay ? null : `${startTime}:00`,
        end_time: fullDay ? null : `${endTime}:00`,
        constraint_type: constraintType,
        reason,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || (language === 'ar' ? 'فشل في حفظ قيد عدم التفرغ' : 'Failed to save unavailability constraint'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-start">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CalendarX2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('constraintModalTitle')}</h3>
              <p className="text-xs text-slate-400">{t('constraintModalDesc')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">{t('constraintMemberLabel')}</label>
            <select
              value={userId}
              onChange={(e) => setUserId(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role === 'PROFESSOR' ? t('roleProfBadge') : t('roleTABadge')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">{t('constraintDateLabel')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <input
              type="checkbox"
              id="fullDay"
              checked={fullDay}
              onChange={(e) => setFullDay(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500 accent-amber-500"
            />
            <label htmlFor="fullDay" className="text-slate-300 cursor-pointer font-medium">
              {t('constraintFullDayLabel')}
            </label>
          </div>

          {!fullDay && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-400 mb-1">{language === 'ar' ? 'من الساعة:' : 'Start Time:'}</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">{language === 'ar' ? 'إلى الساعة:' : 'End Time:'}</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-bold mb-1">{t('constraintReasonLabel')}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('constraintReasonPlaceholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500"
              required
            />
          </div>

          <div className="flex items-center justify-end space-x-2 space-x-reverse pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              {t('constraintCancelBtn')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-600/20"
            >
              {loading ? t('saving') : t('constraintSaveBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
