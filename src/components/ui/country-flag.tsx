import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CountryFlagProps = {
  countryCode?: string | null;
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
  radius?: number;
  className?: string;
  imgClassName?: string;
  iconClassName?: string;
};

export function CountryFlag({
  countryCode,
  src,
  alt = "flag",
  width = 14,
  height = 9,
  radius = 3,
  className,
  imgClassName,
  iconClassName,
}: CountryFlagProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const roundedClassRegex = /(^|\s)rounded(?:-[^\s]+)?!?($|\s)/;
  const hasRoundedOverride = roundedClassRegex.test(
    `${className ?? ""} ${imgClassName ?? ""} ${iconClassName ?? ""}`,
  );

  useEffect(() => {
    setImgFailed(false);
  }, [src]);

  const code = String(countryCode || "")
    .trim()
    .toLowerCase();

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={alt}
        style={{
          width,
          height,
          ...(hasRoundedOverride ? {} : { borderRadius: radius }),
        }}
        className={cn(
          "inline-block shrink-0 align-middle object-cover",
          className,
          imgClassName,
        )}
        onError={() => setImgFailed(true)}
      />
    );
  }

  if (code) {
    return (
      <span
        aria-label={alt}
        style={{
          width,
          height,
          ...(hasRoundedOverride ? {} : { borderRadius: radius }),
          fontSize: `${height}px`,
        }}
        className={cn(
          `fi fi-${code}`,
          "inline-block shrink-0 align-middle bg-center bg-cover",
          className,
          iconClassName,
        )}
      />
    );
  }

  return null;
}
