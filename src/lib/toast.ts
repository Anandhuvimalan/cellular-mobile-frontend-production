/**
 * Toast Notification Utility
 * Beautiful toast notifications using react-hot-toast
 */
import toast from 'react-hot-toast';

// Custom toast styles matching the app design
const toastOptions = {
  success: {
    duration: 3000,
    style: {
      background: '#10b981',
      color: '#fff',
      fontWeight: '500',
      padding: '16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10b981',
    },
  },
  error: {
    duration: 4000,
    style: {
      background: '#ef4444',
      color: '#fff',
      fontWeight: '500',
      padding: '16px',
      borderRadius: '8px',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#ef4444',
    },
  },
  loading: {
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
      padding: '16px',
      borderRadius: '8px',
    },
  },
  info: {
    duration: 3000,
    style: {
      background: '#3b82f6',
      color: '#fff',
      fontWeight: '500',
      padding: '16px',
      borderRadius: '8px',
    },
  },
  warning: {
    duration: 4000,
    style: {
      background: '#f59e0b',
      color: '#fff',
      fontWeight: '500',
      padding: '16px',
      borderRadius: '8px',
    },
  },
};

export const showToast = {
  /**
   * Show success toast
   */
  success: (message: string) => {
    toast.success(message, toastOptions.success);
  },

  /**
   * Show error toast
   */
  error: (message: string) => {
    toast.error(message, toastOptions.error);
  },

  /**
   * Show info toast
   */
  info: (message: string) => {
    toast(message, {
      ...toastOptions.info,
      icon: 'ℹ️',
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string) => {
    toast(message, {
      ...toastOptions.warning,
      icon: '⚠️',
    });
  },

  /**
   * Show loading toast (returns toast ID for later dismiss)
   */
  loading: (message: string) => {
    return toast.loading(message, toastOptions.loading);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  /**
   * Show promise toast (auto-handles loading/success/error)
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        success: toastOptions.success,
        error: toastOptions.error,
        loading: toastOptions.loading,
      }
    );
  },

  /**
   * Show custom toast with custom JSX
   */
  custom: (jsx: any, options?: any) => {
    toast.custom(jsx, options);
  },
};

// Convenience function to handle API errors
export const handleApiError = (error: any, defaultMessage = 'An error occurred') => {
  const message =
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    defaultMessage;
  showToast.error(message);
};

// Convenience function for async operations
export const toastPromise = showToast.promise;
