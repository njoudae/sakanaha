import DiscoveryCarousel from "../components/DiscoveryCarousel";
import PropertyCard from "../components/PropertyCard";
import RoommateListingCard from "../components/RoommateListingCard";
import {
  getPublishedProperties,
  getPropertyById,
  getRoommateRequests,
} from "../services/propertyService";
import type { Property, RoommateRequest } from "@saknaha/shared-types";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { regionForCity, saudiRegions } from "@saknaha/constants/locations";

interface LandingPageProps {
  onUser: () => void;
  onHousing: () => void;
  onCity: (city: string) => void;
  onRoommates: () => void;
  onRoommateDetails: (requestId: string) => void;
}

interface RoommateListing {
  request: RoommateRequest;
  property: Property;
}

const faqItems = [
  {
    question: "كيف أستخدم سكنها كمالك عقار؟",
    answer:
      "بعد الضغط على تسجيل الدخول اختاري خيار مالك/ة عقار، ثم سجلي الدخول أو أنشئي حساباً جديداً. بعد ذلك ستظهر لك لوحة التحكم الخاصة بك، ومن خلالها يمكنك إضافة العقارات، تعديل بياناتها، رفع صور واضحة، ومراجعة صفحة المعاينة قبل نشر السكن للباحثات.",
  },
  {
    question: "كيف أبحث عن سكن مناسب؟",
    answer:
      "ادخلي إلى صفحة خيارات السكن المتاحة وحددي المنطقة المناسبة لك. ستظهر لك كافة العقارات المضافة حتى الآن، ويمكنك مشاهدة الصور ومقاطع الفيديو، ومراجعة المميزات مثل توفر الخدمات، ومدى قرب السكن من الجامعة أو مقر العمل، ثم اختيار السكن المناسب واستئجاره.",
  },
  {
    question: "أنا حاجزة سكن وأحتاج شريكات، كيف أضيف طلبي؟",
    answer:
      "إذا قمتِ بحجز سكن من خيارات السكن المتاحة على المنصة، فبعد الحجز سيظهر لك خيار البحث عن شريكة سكن. عند إدخال البيانات ستظهر بطاقتك في صفحة البحث عن شريكة سكن. وإذا كنتِ مستأجرة سكناً خارج المنصة، فمن لوحة التحكم الخاصة بك اختاري البحث عن شريكة سكن، ثم عبئي البيانات وستظهر البطاقة برسوم قدرها 30 ريال.",
  },
  {
    question: "هل بطاقة شريكة السكن مرتبطة فعلياً بالعقار؟",
    answer:
      "إذا كانت البطاقة مرتبطة بعقار موجود على المنصة، فيمكنك فتح العقار ومشاهدة تفاصيله وصوره ومميزاته. أما إذا لم تكن مرتبطة بعقار موجود على المنصة، فتواصلي مع المعلنة مباشرة لمناقشة تفاصيل السكن والترتيبات المناسبة.",
  },
];

export default function LandingPage({
  onHousing,
  onRoommates,
  onRoommateDetails,
}: LandingPageProps) {
  const [activeSection, setActiveSection] = useState<"all" | "housing" | "roommates">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const matchesLocation = (property: Property) => {
    if (!selectedRegion) return true;
    return (property.region || regionForCity(property.city)) === selectedRegion;
  };
  const housing = getPublishedProperties().filter(matchesLocation).slice(0, 10);
  const roommates = getRoommateRequests()
    .map((request) => {
      const property = getPropertyById(request.propertyId);
      return property ? { request, property } : null;
    })
    .filter((listing): listing is RoommateListing =>
      Boolean(listing && matchesLocation(listing.property)),
    );
  const hasLocationFilter = Boolean(selectedRegion);

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
            className={`relative inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-black shadow-sm transition sm:px-3 md:absolute md:right-0 md:top-0 ${
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
            className="grid min-w-0 flex-1 grid-cols-3 gap-1 rounded-lg bg-linen p-1 md:w-full md:max-w-lg md:flex-none"
            aria-label="أقسام الصفحة الرئيسية"
          >
            {[
              { value: "all", label: "الكل" },
              { value: "housing", label: "السكن" },
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
          <section
            id="landing-location-filters"
            className="mx-4 mt-2 grid gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-sm sm:grid-cols-[1fr_auto] md:mx-8 md:max-w-xl"
            aria-label="تصفية حسب المنطقة"
          >
            <label className="grid gap-1.5 text-sm font-black text-ink">
              المنطقة
              <select
                className="min-h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm font-bold outline-none focus:border-berry"
                value={selectedRegion}
                onChange={(event) => setSelectedRegion(event.target.value)}
              >
                <option value="">كل المناطق</option>
                {saudiRegions.map((region) => (
                  <option key={region.name} value={region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="secondary-button self-end"
              disabled={!hasLocationFilter}
              onClick={() => setSelectedRegion("")}
            >
              <X size={17} aria-hidden="true" />
              مسح
            </button>
          </section>
        ) : null}

        {activeSection !== "roommates" ? (
          <DiscoveryCarousel
            title="خيارات السكن"
            items={housing}
            onTitleClick={onHousing}
            railClassName="lg:relative lg:-left-8"
            renderItem={(property) => (
              <PropertyCard
                property={property}
                compact
                onView={onHousing}
                actionLabel="تصفح خيارات السكن"
              />
            )}
            emptyText="لا توجد عقارات منشورة حالياً."
          />
        ) : null}

        {activeSection !== "housing" ? (
          <DiscoveryCarousel
            title="خيارات شريكات السكن"
            items={roommates}
            onTitleClick={onRoommates}
            renderItem={(listing) => (
              <RoommateListingCard listing={listing} onDetails={onRoommateDetails} />
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
          <div className="mx-auto grid max-w-6xl gap-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-stone-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-right text-base font-black text-ink marker:hidden md:text-lg">
                  <span>{item.question}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-500">
                    <span className="text-2xl leading-none group-open:hidden">+</span>
                    <span className="hidden text-xl leading-none group-open:block">×</span>
                  </span>
                </summary>
                <p className="border-t border-stone-100 px-5 pb-5 pt-4 text-sm font-bold leading-7 text-stone-600 md:text-base">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
