import { useState } from "react";
import { ArrowLeft, Plus, Trash2, ShieldCheck, Loader2, Pencil, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import { useCertifications, useAddCertification, useRemoveCertification, useUpdateCertification } from "@/hooks/useCertifications";

const ProfileCertifications = () => {
  const navigate = useNavigate();
  const { data: certs, isLoading } = useCertifications();
  const addCert = useAddCertification();
  const removeCert = useRemoveCertification();
  const updateCert = useUpdateCertification();
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIssuer, setEditIssuer] = useState("");
  const [editExpiry, setEditExpiry] = useState("");

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Certification name is required"); return; }
    try {
      await addCert.mutateAsync({ name: name.trim(), issuer: issuer.trim(), expiry_date: expiryDate || null });
      setName(""); setIssuer(""); setExpiryDate("");
      toast.success("Certification added!");
    } catch (err: any) {
      toast.error(err.message || "Failed to add");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeCert.mutateAsync(id);
      toast.success("Certification removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove");
    }
  };

  const startEdit = (cert: { id: string; name: string; issuer: string; expiry_date: string | null }) => {
    setEditingId(cert.id);
    setEditName(cert.name);
    setEditIssuer(cert.issuer || "");
    setEditExpiry(cert.expiry_date || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName(""); setEditIssuer(""); setEditExpiry("");
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim()) { toast.error("Certification name is required"); return; }
    try {
      await updateCert.mutateAsync({
        id: editingId,
        name: editName.trim(),
        issuer: editIssuer.trim(),
        expiry_date: editExpiry || null,
      });
      toast.success("Certification updated");
      cancelEdit();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/profile")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Profile
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">Certifications</h2>

        <div className="bg-card rounded-2xl p-4 shadow-card space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-card-foreground">Add Certification</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="certName">Name</Label>
              <Input id="certName" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CNA, CPR, BLS" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="certIssuer">Issuing Organization</Label>
              <Input id="certIssuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="e.g. American Red Cross" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="certExpiry">Expiry Date</Label>
              <Input id="certExpiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <button
              onClick={handleAdd}
              disabled={addCert.isPending}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addCert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Certification
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : !certs?.length ? (
          <div className="text-center py-10">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No certifications added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map((cert) => (
              <div key={cert.id} className="bg-card rounded-2xl p-4 shadow-card">
                {editingId === cert.id ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`edit-name-${cert.id}`}>Name</Label>
                      <Input id={`edit-name-${cert.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`edit-issuer-${cert.id}`}>Issuing Organization</Label>
                      <Input id={`edit-issuer-${cert.id}`} value={editIssuer} onChange={(e) => setEditIssuer(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`edit-expiry-${cert.id}`}>Expiry Date</Label>
                      <Input id={`edit-expiry-${cert.id}`} type="date" value={editExpiry} onChange={(e) => setEditExpiry(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={updateCert.isPending}
                        className="flex-1 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {updateCert.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{cert.name}</p>
                      {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                      {cert.expiry_date && <p className="text-xs text-muted-foreground">Expires: {cert.expiry_date}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(cert)} className="text-primary p-1.5 rounded-lg hover:bg-muted" aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRemove(cert.id)} disabled={removeCert.isPending} className="text-destructive p-1.5 rounded-lg hover:bg-muted" aria-label="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ProfileCertifications;
