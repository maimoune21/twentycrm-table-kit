import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ColumnDefinition } from "../../types";

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  separator?: false;
};

type MenuSeparator = {
  separator: true;
};

type RecordTableHeaderContextMenuProps = {
  column: ColumnDefinition;
  position: { x: number; y: number };
  onClose: () => void;
  onSort?: (direction: "asc" | "desc") => void;
  onHide?: () => void;
  onAutoFit?: () => void;
};

export const RecordTableHeaderContextMenu = ({
  column,
  position,
  onClose,
  onSort,
  onHide,
  onAutoFit,
}: RecordTableHeaderContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const x =
      position.x + rect.width > window.innerWidth
        ? window.innerWidth - rect.width - 8
        : position.x;
    const y =
      position.y + rect.height > window.innerHeight
        ? window.innerHeight - rect.height - 8
        : position.y;
    setAdjustedPosition({ x, y });
  }, [position]);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const menuItems: (MenuItem | MenuSeparator)[] = [];

  if (column.isSortable !== false && onSort) {
    menuItems.push({
      label: "Trier A → Z",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M4 6l4-4 4 4M4 10l4 4 4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
          <path
            d="M4 6l4-4 4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="1"
          />
        </svg>
      ),
      onClick: () => {
        onSort("asc");
        onClose();
      },
    });
    menuItems.push({
      label: "Trier Z → A",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M4 6l4-4 4 4M4 10l4 4 4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
          />
          <path
            d="M4 10l4 4 4-4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="1"
          />
        </svg>
      ),
      onClick: () => {
        onSort("desc");
        onClose();
      },
    });
    menuItems.push({ separator: true });
  }

  if (onAutoFit) {
    menuItems.push({
      label: "Ajuster la largeur",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M2 8h12M2 8l3-3M2 8l3 3M14 8l-3-3M14 8l-3 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      onClick: () => {
        onAutoFit();
        onClose();
      },
    });
  }

  if (onHide) {
    menuItems.push({
      label: "Masquer la colonne",
      icon: (
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 2l12 12" strokeLinecap="round" />
          <path
            d="M4.5 5.5a5.5 5.5 0 007 5M11.5 10.5a5.5 5.5 0 00-7-5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="2" />
        </svg>
      ),
      onClick: () => {
        onHide();
        onClose();
      },
      variant: "danger" as const,
    });
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-9999 min-w-45 py-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-1 duration-150"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      <div className="px-3 py-1.5 text-[0.7rem] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {column.label}
      </div>
      {menuItems.map((item, idx) => {
        if ("separator" in item && item.separator) {
          return (
            <div
              key={idx}
              className="my-1 border-t border-gray-100 dark:border-gray-700"
            />
          );
        }
        const menuItem = item as MenuItem;
        return (
          <button
            key={idx}
            onClick={menuItem.onClick}
            className={`
              w-full flex items-center gap-2 px-3 py-1.5 text-sm
              transition-colors text-left
              ${
                menuItem.variant === "danger"
                  ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }
            `}
          >
            <span className="text-gray-400 dark:text-gray-500">
              {menuItem.icon}
            </span>
            <span>{menuItem.label}</span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
};
