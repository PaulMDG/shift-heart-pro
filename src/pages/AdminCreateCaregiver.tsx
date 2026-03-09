import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCreateCaregiver } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";

const AdminCreateCaregiver = () => {
  const navigate = useNavigate();
  const createCaregiver = useCreateCaregiver();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCaregiver.mutateAsync({
        email,
        password,
        full_name: fullName,
        phone,
      });
      toast.success("Caregiver added successfully!");
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
        <h2 className="text-xl font-bold text-foreground">Add Caregiver / Staff</h2>

        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Caregiver name" required />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" required />
        </div>

        <div className="space-y-2">
          <Label>Temporary Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" required minLength={6} />
        </div>

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 234 567 8900" />
        </div>

        <button type="submit" disabled={createCaregiver.isPending} className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50">
          {createCaregiver.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Add Caregiver"}
        </button>
      </form>
    </div>
  );
};

export default AdminCreateCaregiver;