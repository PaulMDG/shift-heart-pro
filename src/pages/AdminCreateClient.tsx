import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Search } from "lucide-react";
import { useCreateClient } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
    { headers: { "User-Agent": "CareLink-Pro/1.0" } }
  );
  const data = await res.json();
  if (data.length > 0) {
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  }
  return null;
}

const AdminCreateClient = () => {
  const navigate = useNavigate();
  const createClient = useCreateClient();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [careType, setCareType] = useState("");
  const [carePlan, setCarePlan] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = async () => {
    if (!address.trim()) {
      toast.error("Enter an address first");
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(address);
      if (result) {
        setLat(result.lat);
        setLng(result.lng);
        toast.success(`Location found: ${result.lat.toFixed(5)}, ${result.lng.toFixed(5)}`);
      } else {
        toast.error("Could not find coordinates for this address. Try a more specific address.");
      }
    } catch {
      toast.error("Geocoding failed. Please try again.");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) {
      toast.error("Please look up the address coordinates before saving.");
      return;
    }
    try {
      await createClient.mutateAsync({
        name,
        address,
        care_type: careType,
        care_plan_summary: carePlan,
        emergency_contact: emergencyContact,
        emergency_phone: emergencyPhone,
        lat,
        lng,
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
          <div className="flex gap-2">
            <Input
              value={address}
              onChange={(e) => { setAddress(e.target.value); setLat(null); setLng(null); }}
              placeholder="Street address, city, country"
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !address.trim()}
              className="shrink-0 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1"
            >
              {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Lookup
            </button>
          </div>
          {lat !== null && lng !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
            </div>
          )}
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
