interface BadgeProps {
  children: string;
  tone?: "berry" | "sky" | "mint" | "clay" | "stone";
}

const tones = {
  berry: "bg-fuchsia-50 text-berry border-fuchsia-100",
  sky: "bg-sky-50 text-skysoft border-sky-100",
  mint: "bg-emerald-50 text-mintdeep border-emerald-100",
  clay: "bg-orange-50 text-clay border-orange-100",
  stone: "bg-stone-100 text-stone-600 border-stone-200",
};

export default function Badge({ children, tone = "berry" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
