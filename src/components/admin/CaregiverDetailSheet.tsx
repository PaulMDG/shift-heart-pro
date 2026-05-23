import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Phone, Mail, Pencil, Save, X, Loader2, Camera, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useDeleteCaregiver } from "@/hooks/useAdmin";
import CompletenessBadge from "@/components/admin/CompletenessBadge";
import { useCaregiverDocuments } from "@/hooks/useComplianceDocuments";
import { evaluateCaregiverCompleteness } from "@/lib/profileCompleteness";

interface CaregiverDetailSheetProps {
  caregiver: any;
  open: boolean;
  onClose: () => void;
}

const CaregiverDetailSheet = ({ caregiver, open, onClose }: CaregiverDetailSheetProps) => {
  const [editing, setEditing] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ssnLast4, setSsnLast4] = useState("");
  const [govIdNumber, setGovIdNumber] = useState("");
  const [govIdState, setGovIdState] = useState("");
  const [dlNumber, setDlNumber] = useState("");
  const [dlState, setDlState] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [position, setPosition] = useState("");
  const [payRate, setPayRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [taxFormStatus, setTaxFormStatus] = useState("");
  const [directDeposit, setDirectDeposit] = useState(false);
  const [activeStatus, setActiveStatus] = useState(true);
  const [skillsText, setSkillsText] = useState("");
  const [availabilityNotes, setAvailabilityNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const deleteCaregiver = useDeleteCaregiver();
  const { data: docs } = useCaregiverDocuments(caregiver?.id);
  const completeness = caregiver
    ? evaluateCaregiverCompleteness(caregiver, docs ?? [])
    : null;

  const updateProfile = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
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

  // Auto-populate form fields when caregiver changes
  const resetForm = () => {
    setFullName(caregiver?.full_name || "");
    setPhone(caregiver?.phone || "");
    setSsnLast4(caregiver?.ssn_last4 || "");
    setGovIdNumber(caregiver?.government_id_number || "");
    setGovIdState(caregiver?.government_id_state || "");
    setDlNumber(caregiver?.drivers_license_number || "");
    setDlState(caregiver?.drivers_license_state || "");
    setAddress(caregiver?.address || "");
    setDateOfBirth(caregiver?.date_of_birth || "");
    setEmergencyContactName(caregiver?.emergency_contact_name || "");
    setEmergencyContactPhone(caregiver?.emergency_contact_phone || "");
    setEmploymentType(caregiver?.employment_type || "");
    setPosition(caregiver?.position || "");
    setPayRate(caregiver?.pay_rate != null ? String(caregiver.pay_rate) : "");
    setStartDate(caregiver?.start_date || "");
    setTaxFormStatus(caregiver?.tax_form_status || "");
    setDirectDeposit(Boolean(caregiver?.direct_deposit_on_file));
    setActiveStatus(caregiver?.active_status !== false);
    const sa = caregiver?.skills_availability || {};
    setSkillsText(Array.isArray(sa.skills) ? sa.skills.join(", ") : (sa.skills || ""));
    setAvailabilityNotes(sa.availability || caregiver?.availability_notes || "");
  };

  const handleSave = () => {
    if (!fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    updateProfile.mutate({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      ssn_last4: ssnLast4.trim() || null,
      government_id_number: govIdNumber.trim() || null,
      government_id_state: govIdState.trim() || null,
      drivers_license_number: dlNumber.trim() || null,
      drivers_license_state: dlState.trim() || null,
      date_of_birth: dateOfBirth || null,
      emergency_contact_name: emergencyContactName.trim() || null,
      emergency_contact_phone: emergencyContactPhone.trim() || null,
      employment_type: employmentType || null,
      position: position.trim() || null,
      pay_rate: payRate.trim() ? Number(payRate) : null,
      start_date: startDate || null,
      tax_form_status: taxFormStatus || null,
      direct_deposit_on_file: directDeposit,
      active_status: activeStatus,
      availability_notes: availabilityNotes.trim() || null,
      skills_availability: {
        skills: skillsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        availability: availabilityNotes.trim() || null,
      },
    });
  };

  const handleDelete = async () => {
    try {
      await deleteCaregiver.mutateAsync(caregiver.id);
      toast.success("User deleted");
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!caregiver) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setEditing(true); onClose(); } else { resetForm(); } }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto max-w-lg mx-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">Caregiver Profile</SheetTitle>
            {completeness && (
              <div className="ml-2"><CompletenessBadge result={completeness} size="md" /></div>
            )}
            {!editing ? (
              <button onClick={() => { resetForm(); setEditing(true); }} className="p-2 rounded-xl bg-accent hover:bg-accent/80 transition-colors">
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

          {/* Biodata Section */}
          <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
            <h4 className="text-sm font-semibold text-foreground">Identification & Biodata</h4>
            {editing ? (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Home address" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">SSN (Last 4 digits)</Label>
                  <Input value={ssnLast4} onChange={(e) => setSsnLast4(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1234" maxLength={4} className="h-9 text-sm" />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Gov. ID Number</Label>
                    <Input value={govIdNumber} onChange={(e) => setGovIdNumber(e.target.value)} placeholder="State ID #" className="h-9 text-sm" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <Input value={govIdState} onChange={(e) => setGovIdState(e.target.value.toUpperCase().slice(0, 2))} placeholder="NY" maxLength={2} className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Driver's License #</Label>
                    <Input value={dlNumber} onChange={(e) => setDlNumber(e.target.value)} placeholder="DL number" className="h-9 text-sm" />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">State</Label>
                    <Input value={dlState} onChange={(e) => setDlState(e.target.value.toUpperCase().slice(0, 2))} placeholder="NY" maxLength={2} className="h-9 text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="h-9 text-sm" />
                </div>
              </>
            ) : (
              <>
                {caregiver.address && <p className="text-xs text-muted-foreground">📍 {caregiver.address}</p>}
                {caregiver.ssn_last4 && <p className="text-xs text-muted-foreground">SSN: •••{caregiver.ssn_last4}</p>}
                {caregiver.government_id_number && <p className="text-xs text-muted-foreground">Gov ID: {caregiver.government_id_number} ({caregiver.government_id_state})</p>}
                {caregiver.drivers_license_number && <p className="text-xs text-muted-foreground">DL: {caregiver.drivers_license_number} ({caregiver.drivers_license_state})</p>}
                {!caregiver.ssn_last4 && !caregiver.government_id_number && !caregiver.drivers_license_number && (
                  <p className="text-xs text-muted-foreground italic">No identification on file</p>
                )}
              </>
            )}
          </div>

          {/* Emergency Contact */}
          {editing && (
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground">Emergency Contact</h4>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Name</Label>
                <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>
          )}

          {/* Employment & Payroll */}
          {editing && (
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground">Employment & Payroll</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Employment Type</Label>
                  <Select value={employmentType || undefined} onValueChange={setEmploymentType}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="w2">W-2 Employee</SelectItem>
                      <SelectItem value="1099">1099 Contractor</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                      <SelectItem value="full_time">Full-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Position</Label>
                  <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="CNA, HHA…" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Pay Rate ($/hr)</Label>
                  <Input type="number" step="0.01" value={payRate} onChange={(e) => setPayRate(e.target.value)} placeholder="20.00" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tax Form Status</Label>
                  <Select value={taxFormStatus || undefined} onValueChange={setTaxFormStatus}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="w4_on_file">W-4 on file</SelectItem>
                      <SelectItem value="w9_on_file">W-9 on file</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox id="dd" checked={directDeposit} onCheckedChange={(v) => setDirectDeposit(Boolean(v))} />
                  <Label htmlFor="dd" className="text-xs">Direct deposit on file</Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="active" checked={activeStatus} onCheckedChange={(v) => setActiveStatus(Boolean(v))} />
                <Label htmlFor="active" className="text-xs">Active (schedulable)</Label>
              </div>
            </div>
          )}

          {/* Skills & Availability */}
          {editing && (
            <div className="space-y-3 bg-card rounded-2xl p-4 border border-border">
              <h4 className="text-sm font-semibold text-foreground">Skills & Availability</h4>
              <div>
                <Label className="text-xs text-muted-foreground">Skills (comma separated)</Label>
                <Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="Dementia care, Hoyer lift, Medication mgmt" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Availability Notes</Label>
                <Textarea value={availabilityNotes} onChange={(e) => setAvailabilityNotes(e.target.value)} placeholder="Weekday mornings, no weekends…" className="text-sm min-h-[60px]" />
              </div>
            </div>
          )}

          {/* Delete Button */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full py-3 rounded-2xl border border-destructive/30 text-destructive text-sm font-semibold flex items-center justify-center gap-2 hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete User
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-destructive font-semibold text-center">This will permanently delete this user. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-foreground">Cancel</button>
                <button onClick={handleDelete} disabled={deleteCaregiver.isPending} className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold disabled:opacity-50">
                  {deleteCaregiver.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CaregiverDetailSheet;
