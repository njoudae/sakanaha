import { ArrowRight, Building2, Home, Search, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cityNames } from "@saknaha/constants/cities";
import { mockUniversities } from "@saknaha/constants/mockUniversities";
import type { UniversityLocation, UserRole } from "@saknaha/shared-types";

type SearchIntent = "housing" | "roommate" | null;
type RoommateIntent = "host" | "join" | null;

interface UserLocationPageProps {
  onBack: () => void;
  onFindHousing: (city: string, university: UniversityLocation | null) => void;
  onFindRoommateMatch: (city: string) => void;
  onCreateRoommateCard: (city: string) => void;
}

export default function UserLocationPage({
  onBack,
  onFindHousing,
  onFindRoommateMatch,
  onCreateRoommateCard,
}: UserLocationPageProps) {
  const [intent, setIntent] = useState<SearchIntent>(null);
  const [city, setCity] = useState("أبها");
  const [role, setRole] = useState<UserRole | null>(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [roommateIntent, setRoommateIntent] = useState<RoommateIntent>(null);

  const universities = useMemo(
    () => mockUniversities.filter((university) => university.city === city),
    [city],
  );
  const selectedUniversity =
    universities.find((university) => university.id === selectedUniversityId) ?? null;
  const canShowHousing =
    intent === "housing" && city && role && (role === "employee" || selectedUniversity);

  function resetIntent(nextIntent: SearchIntent) {
    setIntent(nextIntent);
    setRole(null);
    setSelectedUniversityId("");
    setRoommateIntent(null);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12" dir="rtl">
      <button className="secondary-button mb-5" onClick={onBack} type="button">
        <ArrowRight size={18} aria-hidden="true" />
        رجوع
      </button>

      <section className="rounded-3xl border border-stone-200 bg-white/95 p-5 text-right shadow-sm md:p-7">
        <div className="mb-6 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-mintdeep">
            <Search size={28} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-black text-mintdeep">اختيار المسار</p>
            <h1 className="text-3xl font-black text-ink">كيف ترغبين باستخدام سكنها؟</h1>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <ChoiceButton
            active={intent === "housing"}
            icon={Home}
            title="تبحثين عن سكن؟"
            onClick={() => resetIntent("housing")}
          />
          <ChoiceButton
            active={intent === "roommate"}
            icon={UsersRound}
            title="تبحثين عن شريكة سكن؟"
            onClick={() => resetIntent("roommate")}
          />
        </div>

        {intent ? (
          <div className="mt-6 grid gap-4 rounded-3xl bg-linen/60 p-4">
            <label>
              <span className="label">المنطقة</span>
              <select
                className="field field-select"
                value={city}
                onChange={(event) => {
                  setCity(event.target.value);
                  setSelectedUniversityId("");
                }}
              >
                {cityNames.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </label>

            {intent === "housing" ? (
              <>
                <div>
                  <span className="label">الحالة</span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ChoiceButton
                      active={role === "student"}
                      icon={Building2}
                      title="طالبة"
                      onClick={() => setRole("student")}
                    />
                    <ChoiceButton
                      active={role === "employee"}
                      icon={Building2}
                      title="موظفة"
                      onClick={() => setRole("employee")}
                    />
                  </div>
                </div>

                {role === "student" ? (
                  <label>
                    <span className="label">فرع الجامعة</span>
                    <select
                      className="field field-select"
                      value={selectedUniversityId}
                      onChange={(event) => setSelectedUniversityId(event.target.value)}
                    >
                      <option value="">اختاري فرع الجامعة</option>
                      {universities.map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.name}
                        </option>
                      ))}
                      {universities.length === 0 ? (
                        <option value="manual">لا توجد فروع مضافة لهذه المنطقة</option>
                      ) : null}
                    </select>
                  </label>
                ) : null}

                <button
                  className="primary-button w-full"
                  disabled={!canShowHousing}
                  onClick={() => onFindHousing(city, selectedUniversity)}
                  type="button"
                >
                  عرض السكن
                </button>
              </>
            ) : null}

            {intent === "roommate" ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <ChoiceButton
                    active={roommateIntent === "host"}
                    icon={Home}
                    title="قمتِ بالاستئجار وتبحثين عن من يشاركك؟"
                    onClick={() => setRoommateIntent("host")}
                  />
                  <ChoiceButton
                    active={roommateIntent === "join"}
                    icon={UsersRound}
                    title="تريدين الانضمام لمستأجرة أخرى؟"
                    onClick={() => setRoommateIntent("join")}
                  />
                </div>
                <button
                  className="primary-button w-full"
                  disabled={!roommateIntent}
                  onClick={() =>
                    roommateIntent === "host"
                      ? onCreateRoommateCard(city)
                      : onFindRoommateMatch(city)
                  }
                  type="button"
                >
                  متابعة
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ChoiceButton({
  active,
  icon: Icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-right font-black transition ${
        active
          ? "border-berry bg-berry text-white shadow-sm"
          : "border-stone-200 bg-white text-ink hover:border-berry hover:bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <span>{title}</span>
      <Icon size={22} aria-hidden="true" />
    </button>
  );
}
