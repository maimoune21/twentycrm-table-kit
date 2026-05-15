import { Search } from "lucide-react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type DropdownProps = {
  /** Trigger button */
  trigger: ReactNode;
  /** Dropdown content */
  children: ReactNode;
  /** Controlled open state */
  open: boolean;
  /** Called when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Align to "left" or "right" of trigger */
  align?: "left" | "right";
  /** Width in pixels, or "auto" */
  width?: number | "auto";
};

/**
 * Generic dropdown — renders content via portal (not clipped by overflow:hidden parents).
 * Like Twenty's Dropdown using floating-ui with position:absolute + portal.
 */
export const Dropdown = ({
  trigger,
  children,
  open,
  onOpenChange,
  align = "left",
  width = 240,
}: DropdownProps) => {
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setIsDarkMode(isDark);

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Calculate position from trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = typeof width === "number" ? width : 240;
    setPosition({
      top: rect.bottom + 4,
      left: align === "right" ? rect.right - dropdownWidth : rect.left,
    });
  }, [align, width]);

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;

      // If a portaled Radix Select menu is open, let it handle outside clicks
      // first (so cancelling a select choice doesn't close the parent panel).
      if (document.querySelector('[data-slot="select-content"]')) {
        return;
      }

      // Ignore clicks inside portaled Radix Select menus
      if (
        target instanceof Element &&
        target.closest('[data-slot="select-content"]')
      ) {
        return;
      }

      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      onOpenChange(false);
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open, onOpenChange]);

  // Close on Escape — but not when a Radix Select or other portal popup is open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // If a portaled Radix Select menu is mounted, let it handle Escape itself
      if (document.querySelector('[data-slot="select-content"]')) return;
      onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <>
      <div ref={triggerRef}>{trigger}</div>
      {open &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-50 rounded-lg overflow-hidden bg-gray-50 border border-gray-200! shadow-xl right-8 px-1 py-1 mt-1"
            style={{
              top: `${position.top}px`,
              ...(width !== "auto" ? { width: `${width}px` } : {}),
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
};

// ── Shared dropdown sub-components ──

export const DropdownHeader = ({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) => (
  <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100">
    <span className="text-[12px] font-semibold text-gray-900 dark:text-white">
      {title}
    </span>
    {onClose && (
      <button
        onClick={onClose}
        className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/10 dark:hover:bg-white/8 text-gray-500 dark:text-gray-300 cursor-pointer border-none bg-transparent transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

export const DropdownSearchInput = ({
  value,
  onChange,
  placeholder = "Search fields",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="px-1 py-1 border-b border-gray-100">
    <div className="relative">
      <Search className="absolute left-1 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none size-3 pt-[3px]" />
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-none outline-none text-[11px] text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 pl-5.5 pr-1"
      />
    </div>
  </div>
);

export const DropdownSeparator = () => (
  <div className="border-b border-gray-100" />
);

export const DropdownSectionLabel = ({ label }: { label: string }) => (
  <div className="px-2 pt-2 pb-1.5 text-[0.6875rem] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
    {label}
  </div>
);

type DropdownMenuItemProps = {
  icon?: ReactNode;
  label: string;
  rightText?: string;
  rightTextColor?: string;
  rightIcon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  className?: string;
};

export const DropdownMenuItem = ({
  icon,
  label,
  rightText,
  rightTextColor,
  rightIcon,
  onClick,
  active,
  disabled,
  className,
}: DropdownMenuItemProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center h-7 px-2 py-0 text-[11px] text-left cursor-pointer transition-colors rounded-sm gap-1.5 w-full ${
      active
        ? "bg-white/15 dark:bg-white/10 text-blue-600 dark:text-blue-400"
        : "bg-transparent text-gray-700 dark:text-gray-100 hover:bg-white/10 dark:hover:bg-white/8"
    } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ""}`}
  >
    {icon && (
      <span className="flex items-center justify-center w-4 h-4 text-gray-500 dark:text-gray-300 shrink-0">
        {icon}
      </span>
    )}
    <span className="flex-1 truncate">{label}</span>
    {rightText && (
      <span
        className={`text-[0.75rem] shrink-0 ${rightTextColor || "text-gray-500 dark:text-gray-400"}`}
      >
        {rightText}
      </span>
    )}
    {rightIcon && (
      <span className="flex items-center shrink-0 text-gray-400 dark:text-gray-300">
        {rightIcon}
      </span>
    )}
  </button>
);

/** Simple toggle/checkbox item */
export const DropdownToggleItem = ({
  icon,
  label,
  checked,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    onClick={() => onChange(!checked)}
    className="flex items-center h-8 px-2 py-0 text-[12px] text-left bg-transparent border-none cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors rounded-sm gap-2"
  >
    {icon && (
      <span className="flex items-center justify-center w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0">
        {icon}
      </span>
    )}
    <span className="flex-1 truncate">{label}</span>
    <span
      className={`flex items-center justify-center w-4 h-4 rounded-sm border shrink-0 transition-colors ${
        checked
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-gray-400 dark:border-gray-500 bg-transparent"
      }`}
    >
      {checked && (
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  </button>
);
