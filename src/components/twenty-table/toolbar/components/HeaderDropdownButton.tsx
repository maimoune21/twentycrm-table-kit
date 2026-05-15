type HeaderDropdownButtonProps = {
  label: string;
  isActive?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
};

/**
 * Matches Twenty's StyledHeaderDropdownButton — used for Filter, Sort, Options buttons.
 */
export const HeaderDropdownButton = ({
  label,
  isActive,
  isOpen,
  onClick,
}: HeaderDropdownButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center px-2 py-1 rounded-sm text-[0.8125rem] font-medium
        cursor-pointer select-none border-none transition-colors
        ${
          isActive
            ? "text-blue-600 dark:text-blue-400"
            : "text-gray-500 dark:text-gray-400"
        }
        ${
          isOpen
            ? "bg-gray-100 dark:bg-gray-800"
            : "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
        }
      `}
    >
      {label}
    </button>
  );
};
