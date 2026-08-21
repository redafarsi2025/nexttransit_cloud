import { useEffect, useState } from 'react';

// Matches Tailwind's `md` breakpoint (768px) so JS-driven layout branches (e.g. Sidebar's
// icon-rail vs. off-canvas drawer) stay in sync with the Tailwind responsive classes doing the
// actual positioning.
const MOBILE_BREAKPOINT_PX = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
