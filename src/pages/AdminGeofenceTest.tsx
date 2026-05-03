import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAllClients } from "@/hooks/useAdmin";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDistanceMeters, MAX_DISTANCE_METERS, metersToFeet } from "@/hooks/useGeolocation";

const GEOFENCE_FT = 100;
const BUFFER_FT = 150;
const TOTAL_FT = GEOFENCE_FT + BUFFER_FT; // 250 ft

const AdminGeofenceTest = () => {
  const navigate = useNavigate();
  const { data: clients = [] } = useAllClients();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [testLat, setTestLat] = useState("");
  const [testLng, setTestLng] = useState("");
  const [result, setResult] = useState<{ distance: number; allowed: boolean; inGeofence: boolean; inBuffer: boolean } | null>(null);

  const selectedClient = clients.find((c: any) => c.id === selectedClientId);

  const runTest = () => {
    if (!selectedClient || !testLat || !testLng) return;
    if (selectedClient.lat == null || selectedClient.lng == null) return;

    const distanceM = getDistanceMeters(
      { lat: parseFloat(testLat), lng: parseFloat(testLng) },
      { lat: selectedClient.lat, lng: selectedClient.lng }
    );
    const distanceFt = metersToFeet(distanceM);
    setResult({
      distance: distanceFt,
      allowed: distanceM <= MAX_DISTANCE_METERS,
      inGeofence: distanceFt <= GEOFENCE_FT,
      inBuffer: distanceFt > GEOFENCE_FT && distanceFt <= TOTAL_FT,
    });
  };

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTestLat(pos.coords.latitude.toFixed(6));
        setTestLng(pos.coords.longitude.toFixed(6));
      },
      () => {}
    );
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-lg font-bold text-foreground">Geofence Test</span>
      </div>

      <div className="px-5 py-6 space-y-5">
        <div className="bg-card rounded-2xl p-4 border border-border space-y-1">
          <h3 className="text-sm font-bold text-foreground">Geofence Configuration</h3>
          <p className="text-xs text-muted-foreground">Geofence radius: <strong>{GEOFENCE_FT} ft</strong></p>
          <p className="text-xs text-muted-foreground">Buffer zone: <strong>{BUFFER_FT} ft</strong></p>
          <p className="text-xs text-muted-foreground">Total allowed: <strong>{TOTAL_FT} ft</strong> ({Math.round(MAX_DISTANCE_METERS)}m)</p>
        </div>

        <div className="space-y-2">
          <Label>Select Client Location</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger><SelectValue placeholder="Choose a client" /></SelectTrigger>
            <SelectContent>
              {clients.filter((c: any) => c.lat != null).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name} — {c.address}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient && selectedClient.lat != null && (
            <p className="text-xs text-muted-foreground">📍 {selectedClient.lat.toFixed(6)}, {selectedClient.lng.toFixed(6)}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Test GPS Point</Label>
            <button onClick={useCurrentLocation} className="text-xs text-primary font-semibold flex items-center gap-1">
              <Navigation className="w-3 h-3" /> Use my location
            </button>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Latitude" value={testLat} onChange={(e) => setTestLat(e.target.value)} type="number" step="any" />
            <Input placeholder="Longitude" value={testLng} onChange={(e) => setTestLng(e.target.value)} type="number" step="any" />
          </div>
        </div>

        <button
          onClick={runTest}
          disabled={!selectedClientId || !testLat || !testLng}
          className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50"
        >
          Test Geofence
        </button>

        {result && (
          <div className={`rounded-2xl p-4 border space-y-2 ${result.allowed ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
            <div className="flex items-center gap-2">
              {result.allowed ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              <span className={`font-bold text-sm ${result.allowed ? "text-success" : "text-destructive"}`}>
                {result.allowed ? "ALLOWED — Within geofence" : "BLOCKED — Outside geofence"}
              </span>
            </div>
            <p className="text-xs text-foreground">Distance: <strong>{Math.round(result.distance)} ft</strong> ({Math.round(result.distance / 3.28084)}m)</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${result.inGeofence ? "bg-success" : "bg-muted"}`} />
                <span className="text-xs text-muted-foreground">Core zone (0–{GEOFENCE_FT} ft): {result.inGeofence ? "✓ Inside" : "Outside"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${result.inBuffer ? "bg-warning" : "bg-muted"}`} />
                <span className="text-xs text-muted-foreground">Buffer zone ({GEOFENCE_FT}–{TOTAL_FT} ft): {result.inBuffer ? "✓ Inside buffer" : result.inGeofence ? "N/A (in core)" : "Outside"}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${!result.allowed ? "bg-destructive" : "bg-muted"}`} />
                <span className="text-xs text-muted-foreground">Beyond threshold ({TOTAL_FT}+ ft): {!result.allowed ? "✗ Too far" : "N/A"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminGeofenceTest;