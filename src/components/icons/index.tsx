import { forwardRef, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

// Familiar controls stay consistent. Arena entities use the original SVG family below.
export {
  AlertCircle, AlertTriangle, Archive, ArrowLeft, ArrowRight, Bell, Check, CheckCheck,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, ExternalLink,
  Eye, EyeOff, FileText, Image, Link, LoaderCircle, Lock, LockKeyhole, LogIn, LogOut,
  Mail, MessageCircle, Pencil, Plus, PlusCircle, RefreshCw, Save, Search, Send,
  Settings2, Share2, Trash2, Upload, X, ZoomIn, ZoomOut,
} from 'lucide-react';

function arenaIcon(name: string, artwork: ReactNode) {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function ArenaIcon({
    size = 24, color = 'currentColor', strokeWidth = 1.65,
    absoluteStrokeWidth = false, children, ...props
  }, ref) {
    const width = absoluteStrokeWidth && typeof size === 'number' && size > 0 ? Number(strokeWidth) * 24 / size : strokeWidth;
    const labelled = props['aria-label'] || props['aria-labelledby'];
    return <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width}
      strokeLinecap="square" strokeLinejoin="bevel" focusable="false"
      aria-hidden={labelled ? undefined : true} role={labelled ? 'img' : undefined}
      data-arena-icon={name} {...props}>{artwork}{children}</svg>;
  });
  Icon.displayName = name;
  return Icon;
}

export const Trophy = arenaIcon('championship', <>
  <path d="M7 3h10v7l-2 4-3 2-3-2-2-4Z" fill="currentColor" fillOpacity=".12" />
  <path d="M7 5H3v4l4 3m10-7h4v4l-4 3M12 16v4m-5 1h10m-8-2h6" />
  <path d="m12 6 2 2-2 2-2-2Z" fill="currentColor" stroke="none" />
</>);

export const Swords = arenaIcon('versus', <>
  <path d="m3 3 5 1 10 13-3 3L4 8Z" fill="currentColor" fillOpacity=".12" />
  <path d="m21 3-5 1-5 6m-3 4-3 3 3 3 3-3M3 21l3-3m15 3-3-3M3 15l6 6m6 0 6-6M6 6l9 10m3-10-3 3" />
</>);

export const Gamepad2 = arenaIcon('controller', <>
  <path d="M6 6h12l3 4 1 8-3 2-4-4H9l-4 4-3-2 1-8Z" fill="currentColor" fillOpacity=".12" />
  <path d="M5 11h5m-2.5-2.5v5M11 4h2m-2 9h2" />
  <path d="M16 10h1v1h-1Zm3 3h1v1h-1Z" fill="currentColor" stroke="none" />
</>);

export const Users = arenaIcon('squad', <>
  <path d="m12 3 4 2v5l-4 3-4-3V5Z" fill="currentColor" fillOpacity=".12" />
  <path d="M10 7h4m-3 3h2M5 6 2 8v4l3 2 2-1m12-7 3 2v4l-3 2-2-1M6 21l1-5 5-2 5 2 1 5Zm-2-6-2 2v3m18-5 2 2v3" />
</>);

const player = <>
  <path d="m12 2 5 3v6l-5 3-5-3V5Z" fill="currentColor" fillOpacity=".12" />
  <path d="M8 7h8l-2 3h-4Zm-3 4H4V7h1m14 4h1V7h-1M4 22v-4l5-3 3 2 3-2 5 3v4M9 20l3 2 3-2" />
</>;
export const User = arenaIcon('player', player);
export const UserRound = User;
export const UserCheck = arenaIcon('player-ready', <>
  <path d="m10 3 4 2v6l-4 3-4-3V5Z" fill="currentColor" fillOpacity=".12" />
  <path d="M7 7h6M3 21v-4l4-2 3 2 3-2m3 3 2 2 4-5" />
</>);
export const UserMinus = arenaIcon('player-leave', <>
  <path d="m10 3 4 2v6l-4 3-4-3V5Z" fill="currentColor" fillOpacity=".12" />
  <path d="M7 7h6M3 21v-4l4-2 3 2 3-2m3 3h6" />
</>);

