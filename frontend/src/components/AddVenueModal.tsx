import React, { useState } from 'react';
import { X, Building2, AlertCircle, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

interface AddVenueModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddVenueModal: React.FC<AddVenueModalProps> = ({ onClose, onSuccess }) => {
  const { language, isRtl } = useLanguage();
  const toast = useToast();

  const [name, setName] = useState('');
  const [venueType, setVenueType] = useState<'HALL' | 'LAB'>('HALL');
  const [building, setBuilding] = useState('Building A (مبنى أ)');
  const [floor, setFloor] = useState<number>(1);
  const [capacity, setCapacity] = useState<number>(150);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (type: 'HALL' | 'LAB') => {
    setVenueType(type);
    if (type === 'LAB') {
      setCapacity(40);
    } else {
      setCapacity(150);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(language === 'ar' ? 'يرجى كتابة اسم المقر أو القاعة' : 'Please provide venue name');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.venues.create({
        name: name.trim(),
        venue_type: venueType,
        building: building.trim(),
        floor: Number(floor),
        capacity: Number(capacity),
        is_active: true,
      });

      toast.success(
        language === 'ar' ? 'تمت إضافة المقر بنجاح' : 'Venue added successfully'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'ar' ? 'فشل إضافة المقر' : 'Failed to create venue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 space-x-reverse mb-5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {language === 'ar' ? 'إضافة مقر امتحاني جديد' : 'Add Examination Venue'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'ar' ? 'تسجيل مدرج أو معمل حاسب بقاعدة بيانات الكلية' : 'Register a lecture hall or computer lab'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Venue Type */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              {language === 'ar' ? 'طبيعة المقر' : 'Venue Type'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('HALL')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  venueType === 'HALL'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'مدرج / قاعة محاضرات' : 'Lecture Hall'}
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('LAB')}
                className={`p-2.5 rounded-xl border text-center font-bold transition ${
                  venueType === 'LAB'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {language === 'ar' ? 'معمل حاسب / ذكاء اصطناعي' : 'Computer / AI Lab'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              {language === 'ar' ? 'اسم المقر أو المعمل' : 'Venue Name'} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={venueType === 'HALL' ? 'مدرج د/ إبراهيم حلمي (Hall 105)' : 'معمل الذكاء الاصطناعي #7 (AI Lab 7)'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'المبنى' : 'Building'}
              </label>
              <input
                type="text"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1">
                {language === 'ar' ? 'الطابق' : 'Floor'}
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              {language === 'ar' ? 'السعة الطلابية القصوى' : 'Student Seating Capacity'}
            </label>
            <input
              type="number"
              min={10}
              max={500}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500 transition font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold transition shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>{language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{language === 'ar' ? 'إضافة المقر' : 'Save Venue'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
