import React from 'react';
import { Outlet } from 'react-router-dom';

export const WallboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans antialiased overflow-hidden">
      {/* Wallboard Layout is strictly full screen, dark mode, no unnecessary navigation */}
      <Outlet />
    </div>
  );
};
