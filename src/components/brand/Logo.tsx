import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the wordmark next to the icon */
  showWordmark?: boolean;
  /** Stack the wordmark under the icon */
  stacked?: boolean;
  /** Tailwind text size for the wordmark */
  wordmarkClassName?: string;
}

/**
 * Angels of Comfort brand mark — a stylised gold figure
 * (head dot + arched body) rendered as inline SVG so it
 * scales crisply and inherits colour from `currentColor`.
 */
export const LogoMark = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 64 80"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("text-primary", className)}
    aria-hidden="true"
  >
    <circle cx="32" cy="10" r="6" fill="currentColor" />
    <path
      d="M32 18 C 24 28, 14 42, 18 64 C 20 72, 26 76, 32 76"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M32 18 C 40 28, 50 42, 46 64 C 44 72, 38 76, 32 76"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const Logo = ({
  className,
  showWordmark = true,
  stacked = false,
  wordmarkClassName,
}: LogoProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-3",
        stacked && "flex-col gap-2",
        className,
      )}
    >
      <LogoMark className={cn("h-10 w-auto", stacked && "h-14")} />
      {showWordmark && (
        <div className={cn("flex flex-col leading-none", stacked && "items-center")}>
          <span
            className={cn(
              "font-display font-semibold tracking-[0.18em] text-foreground uppercase",
              wordmarkClassName ?? "text-xl",
            )}
          >
            Angels
          </span>
          <span className="text-[0.6rem] tracking-[0.32em] text-muted-foreground uppercase mt-1">
            of Comfort
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;