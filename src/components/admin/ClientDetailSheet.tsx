import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MapPin, Phone, AlertTriangle, FileText } from "lucide-react";

interface ClientDetailSheetProps {
  client: any;
  open: boolean;
  onClose: () => void;
}

const ClientDetailSheet = ({ client, open, onClose }: ClientDetailSheetProps) => {
  if (!client) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">Client Profile</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-foreground text-lg">{client.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">{client.care_type}</span>
          </div>

          <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-sm text-foreground">{client.address || "No address"}</span>
            </div>
            {client.care_plan_summary && (
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-foreground">{client.care_plan_summary}</span>
              </div>
            )}
          </div>

          {(client.emergency_contact || client.emergency_phone) && (
            <div className="space-y-2 bg-destructive/5 rounded-2xl p-4 border border-destructive/20">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Emergency Contact
              </h4>
              {client.emergency_contact && (
                <p className="text-sm text-foreground">{client.emergency_contact}</p>
              )}
              {client.emergency_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm text-foreground">{client.emergency_phone}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientDetailSheet;
