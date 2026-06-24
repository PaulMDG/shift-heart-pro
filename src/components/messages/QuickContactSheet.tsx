import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Phone,
  Mail,
  FileText,
  MessageCircle,
  AlertTriangle,
  CalendarClock,
  Stethoscope,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface QuickContact {
  id: "agency" | "scheduler" | "clinical" | "family" | string;
  label: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Optional URL for the "View documents" action (Agency contact only). */
  documentsUrl?: string | null;
}

interface Props {
  contact: QuickContact | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet shown when a Quick Contact tile is tapped on the Messages
 * screen. Surfaces phone (`tel:`), email (`mailto:`), and an in-app message
 * shortcut, with disabled states when the agency hasn't published a detail.
 */
/** Per-contact "View documents" destination mapping. */
function documentsDestination(id: string, documentsUrl?: string | null) {
  const url = documentsUrl?.trim() || null;
  switch (id) {
    case "agency":
      return {
        label: "View documents",
        sub: url ? "Open agency documents" : "Your caregiver documents",
        icon: FileText,
        target: url ?? "/profile",
        external: !!url,
      };
    case "scheduler":
      return {
        label: "View schedule",
        sub: "Open My Day & swaps",
        icon: CalendarClock,
        target: "/shifts",
        external: false,
      };
    case "clinical":
      return {
        label: "Care plans & clinical notes",
        sub: "Open client documents",
        icon: Stethoscope,
        target: "/profile",
        external: false,
      };
    case "family":
      return {
        label: "Family handoffs",
        sub: "Open family conversations",
        icon: Users,
        target: "/messages?category=family",
        external: false,
      };
    default:
      return null;
  }
}

const QuickContactSheet = ({ contact, open, onClose }: Props) => {
  const navigate = useNavigate();
  if (!contact) return null;

  const hasPhone = !!contact.phone?.trim();
  const hasEmail = !!contact.email?.trim();
  const anyDetail = hasPhone || hasEmail;

  // Per-contact in-app chat fallback (always available so the caregiver can
  // start a thread even before admin publishes a phone/email).
  const inAppDestination = `/messages/new?context=${encodeURIComponent(contact.id)}`;

  const docs = documentsDestination(contact.id, contact.documentsUrl);

  const actions: Array<{
    key: string;
    label: string;
    sub: string;
    icon: any;
    enabled: boolean;
    onClick?: () => void;
    href?: string;
    tone: "primary" | "neutral";
  }> = [
    {
      key: "call",
      label: "Call",
      sub: hasPhone ? (contact.phone as string) : "No phone on file",
      icon: Phone,
      enabled: hasPhone,
      href: hasPhone ? `tel:${contact.phone}` : undefined,
      tone: "primary",
    },
    {
      key: "message",
      label: "Send in-app message",
      sub: `Start a thread with ${contact.label}`,
      icon: MessageCircle,
      enabled: true,
      onClick: () => {
        onClose();
        navigate(inAppDestination);
      },
      tone: "neutral",
    },
  ];

  if (hasEmail) {
    actions.push({
      key: "email",
      label: "Email",
      sub: contact.email as string,
      icon: Mail,
      enabled: true,
      href: `mailto:${contact.email}?subject=${encodeURIComponent(`[Caregiver] ${contact.label}`)}`,
      tone: "neutral",
    });
  }

  if (docs) {
    actions.push({
      key: "documents",
      label: docs.label,
      sub: docs.sub,
      icon: docs.icon,
      enabled: true,
      onClick: () => {
        onClose();
        if (docs.external) {
          window.open(docs.target, "_blank", "noopener,noreferrer");
        } else {
          navigate(docs.target);
        }
      },
      tone: "neutral",
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="bg-surface text-surface-foreground rounded-t-3xl border-[hsl(var(--ivory-border))] max-w-lg mx-auto"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-2xl">{contact.label}</SheetTitle>
          {contact.name && (
            <p className="text-sm text-muted-foreground">{contact.name}</p>
          )}
        </SheetHeader>

        {!anyDetail && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              No phone or email published yet — you can still start an in-app
              message below. Ask your admin to add direct contact details
              under <strong>Settings → Quick Contacts</strong>.
            </p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {actions.map((a) => {
            const inner = (
              <>
                <span
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
                    a.tone === "primary"
                      ? "gradient-cta text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <a.icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block text-sm font-semibold">{a.label}</span>
                  <span className="block text-xs text-muted-foreground truncate">
                    {a.sub}
                  </span>
                </span>
              </>
            );
            const baseCls =
              "w-full min-h-[56px] flex items-center gap-3 p-3 rounded-2xl border border-[hsl(var(--ivory-border))] bg-surface focus-ring transition-colors hover:border-primary/40 disabled:opacity-50";
            if (a.href && a.enabled) {
              return (
                <a key={a.key} href={a.href} className={baseCls} onClick={onClose}>
                  {inner}
                </a>
              );
            }
            return (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                disabled={!a.enabled}
                className={baseCls}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickContactSheet;