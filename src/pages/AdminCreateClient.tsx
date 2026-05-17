import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, MapPin, Search } from "lucide-react";
import { useCreateClient } from "@/hooks/useAdmin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { geocodeAddress } from "@/lib/geocode";

const AdminCreateClient = () => {
  const navigate = useNavigate();
  const createClient = useCreateClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateProv, setStateProv] = useState("");
  const [zip, setZip] = useState("");
  const [careType, setCareType] = useState("");
  const [carePlan, setCarePlan] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const fullAddress = useMemo(
    () =>
      [street, city, [stateProv, zip].filter(Boolean).join(" ")]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", "),
    [street, city, stateProv, zip],
  );

  const resetCoords = () => {
    setLat(null);
    setLng(null);
  };

  const handleGeocode = async () => {
    if (!fullAddress) {
      toast.error("Enter a residence address first");
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(fullAddress);
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
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Please enter the client's first and last name.");
      return;
    }
    if (!lat || !lng) {
      toast.error("Please look up the address coordinates before saving.");
      return;
    }
    try {
      await createClient.mutateAsync({
        name: `${firstName.trim()} ${lastName.trim()}`,
        address: fullAddress,
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
      <form onSubmit={handleSubmit} className="px-5 py-6 space-y-6">
        <h2 className="text-xl font-bold text-foreground">Add Client</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Residence</h3>

          <div className="space-y-2">
            <Label htmlFor="street">Address</Label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
              <Input
                id="street"
                value={street}
                onChange={(e) => { setStreet(e.target.value); resetCoords(); }}
                placeholder="Street address"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => { setCity(e.target.value); resetCoords(); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" value={stateProv} onChange={(e) => { setStateProv(e.target.value); resetCoords(); }} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP / Postal code</Label>
              <Input id="zip" value={zip} onChange={(e) => { setZip(e.target.value); resetCoords(); }} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGeocode}
            disabled={geocoding || !fullAddress}
            className="w-full py-2.5 rounded-md border border-border text-sm font-medium text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Look up coordinates
          </button>
          {lat !== null && lng !== null && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>GPS: {lat.toFixed(5)}, {lng.toFixed(5)}</span>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Care Details</h3>
          <div className="space-y-2">
            <Label htmlFor="careType">Care Type</Label>
            <Input id="careType" value={careType} onChange={(e) => setCareType(e.target.value)} placeholder="e.g. Elderly Care, Dementia" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carePlan">Care Plan Summary</Label>
            <Textarea id="carePlan" value={carePlan} onChange={(e) => setCarePlan(e.target.value)} placeholder="Care plan details..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="emName">Emergency Contact</Label>
              <Input id="emName" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Contact name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emPhone">Emergency Phone</Label>
              <Input id="emPhone" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} placeholder="+1 555 555 5555" />
            </div>
          </div>
        </section>

        <button type="submit" disabled={createClient.isPending} className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50">
          {createClient.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Submit"}
        </button>
      </form>
    </div>
  );
};

export default AdminCreateClient;
