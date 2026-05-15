import { cn } from '@/lib/utils';
import { useId } from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: string; // Progress bar and dot color
  gradientColors?: [string, string, string]; // Optional gradient (start, middle, end)
  textColor?: string; // Optional text color override
}

export function ScoreGauge({
  score,
  size = 'sm',
  className,
  color = 'primary',
  gradientColors,
  textColor,
}: ScoreGaugeProps) {
  const gradientId = useId().replace(/:/g, '');
  const sizeClasses = {
    sm: 'w-16 h-7',
    md: 'w-24 h-7',
    lg: 'w-32 h-10',
  };

  // Map color names to CSS variables or hex values
  const getColorValue = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      primary: 'var(--primary)',
      secondary: 'var(--secondary)',
      destructive: 'var(--destructive)',
      muted: 'var(--muted-foreground)',
    };
    // If it's a named color, return the CSS variable, otherwise return as-is (hex/rgb/etc)
    return colorMap[colorName] || colorName;
  };

  const colorValue = getColorValue(color);
  const progressStroke = gradientColors ? `url(#scoreGradient-${gradientId})` : colorValue;
  const dotFill = gradientColors ? gradientColors[1] : colorValue;

  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score));
  
  // Calculate angle for the indicator (0% = 180deg, 100% = 0deg)
  // The arc goes from left (180deg) to right (0deg)
  const angle = 180 - (clampedScore / 100) * 180;
  
  // Calculate position of the dot on the arc
  // Arc path: M 8 47 A 42 42 0 0 1 92 47
  // This is a semi-circle curving upward. The arc endpoints are at y=47.
  // For a semi-circle with radius 42 curving upward from (8,47) to (92,47):
  // - The center of the circle is at (50, 47 - 42) = (50, 5)
  // - Start point (8,47) corresponds to angle 180° (π radians)
  // - End point (92,47) corresponds to angle 0° (0 radians)
  const radius = 42;
  const centerX = 50; // Midpoint of arc endpoints (8+92)/2
  // For the arc M 8 47 A 42 42 0 0 1 92 47 (curving upward)
  // The center is at (50, 47) and the arc is the upper half of the circle
  // At 180°: (8, 47), at 0°: (92, 47), at 90°: (50, 5)
  const centerY = 47; // Same y as endpoints
  const radians = (angle * Math.PI) / 180;
  // Calculate position on the circle - for upward curve, y decreases as angle increases
  const dotX = centerX + radius * Math.cos(radians);
  // For upward curve: y = centerY - radius*sin(angle)
  // At 180°: y = 47 - 42*0 = 47 ✓, at 0°: y = 47 - 42*0 = 47 ✓, at 90°: y = 47 - 42*1 = 5 ✓
  const dotY = centerY - radius * Math.sin(radians);

  return (
    <div className={cn('relative flex items-center justify-center', sizeClasses[size], className)}>
      <svg
        className="absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 100 55"
        preserveAspectRatio="xMidYMid meet"
      >
        {gradientColors && (
          <defs>
            <linearGradient id={`scoreGradient-${gradientId}`} x1="8" y1="47" x2="92" y2="47" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="50%" stopColor={gradientColors[1]} />
              <stop offset="100%" stopColor={gradientColors[2]} />
            </linearGradient>
          </defs>
        )}
        {/* Semi-circular track background - thicker arc */}
        <path
          d="M 8 47 A 42 42 0 0 1 92 47"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* Colored progress arc */}
        {clampedScore >= 0 && (
          <path
            d="M 8 47 A 42 42 0 0 1 92 47"
            fill="none"
            stroke={progressStroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={clampedScore > 0 ? `${(clampedScore / 100) * 131.95} 131.95` : '0 131.95'}
            className="transition-all duration-300"
          />
        )}
        
        {/* Indicator dot - circle positioned exactly on the arc */}
        {clampedScore >= 0 && (
          <circle
            cx={dotX}
            cy={dotY}
            r="3"
            fill={dotFill}
            className="transition-all duration-300"
          />
        )}
      </svg>

      {/* Score text - centered in the semi-circle */}
      <div className="relative z-1 flex flex-col items-center justify-center mt-3">
        <span className="text-[6px] font-medium text-muted-foreground uppercase leading-tight tracking-wider" style={textColor ? { color: textColor } : undefined}>Score</span>
        <span className="text-[9px] font-bold text-muted-foreground leading-tight ml-1" style={textColor ? { color: textColor } : undefined}>{clampedScore}%</span>
      </div>
    </div>
  );
}

