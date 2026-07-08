import { ArrowRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import MockMap from "../components/MockMap";
import PropertyCard from "../components/PropertyCard";
import { getOwnerSubmittedPublishedProperties } from "../services/propertyService";
import type { UniversityLocation, User } from "@saknaha/shared-types";

const markerColors = ["#7f3b75", "#25856f", "#4f8aa8", "#b86b5a", "#6b5b95"];

interface UserSearchPageProps {
  user: User | null;
  selectedUniversity: UniversityLocation | null;
  onBack: () => void;
  onHome: () => void;
  onProperty: (propertyId: string) => void;
}

export default function UserSearchPage({
  user,
  selectedUniversity,
  onBack,
  onHome,
  onProperty,
}: UserSearchPageProps) {
  const [query, setQuery] = useState("");
  const [maxPrice, setMaxPrice] = useState(String(user?.monthlyBudget || 2500));

  const properties = useMemo(() => {
    const normalized = query.trim();
    return getOwnerSubmittedPublishedProperties().filter((property) => {
      const byCity = !user?.city || property.city === user.city;
      const byPrice = property.price <= (Number(maxPrice) || Number.MAX_SAFE_INTEGER);
      const byText =
        !normalized ||
        property.neighborhood.includes(normalized) ||
        property.title.includes(normalized) ||
        property.universityNearby.includes(normalized);
      return byCity && byPrice && byText;
    });
  }, [maxPrice, query, user?.city]);

  return (
    <main className="page-shell">
      <div className="mb-5 flex flex-wrap gap-3">
        <button className="secondary-button" onClick={onBack}>
          <ArrowRight size={18} aria-hidden="true" />
          رجوع
        </button>
        <button className="secondary-button" onClick={onHome}>
          الصفحة الرئيسية
        </button>
      </div>
      <header className="mb-6">
        <p className="text-sm font-black text-skysoft">نتائج البحث</p>
        <h1 className="text-3xl font-black text-ink">
          وحدات قريبة من {selectedUniversity?.name ?? "اختيارك"}
        </h1>
      </header>
      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <MockMap properties={properties} selectedUniversity={selectedUniversity} />
          <div className="panel">
            <div className="mb-4 flex items-center gap-2">
              <Filter size={20} className="text-berry" aria-hidden="true" />
              <h2 className="font-black text-ink">فلترة سريعة</h2>
            </div>
            <div className="grid gap-3">
              <label>
                <span className="label">بحث بالحي أو الجامعة</span>
                <div className="relative">
                  <Search
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    className="field pr-10"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
              </label>
              <label>
                <span className="label">أعلى ميزانية</span>
                <input
                  className="field"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {properties.length === 0 ? (
            <div className="panel md:col-span-2">
              <h2 className="text-xl font-black text-ink">لا توجد نتائج مطابقة</h2>
              <p className="mt-2 text-stone-600">جرّبي رفع الميزانية أو تغيير كلمة البحث.</p>
            </div>
          ) : (
            properties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                mapColor={markerColors[index % markerColors.length]}
                onView={() => onProperty(property.id)}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}