const crest = <path d="M12 2 21 6l-1 9-8 7-8-7-1-9Z" fill="currentColor" fillOpacity=".12" />;
export const Shield = arenaIcon('team-crest', <>{crest}<path d="m8 9 4-2 4 2-4 7Zm-1 8 5 3 5-3" /></>);
export const ShieldCheck = arenaIcon('verified-competitor', <>{crest}<path d="m8 11 3 3 5-6M8 17l4 3 4-3" /></>);
export const ShieldAlert = arenaIcon('referee', <>{crest}<path d="M12 7v5m0 4v.2M7 6l5-2 5 2" /></>);

export const Crown = arenaIcon('champion-rank', <>
  <path d="m3 6 5 4 4-7 4 7 5-4-2 12H5Z" fill="currentColor" fillOpacity=".12" />
  <path d="M6 21h12m-5-8-1-1-1 1 1 1Z" />
</>);

export const Layers = arenaIcon('tournament-bracket', <>
  <path d="M2 3h5v4H2Zm0 14h5v4H2Zm15-7h5v4h-5Z" fill="currentColor" fillOpacity=".12" />
  <path d="M7 5h4v14H7m4-7h6M2 10h3m-3 4h3" />
</>);

export const Calendar = arenaIcon('match-day', <>
  <path d="M3 5h18v14l-3 3H3Z" fill="currentColor" fillOpacity=".1" />
  <path d="M3 9h18M7 2v5m10-5v5m-4 5-3 3 3 3m3-6-3 3 3 3M6 13v5" />
</>);
export const CalendarDays = Calendar;
export const CalendarPlus = arenaIcon('schedule-match', <>
  <path d="M3 5h18v8M3 5v16h9M3 9h18M7 2v5m10-5v5" />
  <path d="M13 13h9v9h-9Z" fill="currentColor" fillOpacity=".12" />
  <path d="M17.5 15v5m-2.5-2.5h5" />
</>);

export const Clock = arenaIcon('match-timer', <>
  <path d="m12 5 6 2 3 6-3 6-6 3-6-3-3-6 3-6Z" fill="currentColor" fillOpacity=".1" />
  <path d="M9 2h6m-3 0v3m7 1 2-2M12 9v5l3 2M6 13h1m10 0h1" />
</>);

export const Flame = arenaIcon('live-streak', <>
  <path d="m13 2 1 6 4-3 3 9-2 5-7 3-7-3-2-5 4-7 1 5Z" fill="currentColor" fillOpacity=".12" />
  <path d="m13 11-4 6 3 3 3-3Z" />
</>);

export const Star = arenaIcon('rank-star', <>
  <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor" fillOpacity=".12" />
  <path d="m10 11 2-3 2 3-2 4Z" fill="currentColor" stroke="none" />
</>);

export const Sparkles = arenaIcon('xp-boost', <>
  <path d="m13 2-9 12h7l-1 8 10-13h-7Z" fill="currentColor" fillOpacity=".12" />
  <path d="M3 4h3M4.5 2.5v3M19 19h3m-1.5-1.5v3" />
</>);

export const Heart = arenaIcon('favorite', <>
  <path d="m12 21-9-9V6l4-3h3l2 3 2-3h3l4 3v6Z" fill="currentColor" fillOpacity=".08" />
</>);

export const LifeBuoy = arenaIcon('arena-support', <>
  <path d="M4 14V9l3-5 5-2 5 2 3 5v5M3 11h4v7H3Zm14 0h4v7h-4Z" fill="currentColor" fillOpacity=".12" />
  <path d="M19 18v2l-4 2h-3m-1-1h3v2h-3M10 8h4" />
</>);

export const Receipt = arenaIcon('entry-pass', <>
  <path d="M3 3h18v6l-3 3 3 3v6H3v-6l3-3-3-3Z" fill="currentColor" fillOpacity=".12" />
  <path d="M9 6v2m0 3v2m0 3v2m3-10h5m-5 4h3m-3 4h5" />
</>);
