interface StepperProps {
  steps: string[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {steps.map((step, index) => {
        const active = index === currentStep;
        const done = index < currentStep;
        return (
          <div
            key={step}
            className={`rounded-xl border p-3 text-sm font-bold transition ${
              active
                ? "scale-[1.02] border-berry bg-berry text-white shadow-soft"
                : done
                  ? "border-emerald-200 bg-emerald-50 text-mintdeep"
                  : "border-stone-200 bg-white text-stone-500"
            }`}
          >
            <span className={`mb-1 block text-xs ${active ? "text-white/80" : ""}`}>
              خطوة {index + 1}
            </span>
            {step}
          </div>
        );
      })}
    </div>
  );
}
