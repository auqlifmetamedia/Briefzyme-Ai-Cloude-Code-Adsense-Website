import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showDomain?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showDomain = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const domainSizes = {
    sm: 'text-[10px] px-1.5 py-0.2',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-0.5',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 group cursor-pointer select-none ${className}`}>
      {/* Modern, Dynamic & Elegant Brand Monogram */}
      <div className={`relative ${iconSizes[size]} flex items-center justify-center shrink-0`}>
        {/* Ambient Glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 opacity-80 group-hover:opacity-100 blur-xs group-hover:blur-sm transition-all duration-300" />
        
        {/* Main Monogram Container */}
        <div className="relative w-full h-full rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/20 group-hover:shadow-cyan-500/30 transition-all duration-300 transform group-hover:scale-105">
          <div className="w-full h-full rounded-[14px] bg-slate-950/20 backdrop-blur-xs flex items-center justify-center overflow-hidden">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5/6 h-5/6 text-white"
            >
              <defs>
                <linearGradient id="briefzyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="briefzySpark" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>

              {/* Dynamic Modern 'B' Architecture */}
              {/* Back Spine & Primary Curve */}
              <path
                d="M8 5.5H16.5C19.8 5.5 22.5 7.8 22.5 11C22.5 13.2 21.2 15.1 19.3 16C21.8 16.9 23.5 19.3 23.5 22C23.5 25.6 20.6 27.5 16.8 27.5H8V5.5Z"
                fill="url(#briefzyGrad)"
                fillOpacity="0.18"
              />
              <path
                d="M9 7H16C18.2 7 20 8.8 20 11C20 13.2 18.2 15 16 15H9V7Z"
                fill="url(#briefzyGrad)"
              />
              <path
                d="M9 15H17C19.5 15 21.5 17 21.5 19.5C21.5 22 19.5 24 17 24H9V15Z"
                fill="url(#briefzyGrad)"
              />

              {/* Dynamic Lightning / Forward Arrow Cut */}
              <path
                d="M17 9.5L12 17.5H18L13 25"
                stroke="url(#briefzySpark)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Modern Spark Accent Point */}
              <circle cx="21" cy="9.5" r="1.5" fill="#38bdf8" />
            </svg>
          </div>
        </div>
      </div>

      {/* Brand Name Typography - ALL CAPS */}
      <div className="flex items-center gap-1.5 leading-none">
        <span
          className={`font-black tracking-wide uppercase font-heading text-slate-900 dark:text-white ${textSizes[size]}`}
        >
          BRIEF<span className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 bg-clip-text text-transparent">ZY</span>
        </span>
        {showDomain && (
          <span
            className={`font-mono font-black uppercase tracking-wider rounded-lg bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 text-indigo-600 dark:text-cyan-400 border border-indigo-500/20 dark:border-cyan-400/30 ${domainSizes[size]}`}
          >
            .ME
          </span>
        )}
      </div>
    </div>
  );
};
