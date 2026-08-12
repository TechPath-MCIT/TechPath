interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  // "danger" (red) for destructive actions like Remove; "primary" (teal,
  // matching the rest of the app's affirmative actions) for non-destructive
  // ones like marking a course complete.
  tone?: 'danger' | 'primary';
}

export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm, tone = 'danger' }: ConfirmDialogProps) {
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
        <h3 className="text-lg font-semibold mb-1.5" style={{ color: '#15100c' }}>
          {title}
        </h3>
        <p className="text-sm mb-6" style={{ color: '#55371e' }}>
          {message}
        </p>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'rgba(184, 226, 212, 0.2)', color: '#02746f' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: tone === 'danger' ? '#ef4444' : 'linear-gradient(135deg, #02746f 0%, #b8e2d4 100%)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
