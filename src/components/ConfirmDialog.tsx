'use client';

import { FiAlertTriangle, FiInfo, FiAlertCircle } from 'react-icons/fi';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantConfig = {
    danger: {
      icon: <FiAlertTriangle className="text-red-400" size={24} />,
      buttonClass: 'bg-red-500 hover:bg-red-600 text-white',
      borderClass: 'border-red-500/20',
    },
    warning: {
      icon: <FiAlertCircle className="text-orange-400" size={24} />,
      buttonClass: 'bg-orange-500 hover:bg-orange-600 text-white',
      borderClass: 'border-orange-500/20',
    },
    info: {
      icon: <FiInfo className="text-blue-400" size={24} />,
      buttonClass: 'bg-blue-500 hover:bg-blue-600 text-white',
      borderClass: 'border-blue-500/20',
    },
  };

  const config = variantConfig[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-md rounded-2xl border ${config.borderClass} bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-slate-100 mb-2">{title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex space-x-3 justify-end mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl ${config.buttonClass} transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
