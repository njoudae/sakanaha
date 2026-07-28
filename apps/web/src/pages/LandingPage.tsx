import DiscoveryCarousel from "../components/DiscoveryCarousel";
import PropertyCard from "../components/PropertyCard";
import RoommateListingCard from "../components/RoommateListingCard";
import { useBusinessData } from "../data/BusinessDataContext";
import type { Property } from "@saknaha/shared-types";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { cityNames } from "@saknaha/constants/cities";
import FaqAccordion from "../components/FaqAccordion";

interface LandingPageProps {
  onUser: () => void;
  onHousing: () => void;
  onProperty: (propertyId: string) => void;
  onCity: (city: string) => void;
  onRoommates: () => void;
  onRoommateDetails: (requestId: string) => void;
}

export default function LandingPage({
  onHousing,
  onProperty,
  onRoommates,
  onRoommateDetails,
}: LandingPageProps) {
  const business = useBusinessData();
  const [activeSection, setActiveSection] = useState<"all" | "housing" | "roommates">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState("all");
  const matchesLocation = (property: Property) => {
    if (selectedCity === "all") return true;
    return property.city === selectedCity;
  };
  const housing = business.properties.filter(matchesLocation).slice(0, 10);
  const roommates = business.roommateRequests
    .map((request) => {
      const property =
        business.properties.find((item) => item.id === request.linkedPropertyId) ?? null;
      return { request, property };
    })
    .filter((listing) =>
      listing.property
        ? matchesLocation(listing.property)
        : selectedCity === "all" ||
          listing.request.externalHousing?.city === selectedCity ||
          listing.request.city === selectedCity,
    );
  const hasLocationFilter = selectedCity !== "all";

  return (
    <main className="overflow-x-hidden" dir="rtl">
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 pb-2 pt-4 text-center md:px-8 md:pb-3 md:pt-5">
        <h1 className="text-lg font-black leading-tight text-ink sm:text-xl lg:text-2xl">
          جميع خيارات السكن النسائية في مكان واحد
        </h1>
      </section>

      <div className="mx-auto w-full max-w-7xl">
        <div className="mx-4 flex min-h-10 items-stretch gap-1.5 md:relative md:mx-8 md:justify-center">
          <button
            type="button"
            className={`relative order-2 inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-black shadow-sm transition sm:px-3 md:absolute md:left-0 md:top-0 ${
              filtersOpen || hasLocationFilter
                ? "border-berry bg-white text-berry"
                : "border-stone-200 bg-white text-ink hover:border-berry hover:text-berry"
            }`}
            aria-label="تصفية"
            aria-expanded={filtersOpen}
            aria-controls="landing-location-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span className="hidden sm:inline">تصفية</span>
            {hasLocationFilter ? (
              <span
                className="absolute -left-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-berry"
                aria-label="التصفية مفعلة"
              />
            ) : null}
          </button>

          <nav
            className="order-1 grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-lg bg-linen p-1 md:w-full md:max-w-lg md:flex-none"
            aria-label="أقسام الصفحة الرئيسية"
          >
            {[
              { value: "all", label: "الكل" },
              { value: "housing", label: "خيارات السكن" },
              { value: "roommates", label: "شريكات السكن" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                className={`min-h-8 rounded-md px-1 text-[10px] font-black transition sm:text-xs ${
                  activeSection === item.value
                    ? "bg-berry text-white shadow-sm"
                    : "bg-transparent text-stone-600 hover:bg-white"
                }`}
                aria-pressed={activeSection === item.value}
                onClick={() => setActiveSection(item.value as "all" | "housing" | "roommates")}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {filtersOpen ? (
          <div
            id="landing-location-filters"
            className="mx-4 mt-2 flex justify-end md:mx-8"
            aria-label="تصفية حسب المدينة"
          >
            <label className="flex w-full min-w-0 items-center gap-2 border border-stone-200 bg-white px-3 py-2 text-right shadow-sm sm:w-64">
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-stone-600">
                <SlidersHorizontal size={17} aria-hidden="true" />
                المدينة
              </span>
              <select
                className="min-h-9 min-w-0 flex-1 bg-transparent text-sm font-extrabold text-ink outline-none"
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
              >
                <option value="all">كل المدن</option>
                {cityNames.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {activeSection !== "roommates" ? (
          <DiscoveryCarousel
            title="جميع خيارات السكن"
            items={housing}
            onTitleClick={onHousing}
            itemClassName="h-[520px] w-[88vw] max-w-[390px] shrink-0 snap-start sm:w-[360px]"
            renderItem={(property) => (
              <PropertyCard
                property={property}
                compact
                featured
                onView={() => onProperty(property.id)}
                actionLabel="عرض تفاصيل السكن"
              />
            )}
            emptyText="لا توجد عقارات منشورة حالياً."
          />
        ) : null}

        {activeSection !== "housing" ? (
          <DiscoveryCarousel
            title="شريكات السكن"
            items={roommates}
            onTitleClick={onRoommates}
            itemClassName="w-[84vw] max-w-[360px] shrink-0 snap-start"
            renderItem={(listing) => (
              <RoommateListingCard listing={listing} onDetails={onRoommateDetails} featured />
            )}
            emptyText="لا توجد فرص شريكة سكن حالياً."
          />
        ) : null}

        <section className="w-full px-4 py-5 text-right md:px-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-ink md:text-3xl">الخدمات</h2>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">
              قريباً
            </span>
          </div>
        </section>

        <section className="w-full px-4 py-8 text-right md:px-8" id="faq-preview">
          <h2 className="mb-6 text-center text-2xl font-black text-ink md:text-3xl">
            الأسئلة الشائعة عن خدمات سكنها
          </h2>
          <div className="mx-auto max-w-6xl">
            <FaqAccordion initiallyOpen={-1} />
          </div>
        </section>
      </div>
    </main>
  );
}
