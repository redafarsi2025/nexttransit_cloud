import React from 'react';

// Reusable "control room monitor" visual, styled to match the Hero section's app-window
// mockup (window-chrome dots, #121824/#0D121D panel colors, font-data mono labels). Gives
// every major landing page section a representative "screen" instead of plain text/icon lists,
// without any external image assets — same visual language throughout, themeable, no broken
// links, no large payloads.

export type ControlPanelStatus = 'ok' | 'warning' | 'critical' | 'info' | 'neutral';

export interface ControlPanelRow {
  label: string;
  value: string;
  detail?: string;
  status: ControlPanelStatus;
}

export interface ControlPanelFooterStat {
  label: string;
  value: string;
  tone?: 'emerald' | 'red' | 'ochre';
}

interface ControlPanelVisualProps {
  windowLabel: string;
  badgeLabel: string;
  badgeTone?: 'emerald' | 'amber' | 'red' | 'ochre';
  rows: ControlPanelRow[];
  footer?: ControlPanelFooterStat[];
  className?: string;
}

const STATUS_DOT: Record<ControlPanelStatus, string> = {
  ok: 'bg-emerald-400',
  warning: 'bg-amber-400',
  critical: 'bg-red-400',
  info: 'bg-sky-400',
  neutral: 'bg-slate-500',
};

const STATUS_TEXT: Record<ControlPanelStatus, string> = {
  ok: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  info: 'text-sky-400',
  neutral: 'text-slate-300',
};

const BADGE_CLASSES: Record<'emerald' | 'amber' | 'red' | 'ochre', string> = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  ochre: 'bg-ochre/10 text-ochre border-ochre/30',
};

const BADGE_DOT: Record<'emerald' | 'amber' | 'red' | 'ochre', string> = {
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  red: 'bg-red-400',
  ochre: 'bg-ochre',
};

const FOOTER_TONE: Record<'emerald' | 'red' | 'ochre', string> = {
  emerald: 'text-emerald-400',
  red: 'text-red-400',
  ochre: 'text-ochre',
};

export const ControlPanelVisual: React.FC<ControlPanelVisualProps> = ({
  windowLabel,
  badgeLabel,
  badgeTone = 'emerald',
  rows,
  footer,
  className = '',
}) => {
  return (
    <div className={`bg-[#121824] rounded-2xl border border-white/15 shadow-2xl overflow-hidden ${className}`}>
      <div className="bg-[#0D121D] px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[10px] font-data text-slate-400 ml-2 truncate">{windowLabel}</span>
        </div>
        <span className={`text-[10px] font-data border px-2 py-0.5 rounded font-bold flex items-center gap-1 shrink-0 ${BADGE_CLASSES[badgeTone]}`}>
          <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${BADGE_DOT[badgeTone]}`} />
          {badgeLabel}
        </span>
      </div>

      <div className="p-4 space-y-2.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${STATUS_DOT[row.status]}`} />
              <span className="text-[11px] text-slate-400 font-data truncate">{row.label}</span>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-xs font-bold block ${STATUS_TEXT[row.status]}`}>{row.value}</span>
              {row.detail && <span className="text-[10px] text-slate-500 block">{row.detail}</span>}
            </div>
          </div>
        ))}
      </div>

      {footer && footer.length > 0 && (
        <div className="grid gap-px bg-white/10 border-t border-white/10" style={{ gridTemplateColumns: `repeat(${footer.length}, minmax(0, 1fr))` }}>
          {footer.map((f, i) => (
            <div key={i} className="bg-[#121824] p-3 text-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-data block">{f.label}</span>
              <span className={`text-sm font-black font-data block ${FOOTER_TONE[f.tone || 'ochre']}`}>{f.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
