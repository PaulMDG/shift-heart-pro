import { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";

interface ClockOutFormProps {
  clientName: string;
  onClose: () => void;
  onSubmit: () => void;
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
    <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end max-w-lg mx-auto">
      <div className="bg-card w-full rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-card px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-card-foreground">Clock Out</h3>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Complete your visit notes for {clientName}
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* Care Notes */}
          <div>
            <label className="text-sm font-semibold text-card-foreground block mb-2">
              Care Notes <span className="text-destructive">*</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the visit, activities performed, and client observations..."
              className="w-full h-28 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>

          {/* Tasks Checklist */}
          <div>
            <label className="text-sm font-semibold text-card-foreground block mb-2">
              Tasks Completed
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tasks.map((task) => {
                const checked = completedTasks.includes(task);
                return (
                  <button
                    key={task}
                    onClick={() => toggleTask(task)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                      checked
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 shrink-0 ${checked ? "text-primary" : "text-muted-foreground/40"}`}
                    />
                    {task}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Medication */}
          <div>
            <label className="text-sm font-semibold text-card-foreground block mb-2">
              Medication Supervised? <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-3">
              {[true, false].map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setMedicationSupervised(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    medicationSupervised === val
                      ? "gradient-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {val ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>

          {/* Mileage */}
          <div>
            <label className="text-sm font-semibold text-card-foreground block mb-2">
              Mileage Driven
            </label>
            <div className="relative">
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                placeholder="0"
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                miles
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="p-5 border-t border-border">
          <button
            onClick={onSubmit}
            disabled={!isValid}
            className="w-full py-4 rounded-2xl gradient-primary text-primary-foreground text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Submit & Clock Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClockOutForm;
