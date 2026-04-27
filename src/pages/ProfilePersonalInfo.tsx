import { useState, useEffect } from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import MobileLayout from "@/components/layout/MobileLayout";

const ProfilePersonalInfo = () => {
  const navigate = useNavigate();
  const { data: profile, isLoading, refetch } = useProfile();
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    date_of_birth: "",
    bio: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    certifications: "",
    availability_notes: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: (profile as any).address || "",
        date_of_birth: (profile as any).date_of_birth || "",
        bio: (profile as any).bio || "",
        emergency_contact_name: (profile as any).emergency_contact_name || "",
        emergency_contact_phone: (profile as any).emergency_contact_phone || "",
        certifications: (profile as any).certifications || "",
        availability_notes: (profile as any).availability_notes || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          date_of_birth: form.date_of_birth || null,
          bio: form.bio.trim() || null,
          emergency_contact_name: form.emergency_contact_name.trim() || null,
          emergency_contact_phone: form.emergency_contact_phone.trim() || null,
          certifications: form.certifications.trim() || null,
          availability_notes: form.availability_notes.trim() || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id);
      if (error) throw error;

      await refetch();
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/profile")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">Personal Information</h2>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" value={form.full_name} onChange={set("full_name")} placeholder="Your full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">Email is managed by your administrator and can't be changed here.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Home Address</Label>
              <Input id="address" value={form.address} onChange={set("address")} placeholder="123 Main St, City" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea id="bio" value={form.bio} onChange={set("bio")} placeholder="Tell us a bit about yourself" rows={3} />
            </div>

            <div className="pt-3 border-t border-border">
              <h3 className="text-sm font-bold text-foreground mb-3">Emergency Contact</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="ec_name">Contact Name</Label>
                  <Input id="ec_name" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ec_phone">Contact Phone</Label>
                  <Input id="ec_phone" type="tel" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} placeholder="+1 (555) 123-4567" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-3">
              <div className="space-y-2">
                <Label htmlFor="certs">Certifications</Label>
                <Textarea id="certs" value={form.certifications} onChange={set("certifications")} placeholder="CPR, First Aid, CNA…" rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avail">Availability Notes</Label>
                <Textarea id="avail" value={form.availability_notes} onChange={set("availability_notes")} placeholder="Weekday evenings, no Sundays…" rows={2} />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3.5 rounded-2xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ProfilePersonalInfo;
