import { ETAT_OPTIONS } from "./constants";

/* ── Status icon SVGs ── */
const CheckIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
  </svg>
);
const SparkleIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 .75a.75.75 0 01.67.42l1.76 3.56 3.93.57a.75.75 0 01.42 1.28l-2.85 2.77.67 3.92a.75.75 0 01-1.09.79L8 12.35l-3.51 1.84a.75.75 0 01-1.09-.79l.67-3.92L1.22 6.71a.75.75 0 01.42-1.28l3.93-.57L7.33 1.3A.75.75 0 018 .75z" />
  </svg>
);
const XIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M5.75 1a.75.75 0 00-.75.75V3H2a.75.75 0 000 1.5h.73l.57 8.52A1.75 1.75 0 005.04 14.75h5.92a1.75 1.75 0 001.74-1.73L13.27 4.5H14A.75.75 0 0014 3h-3V1.75A.75.75 0 0010.25 1h-4.5zm4.5 2V2.5h-4.5V3h4.5z"
      clipRule="evenodd"
    />
  </svg>
);

const normalizeEtat = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const STATUS_CONFIG: Record<
  string,
  {
    dot: string;
    bg: string;
    text: string;
    ring: string;
    glow?: string;
    Icon: React.FC;
    pulse?: boolean;
  }
> = {
  validee: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/25 dark:ring-emerald-400/20",
    glow: "shadow-[0_0_6px_rgba(16,185,129,0.25)]",
    Icon: CheckIcon,
    pulse: true,
  },
  nouveau: {
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/25 dark:ring-blue-400/20",
    glow: "shadow-[0_0_6px_rgba(59,130,246,0.2)]",
    Icon: SparkleIcon,
    pulse: true,
  },
  "non validee": {
    dot: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/25 dark:ring-amber-400/20",
    Icon: XIcon,
  },
  supprimee: {
    dot: "bg-gray-400 dark:bg-gray-500",
    bg: "bg-gray-100/80 dark:bg-gray-800/60",
    text: "text-gray-500 dark:text-gray-400",
    ring: "ring-gray-300/40 dark:ring-gray-600/30",
    Icon: TrashIcon,
  },
};

const FALLBACK_CONFIG = {
  dot: "bg-gray-400",
  bg: "bg-gray-100/80 dark:bg-gray-800/60",
  text: "text-gray-500 dark:text-gray-400",
  ring: "ring-gray-300/40",
  pulse: false,
  Icon: (() => (
    <span className="w-3 h-3 flex items-center justify-center text-[9px]">
      •
    </span>
  )) as React.FC,
};

interface EtatCandidatCellProps {
  record: any;
}

export function EtatCandidatCell({ record }: EtatCandidatCellProps) {
  const rawValue = String(record?.etat ?? "").trim();
  const key = normalizeEtat(rawValue);

  const option = ETAT_OPTIONS.find((o) => normalizeEtat(o.value) === key);
  const label = option?.label ?? (rawValue || "—");
  const cfg = STATUS_CONFIG[key] ?? FALLBACK_CONFIG;
  const { Icon } = cfg;

  return (
    <div className="flex items-center px-2">
      <span
        className={`
          group/badge inline-flex items-center gap-1.5
          px-1.5 py-1 rounded-full
          text-[9px] font-semibold leading-none tracking-wide
          ${cfg.text}
          transition-all duration-200
        `}
      >
        {/* Animated dot */}
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {cfg.pulse && (
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full ${cfg.dot} opacity-30`}
            />
          )}
          <span
            className={`relative inline-flex h-1.5 w-1.5 rounded-full ${cfg.dot}`}
          />
        </span>

        {/* Label */}
        <span>{label}</span>

        {/* Status icon — revealed on hover */}
        <span className="w-0 overflow-hidden opacity-0 group-hover/badge:w-3 group-hover/badge:opacity-70 transition-all duration-200">
          <Icon />
        </span>
      </span>
    </div>
  );
}
