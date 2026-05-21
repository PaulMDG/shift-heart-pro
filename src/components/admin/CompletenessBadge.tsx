import { CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CompletenessResult } from "@/lib/profileCompleteness";
import { statusMeta } from "@/lib/profileCompleteness";

interface Props {
  result: CompletenessResult;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const iconFor = {
  green: CheckCircle2,
  yellow: AlertCircle,
  red: AlertTriangle,
} as const;

const CompletenessBadge = ({ result, size = "sm", showLabel = true }: Props) => {
  const meta = statusMeta(result.status);
  const Icon = iconFor[result.status];
  const detail =
    result.blocking.length > 0
      ? [`Blocking: ${result.blocking.join(", ")}`, result.missing.length ? `Also missing: ${result.missing.join(", ")}` : ""].filter(Boolean).join(" — ")
      : result.missing.length > 0
        ? `Missing: ${result.missing.join(", ")}`
        : "All required fields & documents on file.";

  const cls =
    size === "sm"
      ? "text-[10px] px-1.5 py-0.5 gap-1"
      : "text-xs px-2 py-1 gap-1.5";

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center rounded-full border font-semibold ${meta.className} ${cls}`}
            aria-label={`${meta.label}: ${detail}`}
          >
            <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
            {showLabel && <span>{meta.label}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-semibold mb-0.5">{meta.label}</p>
          <p className="text-xs leading-relaxed">{detail}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CompletenessBadge;