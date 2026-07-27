import type { RoommateLifestylePreferences } from "@saknaha/shared-types";

interface RoommatePreferencesFieldsProps {
  value: RoommateLifestylePreferences;
  onChange: (value: RoommateLifestylePreferences) => void;
  legend?: string;
}

const fields = [
  {
    key: "smoking",
    label: "التدخين",
    options: [
      ["no", "لا"],
      ["yes", "نعم"],
    ],
  },
  {
    key: "guests",
    label: "الضيوف",
    options: [
      ["never", "لا"],
      ["occasionally", "أحياناً"],
      ["frequently", "بشكل متكرر"],
      ["no_preference", "لا يهم"],
    ],
  },
  {
    key: "sleep",
    label: "وقت النوم",
    options: [
      ["early", "مبكر"],
      ["flexible", "مرن"],
      ["late", "متأخر"],
    ],
  },
  {
    key: "cleanliness",
    label: "النظافة",
    options: [
      ["very_tidy", "مرتبة جداً"],
      ["average", "متوسطة"],
      ["no_preference", "لا يهم"],
    ],
  },
  {
    key: "pets",
    label: "الحيوانات الأليفة",
    options: [
      ["allowed", "مسموحة"],
      ["not_allowed", "غير مسموحة"],
    ],
  },
  {
    key: "cooking",
    label: "الطبخ",
    options: [
      ["frequently", "غالباً"],
      ["occasionally", "أحياناً"],
      ["rarely", "نادراً"],
    ],
  },
  {
    key: "occupation",
    label: "الصفة",
    options: [
      ["student", "طالبة"],
      ["employee", "موظفة"],
      ["both", "كلاهما"],
    ],
  },
  {
    key: "noise",
    label: "الهدوء",
    options: [
      ["quiet", "هادئ"],
      ["moderate", "متوسط"],
      ["no_preference", "لا يهم"],
    ],
  },
] as const;

export default function RoommatePreferencesFields({
  value,
  onChange,
  legend = "تفضيلات شريكة السكن",
}: RoommatePreferencesFieldsProps) {
  return (
    <fieldset className="rounded-xl border border-stone-200 bg-linen p-4">
      <legend className="px-2 text-sm font-black text-ink">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <label key={field.key}>
            <span className="label">{field.label}</span>
            <select
              className="field field-select"
              value={value[field.key]}
              onChange={(event) =>
                onChange({
                  ...value,
                  [field.key]: event.target.value,
                } as RoommateLifestylePreferences)
              }
            >
              {field.options.map(([optionValue, label]) => (
                <option key={optionValue} value={optionValue}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
