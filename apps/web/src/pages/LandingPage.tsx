import DiscoveryCarousel from "../components/DiscoveryCarousel";
import PropertyCard from "../components/PropertyCard";
import RoommateListingCard from "../components/RoommateListingCard";
import {
  getPublishedProperties,
  getPropertyById,
  getRoommateRequests,
} from "../services/propertyService";
import type { Property, RoommateRequest } from "@saknaha/shared-types";

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
  const housing = getPublishedProperties().slice(0, 10);
  const roommates = getRoommateRequests()
    .map((request) => {
      const property = getPropertyById(request.propertyId);
      return property ? { request, property } : null;
    })
    .filter(Boolean) as RoommateListing[];

  return (
    <main className="overflow-x-hidden" dir="rtl">
      <section className="mx-auto flex min-h-[26vh] w-full max-w-5xl -translate-y-6 flex-col items-center justify-center px-4 pb-6 pt-6 text-center md:px-8 md:pb-7 md:pt-8">
        <h1 className="text-3xl font-black leading-tight text-ink sm:text-4xl lg:text-5xl">
          جميع خيارات السكن النسائية في مكان واحد
        </h1>
      </section>

      <div className="mx-auto -mt-8 w-full max-w-7xl md:-mt-10">
        <DiscoveryCarousel
          title="خيارات السكن المتاحة"
          items={housing}
          onTitleClick={onHousing}
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

        <DiscoveryCarousel
          title="ساكنات بحاجة لشريكة سكن"
          items={roommates}
          onTitleClick={onRoommates}
          renderItem={(listing) => (
            <RoommateListingCard listing={listing} onDetails={onRoommateDetails} />
          )}
          emptyText="لا توجد فرص شريكة سكن حالياً."
        />

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
