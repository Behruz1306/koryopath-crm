import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const variantConfig: Record<
  string,
  { icon: typeof AlertTriangle; iconColor: string; buttonBg: string; buttonHover: string }
> = {
  danger: {
    icon: AlertCircle,
    iconColor: 'text-red-500',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    buttonBg: 'bg-yellow-600',
    buttonHover: 'hover:bg-yellow-700',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
};

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'info',
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <IconComponent className={clsx('h-10 w-10', config.iconColor)} />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={clsx(
            'rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
            config.buttonBg,
            config.buttonHover
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
