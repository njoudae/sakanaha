import { ArrowRight, MapPinned } from "lucide-react";
import { useState } from "react";
import MockMap from "../components/MockMap";
import { mockUniversities } from "@saknaha/constants/mockUniversities";
import type { UniversityLocation } from "@saknaha/shared-types";

interface UserLocationPageProps {
  onBack: () => void;
  onDone: (university: UniversityLocation) => void;
}

export default function UserLocationPage({ onBack, onDone }: UserLocationPageProps) {
  const [city, setCity] = useState("أبها");
  const [selectedId, setSelectedId] = useState(mockUniversities[0]?.id ?? "");
  const [manualPlace, setManualPlace] = useState("");
  const available = mockUniversities.filter((item) => item.city === city);
  const isManual = selectedId === "manual";
  const selected = isManual
    ? {
        id: "manual-workplace",
        city,
        name: manualPlace.trim() || "موقع آخر",
        label: "قريب من موقعك المختار",
        lat: 18.2164,
        lng: 42.5053,
      }
    : (available.find((item) => item.id === selectedId) ?? available[0]);
  const canContinue = Boolean(selected && (!isManual || manualPlace.trim()));

  return (
    <main className="page-shell">
      <button className="secondary-button mb-5" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" />
        رجوع
      </button>
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="panel">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-mintdeep">
              <MapPinned size={28} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-mintdeep">اختيار الموقع</p>
              <h1 className="text-3xl font-black text-ink">أين تبحثين عن السكن؟</h1>
            </div>
          </div>
          <label>
            <span className="label">المدينة</span>
            <select
              className="field"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            >
              <option>أبها</option>
            </select>
          </label>
          <div className="mt-5">
            <span className="label">الجامعة أو جهة العمل</span>
            <div className="grid gap-3">
              {available.map((university) => (
                <button
                  key={university.id}
                  className={
                    selectedId === university.id
                      ? "primary-button justify-start"
                      : "secondary-button justify-start"
                  }
                  onClick={() => setSelectedId(university.id)}
                >
                  {university.name}
                </button>
              ))}
              <button
                className={
                  isManual ? "primary-button justify-start" : "secondary-button justify-start"
                }
                onClick={() => setSelectedId("manual")}
              >
                أخرى يدوياً
              </button>
            </div>
            {isManual ? (
              <label className="mt-3 block">
                <span className="label">اكتبي جهة العمل أو الموقع</span>
                <input
                  className="field"
                  placeholder="مثال: مستشفى عسير، شركة، حي العمل"
                  value={manualPlace}
                  onChange={(event) => setManualPlace(event.target.value)}
                />
              </label>
            ) : null}
          </div>
          <button
            className="primary-button mt-6 w-full"
            disabled={!canContinue}
            onClick={() => selected && onDone(selected)}
          >
            عرض السكن
          </button>
        </div>
        <div>
          <MockMap properties={[]} selectedUniversity={selected} />
          <p className="mt-3 rounded-2xl bg-white/80 p-4 text-sm font-bold leading-7 text-stone-600">
            يمكن لاحقًا تحديد الموقع من الخريطة مباشرة. في هذا الإصدار نستخدم خريطة وهمية واختيارًا
            يدويًا واضحًا.
          </p>
        </div>
      </section>
    </main>
  );
}
