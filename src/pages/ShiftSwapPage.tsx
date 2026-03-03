import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { shifts } from "@/data/mockData";

const availableShifts = [
  { id: "av1", time: "9:00 AM – 1:00 PM", date: "Tue, Apr 16", caregiver: "Emma R." },
  { id: "av2", time: "2:00 PM – 8:00 PM", date: "Wed, Apr 17", caregiver: "George T." },
];

const ShiftSwapPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const shift = shifts.find((s) => s.id === id);
  const [selectedSwap, setSelectedSwap] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <div className="flex items-center gap-3 px-5 py-4">
        <button onClick={() => navigate(-1)} className="text-primary font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Shifts
        </button>
      </div>

      <div className="px-5 py-4 space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Available Shifts</h2>

        <div className="space-y-3">
          {availableShifts.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSwap(s.id)}
              className={`w-full text-left rounded-2xl border p-5 transition-colors ${
                selectedSwap === s.id
                  ? "border-primary bg-accent"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-xl font-bold text-foreground">{s.time}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.date}</p>
              <p className="text-sm text-muted-foreground">{s.caregiver}</p>
            </button>
          ))}
        </div>

        <button
          disabled={!selectedSwap}
          className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-lg font-bold disabled:opacity-50 transition-opacity active:scale-[0.98]"
        >
          Swap Shift
        </button>
      </div>
    </div>
  );
};

export default ShiftSwapPage;
