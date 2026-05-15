import { ScoreGauge } from "@/components/ui/score-gauge";
import { Badge } from "@/components/ui/badge";
import { FileX } from "lucide-react";

export function ScoreGaugeCell({
  cv,
  cv_id,
  score,
}: {
  cv?: string | null | undefined;
  cv_id?: string | number | null;
  score?: number | null;
}) {
  // If a numeric score is provided directly, use it
  if (score != null && score >= 0) {
    return (
      <div className="flex justify-center">
        <ScoreGauge score={score} size="sm" />
      </div>
    );
  }

  // Check for "No CV" case (case-insensitive and trimmed)
  if (
    !cv ||
    cv.trim() === "" ||
    cv.trim().toLowerCase() === "no cv"
  ) {
    // If there's a cv_id but no score yet, show a 0% gauge instead of "No CV"
    if (cv_id) {
      return (
        <div className="flex justify-center">
          <ScoreGauge score={0} size="sm" />
        </div>
      );
    }

    return (
      <div className="flex justify-center">
        <Badge
          variant="secondary"
          className="text-[8px] flex items-center gap-1 h-4.5! rounded-sm! bg-[#00000005]! border border-gray-200/60"
        >
          <FileX className="size-2.5!" />
          No CV
        </Badge>
      </div>
    );
  }

  // Check if CV value contains "SCORE" - if yes, show gauge even for 0%
  if (cv.toUpperCase().includes("SCORE")) {
    const scoreMatch = cv.match(/(\d+)%/);
    const parsedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;

    return (
      <div className="flex justify-center">
        <ScoreGauge score={parsedScore} size="sm" />
      </div>
    );
  }

  // If no "SCORE" found, show "No CV" badge
  return (
    <div className="flex justify-center">
      <Badge
        variant="secondary"
        className="text-[8px] flex items-center gap-1 h-4.5! rounded-sm! bg-[#00000005]! border border-gray-200/60"
      >
        <FileX className="size-2.5!" />
        No CV
      </Badge>
    </div>
  );
}
