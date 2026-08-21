import React from 'react';

interface WallboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export const WallboardCard: React.FC<WallboardCardProps> = ({ 
  title, 
  children,
  className = '',
  titleClassName = ''
}) => {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col ${className}`}>
      <h2 className={`text-xl font-bold tracking-widest text-slate-400 uppercase mb-4 ${titleClassName}`}>
        {title}
      </h2>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};
