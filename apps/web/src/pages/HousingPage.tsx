import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import PropertyCard from "../components/PropertyCard";
import RoommateListingCard from "../components/RoommateListingCard";
import { cityNames } from "@saknaha/constants/cities";
import { useBusinessData } from "../data/BusinessDataContext";
import type { Property, User } from "@saknaha/shared-types";
import { absoluteAppUrl, propertyPath } from "../utils/routes";

interface HousingPageProps {
  user: User | null;
  initialCity?: string;
  onProperty: (propertyId: string) => void;
  onRoommateDetails: (requestId: string) => void;
  onRoommates: () => void;
  onHome: () => void;
}

export default function HousingPage({
  user,
  initialCity = "all",
  onProperty,
  onRoommateDetails,
  onRoommates,
  onHome,
}: HousingPageProps) {
  const business = useBusinessData();
  const [city, setCity] = useState(initialCity);
  const [visibleCount, setVisibleCount] = useState(12);
  const [notice, setNotice] = useState("");
  const properties = useMemo(() => {
    return business.properties.filter((property) => {
      if (city !== "all" && property.city !== city) return false;
      return true;
    });
  }, [business.properties, city]);

  async function shareProperty(property: Property) {
    const url = absoluteAppUrl(propertyPath(property.id));
    try {
      if (navigator.share) {
        await navigator.share({ title: property.title, text: property.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice("تم نسخ رابط السكن.");
    } catch {
      setNotice("المشاركة غير متاحة في هذا المتصفح.");
    }
  }

  function toggleFavorite(property: Property) {
    if (user) {
      void business.setFavorite(property.id, !business.favoritePropertyIds.includes(property.id));
    }
    setNotice(user ? "تم تحديث المفضلة." : "سجلي الدخول لحفظ المفضلة على كل أجهزتك.");
  }

  const visibleProperties = properties.slice(0, visibleCount);
  const roommateListings = business.roommateRequests.map((request) => {
    const property =
      business.properties.find((item) => item.id === request.linkedPropertyId) ?? null;
    return { request, property };
  });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12" dir="rtl">
      <button
        className="mb-5 inline-flex min-h-10 items-center gap-2 border border-stone-200 bg-white px-3 text-sm font-extrabold text-ink shadow-sm transition hover:border-berry hover:text-berry"
        onClick={onHome}
        type="button"
      >
        <ArrowLeft className="rotate-180" size={17} aria-hidden="true" />
        العودة للرئيسية
      </button>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-wide text-berry">خيارات السكن</p>
          <h1 className="mt-1 text-2xl font-black text-ink md:text-3xl">جميع خيارات السكن</h1>
        </div>
        <label className="flex min-w-0 items-center gap-2 border border-stone-200 bg-white px-3 py-2 text-right shadow-sm sm:w-64">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-stone-600">
            <SlidersHorizontal size={17} aria-hidden="true" />
            المدينة
          </span>
          <select
            className="min-h-9 min-w-0 flex-1 bg-transparent text-sm font-extrabold text-ink outline-none"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          >
            <option value="all">كل المدن</option>
            {cityNames.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-black text-stone-600">
          {properties.length.toLocaleString("ar-SA")} عقار
        </p>
        {notice ? (
          <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-mintdeep">
            {notice}
          </p>
        ) : null}
      </div>

      {visibleProperties.length === 0 ? (
        <div className="panel max-w-2xl text-right">
          <h2 className="text-xl font-black text-ink">لا توجد عقارات مطابقة</h2>
          <p className="mt-2 text-sm font-bold text-stone-600">جربي مدينة أخرى.</p>
        </div>
      ) : (
        <section className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onView={() => onProperty(property.id)}
              isFavorite={business.favoritePropertyIds.includes(property.id)}
              onFavorite={toggleFavorite}
              onShare={shareProperty}
            />
          ))}
        </section>
      )}

      {visibleCount < properties.length ? (
        <div className="mt-8 flex justify-center">
          <button
            className="secondary-button"
            onClick={() => setVisibleCount((count) => count + 12)}
            type="button"
          >
            عرض المزيد
          </button>
        </div>
      ) : null}

      <section className="mt-12 border-y border-stone-200 py-8 text-right">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-berry">شريكات السكن</p>
            <h2 className="text-2xl font-black text-ink">تفضلين الانضمام لشريكة سكن؟</h2>
          </div>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-berry shadow-sm transition hover:border-berry hover:bg-linen"
            onClick={onRoommates}
            type="button"
            aria-label="عرض صفحة شريكات السكن كاملة"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {roommateListings.slice(0, 8).map((listing) => (
            <div key={listing.request.id} className="w-[82vw] max-w-sm shrink-0 sm:w-[360px]">
              <RoommateListingCard listing={listing} onDetails={onRoommateDetails} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
