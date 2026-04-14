import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone, Mail, Pencil, Save, X, Loader2, Camera } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

interface CaregiverDetailSheetProps {
  caregiver: any;
  open: boolean;
  onClose: () => void;
}

const CaregiverDetailSheet = ({ caregiver, open, onClose }: CaregiverDetailSheetProps) => {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (updates: { full_name: string; phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: updates.full_name, phone: updates.phone || null })
        .eq("id", caregiver.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-caregivers"] });
      toast.success("Caregiver profile updated");
      setEditing(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${caregiver.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", caregiver.id);
      if (updateError) throw updateError;

      qc.invalidateQueries({ queryKey: ["admin-caregivers"] });
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const startEditing = () => {
    setFullName(caregiver.full_name || "");
    setPhone(caregiver.phone || "");
    setEditing(true);
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    updateProfile.mutate({ full_name: fullName.trim(), phone: phone.trim() });
  };

  if (!caregiver) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setEditing(false); onClose(); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Caregiver Profile</SheetTitle>
            {!editing ? (
              <button onClick={startEditing} className="p-2 rounded-xl bg-accent hover:bg-accent/80 transition-colors">
                <Pencil className="w-4 h-4 text-accent-foreground" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={handleSave} disabled={updateProfile.isPending} className="p-2 rounded-xl gradient-primary transition-colors">
                  {updateProfile.isPending ? <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" /> : <Save className="w-4 h-4 text-primary-foreground" />}
                </button>
              </div>
            )}
          </div>
        </SheetHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              {caregiver.avatar_url ? (
                <img src={caregiver.avatar_url} alt={caregiver.full_name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">
                    {(caregiver.full_name || "?")[0].toUpperCase()}
                  </span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 text-sm" />
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-bold text-foreground text-lg">{caregiver.full_name || "Unnamed"}</h3>
                  {caregiver.role && (
                    <Badge variant={caregiver.role === "admin" ? "destructive" : "secondary"} className="mt-1">
                      {caregiver.role}
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
            {editing ? (
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" className="h-9 text-sm" />
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CaregiverDetailSheet;
