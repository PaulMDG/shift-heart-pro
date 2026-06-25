import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, ShieldAlert } from "lucide-react";
import { useLogCall } from "@/hooks/useCallLog";
import { toast } from "sonner";

type Recipient = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role?: string | null;
  phone?: string | null;
};

export default function CallConfirmDialog({
  open,
  onOpenChange,
  recipient,
  allowed,
  reason,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipient: Recipient | null;
  allowed: boolean;
  reason?: string;
}) {
  const logCall = useLogCall();

  if (!recipient) return null;
  const initials = recipient.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const phone = recipient.phone?.trim() || "";

  const handleConfirm = async () => {
    if (!allowed) {
      toast.error(reason || "You don't have permission to call this contact.");
      return;
    }
    if (!phone) {
      toast.error(`No phone on file for ${recipient.full_name}`);
      return;
    }
    try {
      await logCall.mutateAsync({
        recipientId: recipient.id,
        recipientName: recipient.full_name,
        recipientPhone: phone,
        status: "initiated",
      });
    } catch {
      /* non-blocking */
    }
    onOpenChange(false);
    window.location.href = `tel:${phone}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Place a call?</DialogTitle>
          <DialogDescription>
            This will open your phone dialer and record the call in your history.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-2">
          <Avatar className="w-12 h-12">
            <AvatarImage src={recipient.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/15 text-primary font-semibold">
              {initials || "•"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{recipient.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {phone || "No phone on file"}
              {recipient.role ? ` · ${recipient.role}` : ""}
            </p>
          </div>
        </div>

        {!allowed && (
          <div className="flex gap-2 items-start rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{reason || "You don't have permission to call this contact."}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!allowed || !phone || logCall.isPending}>
            <Phone className="w-4 h-4 mr-1.5" /> Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}