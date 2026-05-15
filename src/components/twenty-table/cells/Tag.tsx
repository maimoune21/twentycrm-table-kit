/**
 * Tag component — matches Twenty CRM's Tag.tsx exactly
 * Height: 20px (spacing[5]), font: 1rem (md), border-radius: 4px (sm), padding: 0 8px
 */

type TagColor =
  | "green"
  | "red"
  | "blue"
  | "yellow"
  | "purple"
  | "orange"
  | "gray"
  | "turquoise"
  | "pink"
  | "transparent";

type TagVariant = "solid" | "outline" | "border";

type TagProps = {
  text: string;
  color?: TagColor;
  variant?: TagVariant;
  preventShrink?: boolean;
  className?: string;
  onClick?: () => void;
};

const TAG_COLORS: Record<
  Exclude<TagColor, "transparent">,
  {
    solid: { bg: string; text: string };
    outline: { border: string; text: string };
  }
> = {
  green: {
    solid: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-400",
    },
    outline: {
      border: "border-emerald-300 dark:border-emerald-700",
      text: "text-emerald-700 dark:text-emerald-400",
    },
  },
  red: {
    solid: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-400",
    },
    outline: {
      border: "border-red-300 dark:border-red-700",
      text: "text-red-700 dark:text-red-400",
    },
  },
  blue: {
    solid: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      text: "text-blue-700 dark:text-blue-400",
    },
    outline: {
      border: "border-blue-300 dark:border-blue-700",
      text: "text-blue-700 dark:text-blue-400",
    },
  },
  yellow: {
    solid: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-400",
    },
    outline: {
      border: "border-amber-300 dark:border-amber-700",
      text: "text-amber-700 dark:text-amber-400",
    },
  },
  purple: {
    solid: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      text: "text-purple-700 dark:text-purple-400",
    },
    outline: {
      border: "border-purple-300 dark:border-purple-700",
      text: "text-purple-700 dark:text-purple-400",
    },
  },
  orange: {
    solid: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      text: "text-orange-700 dark:text-orange-400",
    },
    outline: {
      border: "border-orange-300 dark:border-orange-700",
      text: "text-orange-700 dark:text-orange-400",
    },
  },
  gray: {
    solid: {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-300",
    },
    outline: {
      border: "border-gray-300 dark:border-gray-600",
      text: "text-gray-600 dark:text-gray-300",
    },
  },
  turquoise: {
    solid: {
      bg: "bg-teal-100 dark:bg-teal-900/30",
      text: "text-teal-700 dark:text-teal-400",
    },
    outline: {
      border: "border-teal-300 dark:border-teal-700",
      text: "text-teal-700 dark:text-teal-400",
    },
  },
  pink: {
    solid: {
      bg: "bg-pink-100 dark:bg-pink-900/30",
      text: "text-pink-700 dark:text-pink-400",
    },
    outline: {
      border: "border-pink-300 dark:border-pink-700",
      text: "text-pink-700 dark:text-pink-400",
    },
  },
};

export const Tag = ({
  text,
  color = "gray",
  variant = "solid",
  preventShrink = false,
  className = "",
  onClick,
}: TagProps) => {
  // Twenty: h-5 (20px), rounded (4px), font-size md (1rem), px-2 (8px), gap-1 (4px)
  const base = `inline-flex items-center h-5 gap-1 rounded-md! overflow-hidden whitespace-nowrap text-[10.5px] font-medium bg-[#00000005]! border border-gray-200 text-gray-500! rounded-xl ${preventShrink ? "min-w-fit shrink-0" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`;

  if (color === "transparent") {
    return (
      <span
        onClick={onClick}
        className={`${base} text-gray-500 dark:text-gray-400`}
      >
        <span className="overflow-hidden text-ellipsis">{text}</span>
      </span>
    );
  }

  const palette = TAG_COLORS[color] ?? TAG_COLORS.gray;

  if (variant === "outline" || variant === "border") {
    const borderStyle = variant === "border" ? "border-solid" : "border-dashed";
    return (
      <span
        onClick={onClick}
        className={`${base} px-2 border ${borderStyle} ${palette.outline.border} ${palette.outline.text}`}
      >
        <span className="overflow-hidden text-ellipsis">{text}</span>
      </span>
    );
  }

  return (
    <span
      onClick={onClick}
      className={`${base} px-2 ${palette.solid.bg} ${palette.solid.text}`}
    >
      <span className="overflow-hidden text-ellipsis">{text}</span>
    </span>
  );
};
