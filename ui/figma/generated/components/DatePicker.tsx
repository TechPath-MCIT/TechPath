import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplay(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// One calendar grid cell: the date it represents, and whether it belongs to
// the currently-displayed month (days from the previous/next month pad the
// grid to full weeks but render dimmed and are still clickable).
interface DayCell {
  date: Date;
  inCurrentMonth: boolean;
}

function buildMonthGrid(monthAnchor: Date): DayCell[] {
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return { date, inCurrentMonth: date.getMonth() === month };
  });
}

interface DatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Select date', disabled, minDate, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [monthAnchor, setMonthAnchor] = useState(() => parseIsoDate(value || toIsoDate(new Date())));
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setMonthAnchor(parseIsoDate(value));
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const days = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayIso = toIsoDate(new Date());
  const minIso = minDate || undefined;

  return (
    <div ref={containerRef} className={`relative inline-block ${className ?? ''}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border outline-none w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{
          borderColor: isOpen ? '#02746f' : 'rgba(21, 16, 12, 0.15)',
          color: value ? '#15100c' : '#55371e',
          backgroundColor: '#ffffff',
        }}
      >
        <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#02746f' }} />
        {value ? formatDisplay(value) : placeholder}
      </button>

      {isOpen && (
        <div
          className="absolute z-20 mt-1.5 p-3 rounded-xl bg-white shadow-lg"
          style={{ border: '1px solid rgba(21, 16, 12, 0.1)', width: '260px' }}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1))}
              title="Previous month"
              className="p-1 rounded-md hover:bg-black/5"
            >
              <ChevronLeft className="w-4 h-4" style={{ color: '#02746f' }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: '#15100c' }}>
              {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1))}
              title="Next month"
              className="p-1 rounded-md hover:bg-black/5"
            >
              <ChevronRight className="w-4 h-4" style={{ color: '#02746f' }} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="text-center text-xs font-medium" style={{ color: '#55371e' }}>
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {days.map(({ date, inCurrentMonth }) => {
              const iso = toIsoDate(date);
              const isSelected = iso === value;
              const isToday = iso === todayIso;
              const isDisabled = minIso !== undefined && iso < minIso;

              return (
                <button
                  type="button"
                  key={iso}
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(iso);
                    setIsOpen(false);
                  }}
                  className="text-xs h-7 w-7 mx-auto rounded-full transition-colors disabled:cursor-not-allowed"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' : 'transparent',
                    color: isDisabled
                      ? 'rgba(85, 55, 30, 0.3)'
                      : isSelected
                      ? '#ffffff'
                      : !inCurrentMonth
                      ? 'rgba(85, 55, 30, 0.4)'
                      : '#15100c',
                    border: isToday && !isSelected ? '1px solid #02746f' : '1px solid transparent',
                    fontWeight: isSelected || isToday ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !isDisabled) e.currentTarget.style.backgroundColor = 'rgba(184, 226, 212, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
