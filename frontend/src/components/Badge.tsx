import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '', size = 'md' }) => {
  const norm = (status || '').toUpperCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (norm === 'PRESENT') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm === 'LATE') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (norm === 'ABSENT') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (norm === 'ACTIVE') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (norm === 'INACTIVE') {
    styles = 'bg-slate-100 text-slate-500 border-slate-200';
  } else if (norm === 'CHECKED_OUT' || norm === 'COMPLETED') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (norm === 'SCHEDULED') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center rounded-md border tracking-wide uppercase ${sizeCls} ${styles} ${className}`}>
      {status}
    </span>
  );
};
