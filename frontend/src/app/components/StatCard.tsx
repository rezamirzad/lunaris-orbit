import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatCardProps {
  title: string;
  value: string | number;
  formattedValue?: string; // Evan: Pre-formatted string to prevent hydration errors
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isUp: boolean;
  };
  className?: string;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, formattedValue, icon, trend, className }) => {
  return (
    <div className={cn(
      "p-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-slate-400">{title}</span>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl font-bold text-white">{formattedValue || value}</h3>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            trend.isUp ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
