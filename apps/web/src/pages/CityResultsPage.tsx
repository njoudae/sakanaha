import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import PropertyCard from "../components/PropertyCard";
import { cityNames } from "@saknaha/constants/cities";
import {
  getOwnerSubmittedPublishedProperties,
  isFavoriteProperty,
  toggleFavoriteProperty,
} from "../services/propertyService";
import type { Property, User } from "@saknaha/shared-types";
import { absoluteAppUrl, propertyPath } from "../utils/routes";

interface CityResultsPageProps {
  cityName: string;
  user: User | null;
  onBackHome: () => void;
  onCity: (city: string) => void;
  onProperty: (propertyId: string) => void;
}

export default function CityResultsPage({
  cityName,
  user,
  onBackHome,
  onCity,
  onProperty,
}: CityResultsPageProps) {
  const userId = user?.id ?? "guest-user";
  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const properties = useMemo(
    () => getOwnerSubmittedPublishedProperties().filter((property) => property.city === cityName),
    [cityName, favoriteVersion],
  );

  async function shareProperty(property: Property) {
    const url = absoluteAppUrl(propertyPath(property.id));
    try {
      if (navigator.share) {
        await navigator.share({
          title: property.title,
          text: `شاهدي هذا السكن في ${property.city}: ${property.title}`,
          url,
        });
        setNotice("تم فتح خيارات المشاركة.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("تم نسخ رابط السكن.");
    } catch {
      setNotice("لم تتم المشاركة. يمكنك فتح التفاصيل ونسخ الرابط من المتصفح.");
    }
  }

  function toggleFavorite(property: Property) {
    toggleFavoriteProperty(property, userId);
    setFavoriteVersion((value) => value + 1);
    setNotice("تم تحديث المفضلة. سنستخدمها لاحقًا لفهم الاهتمام حسب المدينة.");
  }

  return (
    <main>
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <button className="secondary-button mb-6" onClick={onBackHome}>
          <ArrowRight size={18} aria-hidden="true" />
          العودة للرئيسية
        </button>

        <header className="mb-7 grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-sm font-black text-berry">تصفح حسب المدينة</p>
            <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
              وحدات سكنية متوفرة في {cityName}
            </h1>
          </div>
          <label>
            <span className="label">تغيير المدينة</span>
            <select
              id="city-selector"
              className="field field-select"
              value={cityName}
              onChange={(event) => onCity(event.target.value)}
            >
              {cityNames.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
        </header>

        {notice ? (
          <p className="mb-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold leading-7 text-mintdeep">
            {notice}
          </p>
        ) : null}

        {properties.length === 0 ? (
          <div className="panel max-w-2xl">
            <h2 className="text-xl font-black text-ink">
              لا توجد وحدات متاحة في هذه المدينة حالياً
            </h2>
            <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
              يمكنك تجربة مدينة أخرى أو العودة للصفحة الرئيسية.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="primary-button" onClick={onBackHome}>
                العودة للرئيسية
              </button>
              <a className="secondary-button" href="#city-selector">
                تصفح المدن
              </a>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onView={() => onProperty(property.id)}
                isFavorite={isFavoriteProperty(property.id, userId)}
                onFavorite={toggleFavorite}
                onShare={shareProperty}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
