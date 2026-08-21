import React from 'react';
import { ScreenClock } from './ScreenClock';
import { ConnectionStatus } from './ConnectionStatus';

interface WallboardHeaderProps {
  title: string;
  connectionStatus?: 'online' | 'offline' | 'connecting';
  subtitle?: string;
}

export const WallboardHeader: React.FC<WallboardHeaderProps> = ({ 
  title, 
  connectionStatus = 'online',
  subtitle 
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white uppercase">{title}</h1>
          {subtitle && (
            <p className="text-slate-400 text-lg font-medium tracking-wide mt-1">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-8">
        <ConnectionStatus status={connectionStatus} />
        <ScreenClock />
      </div>
    </header>
  );
};
