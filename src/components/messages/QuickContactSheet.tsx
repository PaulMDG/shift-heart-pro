import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Phone, Mail, FileText, MessageCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface QuickContact {
  id: string;
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
const QuickContactSheet = ({ contact, open, onClose }: Props) => {
  const navigate = useNavigate();
  if (!contact) return null;

  const hasPhone = !!contact.phone?.trim();
  const hasEmail = !!contact.email?.trim();
  const hasDocs = !!contact.documentsUrl?.trim();
  const anyDetail = hasPhone || hasEmail;

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
      label: "Send message",
      sub: hasEmail
        ? (contact.email as string)
        : "Opens in-app chat",
      icon: hasEmail ? Mail : MessageCircle,
      enabled: hasEmail || true,
      onClick: () => {
        onClose();
        if (hasEmail) {
          window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(
            `[Caregiver] ${contact.label}`,
          )}`;
        } else {
          navigate("/messages/new");
        }
      },
      tone: "neutral",
    },
  ];

  if (contact.id === "agency") {
    actions.push({
      key: "documents",
      label: "View documents",
      sub: hasDocs ? "Open agency documents" : "Caregiver documents",
      icon: FileText,
      enabled: true,
      onClick: () => {
        onClose();
        if (hasDocs) {
          window.open(contact.documentsUrl as string, "_blank", "noopener,noreferrer");
        } else {
          navigate("/profile");
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

        {!anyDetail && contact.id !== "agency" && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/30 p-3">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">
              No contact details published yet. Ask your admin to add a phone
              or email for this role in <strong>Settings → Quick Contacts</strong>.
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