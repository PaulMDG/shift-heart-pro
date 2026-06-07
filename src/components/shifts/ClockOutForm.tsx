import { useState } from "react";
import { X, CheckCircle2, TimerReset, ShieldCheck } from "lucide-react";

interface ClockOutFormProps {
  clientName: string;
  onClose: () => void;
  onSubmit: (notes?: string) => void;
}

const tasks = [
  "Personal hygiene assistance",
  "Meal preparation",
  "Medication reminder",
  "Light housekeeping",
  "Mobility assistance",
  "Vitals check",
];

const ClockOutForm = ({ clientName, onClose, onSubmit }: ClockOutFormProps) => {
  const [notes, setNotes] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [medicationSupervised, setMedicationSupervised] = useState<boolean | null>(null);
  const [mileage, setMileage] = useState("");

  const toggleTask = (task: string) => {
    setCompletedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const isValid = notes.trim().length > 0 && medicationSupervised !== null;

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end justify-center">
      <div className="bg-card w-full max-w-lg rounded-t-3xl max-h-[92vh] overflow-y-auto animate-slide-up border-t border-x border-primary/15 shadow-2xl shadow-background">
        <div className="sticky top-0 bg-card/95 backdrop-blur px-5 pt-5 pb-4 border-b border-border/60">
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center ring-1 ring-primary/30">
                <TimerReset className="w-5 h-5 text-primary" />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-card-foreground leading-none">Clock Out</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Wrap up your visit with {clientName}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary/60 transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
            <ShieldCheck className="w-3.5 h-3.5" /> Location verified for clock-out
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Care Notes */}
          <div>
            <label className="text-xs font-bold tracking-[0.14em] text-primary uppercase block mb-2">
              Care Notes <span className="text-destructive">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the visit, activities performed, and client observations..."
              className="w-full h-32 bg-secondary/60 border border-border/60 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Tasks Checklist */}
          <div>
            <label className="text-xs font-bold tracking-[0.14em] text-primary uppercase block mb-2">
              Tasks Completed
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tasks.map((task) => {
                const checked = completedTasks.includes(task);
                return (
                  <button
                    key={task}
                    onClick={() => toggleTask(task)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-2xl text-xs font-medium transition text-left border ${
                      checked
                        ? "bg-primary/10 text-primary border-primary/40 ring-1 ring-primary/20"
                        : "bg-secondary/40 text-muted-foreground border-border/60"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${checked ? "text-primary" : "text-muted-foreground/50"}`}
                    />
                    {task}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Medication */}
          <div>
            <label className="text-xs font-bold tracking-[0.14em] text-primary uppercase block mb-2">
              Medication Supervised? <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setMedicationSupervised(val)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition border ${
                    medicationSupervised === val
                      ? "gradient-primary text-primary-foreground border-transparent shadow-lg shadow-primary/20"
                      : "bg-secondary/40 text-muted-foreground border-border/60"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>

          {/* Mileage */}
          <div>
            <label className="text-xs font-bold tracking-[0.14em] text-primary uppercase block mb-2">
              Mileage Driven
            </label>
            <div className="relative">
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="0"
                className="w-full bg-secondary/60 border border-border/60 rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                miles
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-card/95 backdrop-blur p-5 border-t border-border/60">
          <button
            onClick={() => onSubmit(notes)}
            disabled={!isValid}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/25 active:scale-[0.99] transition"
          >
            Submit & Clock Out
          </button>
          {!isValid && (
            <p className="text-[11px] text-muted-foreground text-center mt-2">
              Add care notes and confirm medication supervision to continue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockOutForm;
