import React, { useState, useEffect } from 'react';
import { PushNotification } from '../types.ts';
import { Bell, Sparkles, TrendingUp, DollarSign, X, CheckCircle, ArrowRight } from 'lucide-react';

interface PushNotificationManagerProps {
  notifications: PushNotification[];
  onDismiss: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onSelectLink?: (link: string) => void;
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  notifications,
  onDismiss,
  isOpen,
  onClose,
  onSelectLink,
}) => {
  if (!isOpen) return null;

  const typeIcons = {
    traffic: <TrendingUp className="w-4 h-4 text-emerald-500" />,
    breaking: <Sparkles className="w-4 h-4 text-amber-500" />,
    revenue: <DollarSign className="w-4 h-4 text-indigo-500" />,
    system: <Bell className="w-4 h-4 text-sky-500" />,
  };

  return (
    <div className="fixed top-20 right-4 md:right-8 z-50 w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
            Briefzy Real-Time Alerts ({notifications.length})
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto p-3 space-y-2.5 text-xs">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
            <p>All notifications caught up.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors relative group"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {typeIcons[notif.type] || <Bell className="w-4 h-4 text-amber-500" />}
                </div>
                <div className="flex-1 pr-4">
                  <h5 className="font-bold text-slate-900 dark:text-white leading-snug">
                    {notif.title}
                  </h5>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-normal">
                    {notif.body}
                  </p>
                  <div className="text-[10px] text-slate-400 font-mono mt-1.5 flex items-center justify-between">
                    <span>{notif.timestamp}</span>
                    {notif.link && onSelectLink && (
                      <button
                        onClick={() => onSelectLink(notif.link!)}
                        className="text-amber-500 hover:underline flex items-center gap-0.5 font-semibold cursor-pointer"
                      >
                        <span>View story</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDismiss(notif.id)}
                className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 dark:hover:text-slate-200 p-1 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
