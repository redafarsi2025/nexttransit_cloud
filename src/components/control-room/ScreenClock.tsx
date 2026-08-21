import React, { useState, useEffect } from 'react';

export const ScreenClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-2xl font-bold tracking-widest text-slate-200">
      {time.toLocaleTimeString('en-US', { hour12: false })}
    </div>
  );
};
