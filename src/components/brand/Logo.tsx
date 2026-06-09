import { cn } from "@/lib/utils";
import logoAsset from "@/assets/angels-of-comfort-logo.png.asset.json";

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
    className={cn("overflow-hidden inline-block", className)}
    aria-hidden="true"
    style={{ aspectRatio: "1 / 1" }}
  >
    <img
      src={logoAsset.url}
      alt=""
      className="h-[260%] w-auto max-w-none object-contain"
      style={{ objectPosition: "center top", marginLeft: "-30%" }}
    />
  </div>
);

const Logo = ({ className, showWordmark = true, stacked = false }: LogoProps) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <img
        src={logoAsset.url}
        alt="Angels of Comfort Home Care"
        className={cn(
          "object-contain w-auto",
          showWordmark ? (stacked ? "h-36" : "h-24") : "h-10",
        )}
      />
    </div>
  );
};

export default Logo;