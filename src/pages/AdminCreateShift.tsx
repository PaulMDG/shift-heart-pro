import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAllClients, useAllCaregivers, useCreateShift } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

const AdminCreateShift = () => {
  const navigate = useNavigate();
  const { data: clients = [] } = useAllClients();
  const { data: caregivers = [] } = useAllCaregivers();
  const createShift = useCreateShift();

  const [clientId, setClientId] = useState("");
  const [caregiverId, setCaregiverId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createShift.mutateAsync({
        client_id: clientId,
        caregiver_id: caregiverId || null,
        date,
        start_time: startTime,
        end_time: endTime,
        admin_notes: notes,
      });
      toast.success("Shift created successfully!");
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
        <h2 className="text-xl font-bold text-foreground">Create Shift</h2>

        <div className="space-y-2">
          <Label>Client</Label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Select client...</option>
            {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Caregiver (optional)</Label>
          <select value={caregiverId} onChange={(e) => setCaregiverId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {caregivers.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Admin Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." rows={3} />
        </div>

        <button type="submit" disabled={createShift.isPending} className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50">
          {createShift.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create Shift"}
        </button>
      </form>
    </div>
  );
};

export default AdminCreateShift;
