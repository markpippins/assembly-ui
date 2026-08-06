import React from 'react';
import { TTSButton } from './TTSButton';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  ttsContent?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  ttsContent,
  action,
  children,
}) => {
  return (
    <div className="flex flex-col gap-3 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-poppins text-slate-900 dark:text-white flex items-center gap-3">
            {title}
            {ttsContent && <TTSButton text={ttsContent} label="Read Page" />}
          </h1>
          {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
      {children}
    </div>
  );
};

