import { useState } from 'react';
import { X } from 'lucide-react';
import { DatePicker } from './DatePicker';

// Course duration isn't tracked per-resource (duration_minutes is unset for
// every MCIT course) — course_units (Penn's half-semester/full-semester unit)
// is the only real proxy available, so it drives the auto-computed end date.
const FULL_COURSE_WEEKS = 14;
const HALF_COURSE_WEEKS = 7;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeDefaultEndDate(startDateIso: string, courseUnits: number | null): string {
  const weeks = courseUnits === 0.5 ? HALF_COURSE_WEEKS : FULL_COURSE_WEEKS;
  const start = new Date(`${startDateIso}T00:00:00`);
  start.setDate(start.getDate() + weeks * 7);
  return toIsoDate(start);
}

interface AddResourceDialogProps {
  resourceName: string;
  courseUnits: number | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
}

export function AddResourceDialog({ resourceName, courseUnits, isSubmitting, onCancel, onConfirm }: AddResourceDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endDateTouched, setEndDateTouched] = useState(false);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setEndDateTouched(false);
    setEndDate(value ? computeDefaultEndDate(value, courseUnits) : '');
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setEndDateTouched(true);
  };

  const isEndDateBeforeStart = Boolean(startDate && endDate && endDate < startDate);
  const canConfirm = Boolean(startDate && endDate && !isEndDateBeforeStart) && !isSubmitting;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(21, 16, 12, 0.4)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold" style={{ color: '#15100c' }}>
            Add course
          </h3>
          <button onClick={onCancel} title="Close" className="p-1 -m-1 rounded-md hover:bg-stone-100">
            <X className="w-4 h-4" style={{ color: '#55371e' }} />
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: '#55371e' }}>
          {resourceName}
        </p>

        <label className="block text-xs font-medium mb-1.5" style={{ color: '#15100c' }}>
          Start date
        </label>
        <DatePicker
          value={startDate}
          onChange={handleStartDateChange}
          placeholder="Select start date"
          className="w-full mb-4"
        />

        <label className="block text-xs font-medium mb-1.5" style={{ color: '#15100c' }}>
          End date
        </label>
        <DatePicker
          value={endDate}
          onChange={handleEndDateChange}
          placeholder="Select end date"
          disabled={!startDate}
          minDate={startDate || undefined}
          className="w-full"
        />
        {!startDate && (
          <p className="text-xs mt-1.5" style={{ color: '#55371e' }}>
            Pick a start date first — the end date fills in automatically ({courseUnits === 0.5 ? HALF_COURSE_WEEKS : FULL_COURSE_WEEKS} weeks) and you can adjust it.
          </p>
        )}
        {isEndDateBeforeStart && (
          <p className="text-xs mt-1.5" style={{ color: '#991b1b' }}>
            End date can&apos;t be before the start date.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#02746f' }}
          >
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm(startDate, endDate)}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' }}
          >
            {isSubmitting ? 'Adding…' : 'Add course'}
          </button>
        </div>
      </div>
    </div>
  );
}
