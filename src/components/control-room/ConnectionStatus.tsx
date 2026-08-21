import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'online' | 'offline' | 'connecting';
  lastPing?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, lastPing }) => {
  return (
    <div className="flex items-center gap-3">
      {status === 'online' ? (
        <div className="flex items-center gap-2 text-emerald-400">
          <Wifi className="w-6 h-6 animate-pulse" />
          <span className="font-bold tracking-widest uppercase text-sm">Online</span>
          {lastPing && (
            <span className="text-xs text-emerald-500/60 font-mono">· {lastPing}</span>
          )}
        </div>
      ) : status === 'offline' ? (
        <div className="flex items-center gap-2 text-rose-500">
          <WifiOff className="w-6 h-6" />
          <span className="font-bold tracking-widest uppercase text-sm">Offline</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-amber-400">
          <Wifi className="w-6 h-6 animate-pulse" />
          <span className="font-bold tracking-widest uppercase text-sm">Connecting</span>
        </div>
      )}
    </div>
  );
};
