import { useState } from "react";
import { ArrowLeft, Plus, Trash2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import MobileLayout from "@/components/layout/MobileLayout";

interface Certification {
  id: string;
  name: string;
  issuer: string;
  expiryDate: string;
}

const STORAGE_KEY = "caregiver_certifications";

const loadCerts = (): Certification[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
};

const ProfileCertifications = () => {
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certification[]>(loadCerts);
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const saveCerts = (updated: Certification[]) => {
    setCerts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!name.trim()) { toast.error("Certification name is required"); return; }
    const newCert: Certification = { id: crypto.randomUUID(), name: name.trim(), issuer: issuer.trim(), expiryDate };
    saveCerts([...certs, newCert]);
    setName(""); setIssuer(""); setExpiryDate("");
    toast.success("Certification added!");
  };

  const handleRemove = (id: string) => {
    saveCerts(certs.filter((c) => c.id !== id));
    toast.success("Certification removed");
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
            <button onClick={handleAdd} className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Certification
            </button>
          </div>
        </div>

        {certs.length === 0 ? (
          <div className="text-center py-10">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No certifications added yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certs.map((cert) => (
              <div key={cert.id} className="bg-card rounded-2xl p-4 shadow-card flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-card-foreground">{cert.name}</p>
                  {cert.issuer && <p className="text-xs text-muted-foreground">{cert.issuer}</p>}
                  {cert.expiryDate && <p className="text-xs text-muted-foreground">Expires: {cert.expiryDate}</p>}
                </div>
                <button onClick={() => handleRemove(cert.id)} className="text-destructive p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default ProfileCertifications;
