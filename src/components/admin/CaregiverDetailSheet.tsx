import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail } from "lucide-react";

interface CaregiverDetailSheetProps {
  caregiver: any;
  open: boolean;
  onClose: () => void;
}

const CaregiverDetailSheet = ({ caregiver, open, onClose }: CaregiverDetailSheetProps) => {
  if (!caregiver) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">Caregiver Profile</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {caregiver.avatar_url ? (
              <img src={caregiver.avatar_url} alt={caregiver.full_name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">
                  {(caregiver.full_name || "?")[0].toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-foreground text-lg">{caregiver.full_name || "Unnamed"}</h3>
              {caregiver.role && (
                <Badge variant={caregiver.role === "admin" ? "destructive" : "secondary"} className="mt-1">
                  {caregiver.role}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{caregiver.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">ID: {caregiver.id.slice(0, 8)}…</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Joined {new Date(caregiver.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CaregiverDetailSheet;
