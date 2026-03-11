import { useState } from "react";
import { ArrowLeft, DollarSign, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import MobileLayout from "@/components/layout/MobileLayout";
import { useBillingRates, useSetBillingRate } from "@/hooks/useBillingRates";
import { useAllClients } from "@/hooks/useAdmin";

const AdminBillingRates = () => {
  const navigate = useNavigate();
  const { data: rates, isLoading } = useBillingRates();
  const { data: clients = [] } = useAllClients();
  const setRate = useSetBillingRate();
  const [clientId, setClientId] = useState<string>("global");
  const [hourlyRate, setHourlyRate] = useState("25.00");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);

  const handleSave = async () => {
    const rate = parseFloat(hourlyRate);
    if (isNaN(rate) || rate <= 0) { toast.error("Enter a valid hourly rate"); return; }
    try {
      await setRate.mutateAsync({
        client_id: clientId === "global" ? null : clientId,
        hourly_rate: rate,
        effective_from: effectiveFrom,
      });
      toast.success("Billing rate saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    }
  };

  return (
    <MobileLayout>
      <div className="px-5 py-4">
        <button onClick={() => navigate("/admin")} className="text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Admin
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6">Billing Rates</h2>

        <div className="bg-card rounded-2xl p-4 shadow-card space-y-4 mb-6">
          <h3 className="text-sm font-semibold text-card-foreground">Set Hourly Rate</h3>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global Default (all clients)</SelectItem>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Effective From</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <button
              onClick={handleSave}
              disabled={setRate.isPending}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {setRate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Rate
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
        ) : !rates?.length ? (
          <div className="text-center py-10">
            <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No billing rates configured yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rates.map((r) => {
              const clientName = r.client_id
                ? clients.find((c: any) => c.id === r.client_id)?.name || "Unknown Client"
                : "Global Default";
              return (
                <div key={r.id} className="bg-card rounded-2xl p-4 shadow-card flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">{clientName}</p>
                    <p className="text-xs text-muted-foreground">Effective: {r.effective_from}</p>
                  </div>
                  <span className="text-lg font-bold text-success">${Number(r.hourly_rate).toFixed(2)}/hr</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default AdminBillingRates;
