import {
  Smartphone,
  Monitor,
  HelpCircle,
  KeyRound,
  Shield,
  Cog,
} from "lucide-react";

const SOURCE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; ring: string; Icon: React.FC }
> = {
  web: {
    label: "",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-500/25",
    Icon: () => <Monitor className="w-3 h-3" />,
  },
  mobile: {
    label: "",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-500/25",
    Icon: () => <Smartphone className="w-3 h-3" />,
  },
  orange: {
    label: "",
    bg: "bg-gray-50 dark:bg-gray-950/40",
    text: "text-gray-700 dark:text-gray-300",
    ring: "ring-gray-500/25",
    Icon: () => (
      <img
        src="/media/app/Orange_logo.svg"
        alt="Orange"
        className="size-3 rounded-xs!"
      />
    ),
  },
  google: {
    label: "",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-500/25",
    Icon: () => (
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 11h8.533c.044.385.067.784.067 1.196C20.6 16.975 17.107 20 12 20a8 8 0 110-16c2.149 0 4.113.851 5.549 2.233l-2.28 2.28A4.75 4.75 0 0012 7.25 4.75 4.75 0 007.25 12 4.75 4.75 0 0012 16.75c2.48 0 4.007-1.374 4.468-3.25H12V11z" />
      </svg>
    ),
  },
  otp: {
    label: "OTP",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-300",
    ring: "ring-gray-400/30",
    Icon: () => <KeyRound className="w-3 h-3" />,
  },
  admin: {
    label: "Admin",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/25",
    Icon: () => <Shield className="w-3 h-3" />,
  },
};

const UNKNOWN_CONFIG = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-500 dark:text-gray-400",
  ring: "ring-gray-300/25",
  Icon: () => <HelpCircle className="w-3 h-3" />,
};

const ADMIN_FORM_CONFIG = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-600 dark:text-gray-300",
  ring: "ring-gray-400/30",
  Icon: () => <Cog className="w-3 h-3" />,
};

interface LoginSourceCellProps {
  record: Record<string, any>;
}

export function LoginSourceCell({ record }: LoginSourceCellProps) {
  if (!record) return <span className="flex items-center justify-center h-5 max-w-full overflow-hidden whitespace-nowrap text-[11.5px] text-gray-300 dark:text-gray-500 w-full ">—</span>;

  const rawSource = String(
    record.loginSource ||
      record.login_source ||
      record?._raw?.login_source ||
      record?.raw?.login_source ||
      record?._raw?.user?.login_source ||
      record?.raw?.user?.login_source ||
      record?.user?.login_source ||
      "",
  )
    .toLowerCase()
    .trim();
  const rawMethod = String(
    record.authMethod ||
      record.auth_method ||
      record?._raw?.auth_method ||
      record?.raw?.auth_method ||
      record?._raw?.user?.auth_method ||
      record?.raw?.user?.auth_method ||
      record?.user?.auth_method ||
      "",
  )
    .toLowerCase()
    .trim();

  const sourceKey = rawSource || "";
  const isAdminForm = sourceKey === "admin" && rawMethod === "form";
  const config = isAdminForm
    ? ADMIN_FORM_CONFIG
    : (SOURCE_CONFIG[sourceKey] ?? UNKNOWN_CONFIG);

  if (!sourceKey) {
      return <span className="flex items-center justify-center h-5 max-w-full overflow-hidden whitespace-nowrap text-[11.5px] text-gray-300 dark:text-gray-500 w-full ">—</span>;
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium ring-1 ring-inset ${config.bg} ${config.text} ${config.ring}`}
      >
        <config.Icon />
        {/* {label} */}
      </span>
    </div>
  );
}
