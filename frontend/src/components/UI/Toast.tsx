import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const baseClasses = "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 max-w-sm";
  
  const typeClasses = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    warning: 'bg-yellow-500 text-black'
  };

  const visibilityClasses = isVisible 
    ? 'translate-x-0 opacity-100' 
    : 'translate-x-full opacity-0';

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="mr-2">
            {type === 'success' && '✅'}
            {type === 'error' && '❌'}
            {type === 'info' && 'ℹ️'}
            {type === 'warning' && '⚠️'}
          </span>
          <span className="text-sm font-medium">{message}</span>
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-3 text-white hover:text-gray-200 focus:outline-none"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Toast container and manager
interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' | 'warning' }>;
  removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};