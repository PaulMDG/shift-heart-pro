import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCreateClient } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

const AdminCreateClient = () => {
  const navigate = useNavigate();
  const createClient = useCreateClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [careType, setCareType] = useState("");
  const [carePlan, setCarePlan] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createClient.mutateAsync({
        name,
        address,
        care_type: careType,
        care_plan_summary: carePlan,
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
      });
      toast.success("Client added successfully!");
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>
      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">
        <h2 className="text-xl font-bold text-foreground">Add Client</h2>

        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" required />
        </div>

        <div className="space-y-2">
          <Label>Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address" />
        </div>

        <div className="space-y-2">
          <Label>Care Type</Label>
          <Input value={careType} onChange={(e) => setCareType(e.target.value)} placeholder="e.g. Elderly Care, Dementia" />
        </div>

        <div className="space-y-2">
          <Label>Care Plan Summary</Label>
          <Textarea value={carePlan} onChange={(e) => setCarePlan(e.target.value)} placeholder="Care plan details..." rows={3} />
        </div>

        <div className="space-y-2">
          <Label>Emergency Contact</Label>
          <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Contact name" />
        </div>

        <div className="space-y-2">
          <Label>Emergency Phone</Label>
          <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+254 7XX XXX XXX" />
        </div>

        <button type="submit" disabled={createClient.isPending} className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50">
          {createClient.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Add Client"}
        </button>
      </form>
    </div>
  );
};

export default AdminCreateClient;
