import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cityNames } from "@saknaha/constants/cities";
import RoommateListingCard from "../components/RoommateListingCard";
import {
  getPropertyById,
  getPublishedProperties,
  getRoommateRequests,
} from "../services/propertyService";
import type { Property, RoommateRequest } from "@saknaha/shared-types";

interface RoommatesPageProps {
  onDetails: (requestId: string) => void;
  onProperty: (propertyId: string) => void;
  onHousing: () => void;
  onHome: () => void;
  initialCity?: string;
}

interface RoommateListing {
  request: RoommateRequest;
  property: Property;
}

export default function RoommatesPage({
  onDetails,
  onProperty,
  onHousing,
  onHome,
  initialCity = "all",
}: RoommatesPageProps) {
  const [city, setCity] = useState(initialCity);

  const listings = useMemo(() => {
    return getRoommateRequests()
      .map((request) => {
        const property = getPropertyById(request.propertyId);
        return property ? { request, property } : null;
      })
      .filter((listing): listing is RoommateListing => {
        if (!listing) return false;
        if (city !== "all" && listing.property.city !== city) return false;
        return true;
      });
  }, [city]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12" dir="rtl">
      <button
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-black text-ink shadow-sm transition hover:border-berry hover:text-berry"
        onClick={onHome}
        type="button"
      >
        <ArrowRight size={17} aria-hidden="true" />
        الرجوع للصفحة الرئيسية
      </button>

      <header className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="text-right">
          <p className="text-sm font-black uppercase tracking-wide text-berry">شريكات السكن</p>
          <h1 className="mt-2 text-3xl font-black text-ink md:text-4xl">
            سيدات قمن باستئجار سكن وبحاجة لشريكات سكن
          </h1>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white/90 p-4 text-right shadow-sm">
          <p className="mb-3 text-sm font-black text-ink">فلتر المدينة</p>
          <label>
            <span className="label">المدينة</span>
            <select
              className="field field-select"
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
        </div>
      </header>

      {listings.length === 0 ? (
        <div className="panel text-center">
          <h2 className="text-xl font-black text-ink">لا توجد فرص مطابقة</h2>
          <p className="mt-2 text-sm font-bold text-stone-600">جربي مدينة أخرى.</p>
        </div>
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <RoommateListingCard key={listing.request.id} listing={listing} onDetails={onDetails} />
          ))}
        </section>
      )}

      <section className="mt-12 border-y border-stone-200 py-8 text-right">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-berry">خيارات السكن</p>
            <h2 className="text-2xl font-black text-ink">
              لم تجدي شريكة مناسبة؟ احجزي السكن الخاص بك
            </h2>
          </div>
          <button
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-berry shadow-sm transition hover:border-berry hover:bg-linen"
            onClick={onHousing}
            type="button"
            aria-label="عرض صفحة خيارات السكن كاملة"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {getPublishedProperties()
            .slice(0, 8)
            .map((property) => (
              <button
                key={property.id}
                className="w-72 shrink-0 rounded-2xl border border-stone-200 bg-white p-3 text-right shadow-sm transition hover:border-berry"
                onClick={() => onProperty(property.id)}
                type="button"
              >
                <img
                  src={property.images[0]}
                  alt={property.title}
                  className="h-32 w-full rounded-xl object-cover"
                />
                <h3 className="mt-3 line-clamp-1 text-lg font-black text-ink">
                  {property.city}، {property.neighborhood}
                </h3>
                <p className="mt-2 font-black text-ink">
                  {property.price.toLocaleString("ar-SA")} ر.س / شهر
                </p>
              </button>
            ))}
        </div>
      </section>
    </main>
  );
}
