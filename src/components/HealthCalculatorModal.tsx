import React, { useEffect } from 'react';
import { X, HeartPulse } from 'lucide-react';
import { HealthCalorieCalculatorSuite, CalculatorTab } from './health/HealthCalorieCalculatorSuite.tsx';

interface HealthCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CalculatorTab;
}

export const HealthCalculatorModal: React.FC<HealthCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'tdee',
}) => {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl my-auto z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xl"
          title="Close Health Calculator (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Embedded Calculator Suite */}
        <HealthCalorieCalculatorSuite initialTab={initialTab} />
      </div>
    </div>
  );
};
