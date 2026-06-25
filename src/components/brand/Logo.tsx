import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Show the full logo with wordmark. When false, only the icon mark is shown. */
  showWordmark?: boolean;
  /** Stack layout (taller display) */
  stacked?: boolean;
  /** @deprecated retained for API compatibility */
  wordmarkClassName?: string;
}

/**
 * Icon-only mark cropped from the top of the full logo image.
 * Uses object-position to show just the gold figure portion.
 */
export const LogoMark = ({ className }: { className?: string }) => (
  <div
    role="img"
    aria-label="Angels of Comfort"
    className={cn("inline-block bg-no-repeat bg-center", className)}
    style={{
      backgroundImage: `url(/logo.png)`,
      // Source image ~1700x1144; icon mark occupies roughly top ~42% height,
      // centered horizontally over ~20% of the width. Scale the background so
      // the icon fills the square container and position to the top.
      backgroundSize: "500% auto",
      backgroundPosition: "center -2%",
      aspectRatio: "1 / 1",
    }}
  />
);

const Logo = ({ className, showWordmark = true, stacked = false }: LogoProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src={logoAsset.url}
        alt="Angels of Comfort Home Care"
        className={cn(
          "object-contain w-auto",
          showWordmark ? (stacked ? "h-44" : "h-28") : "h-12",
        )}
      />
    </div>
  );
};

export default Logo;