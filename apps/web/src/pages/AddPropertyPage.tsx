import { ArrowRight, Camera, ChevronDown, MapPinned, Plus, Trash2, Video } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import Stepper from "../components/Stepper";
import { saveProperty } from "../services/propertyService";
import type {
  DistanceUnit,
  Owner,
  PaymentType,
  Property,
  PropertyClassification,
  PropertyType,
  ServiceNearby,
  ServiceType,
} from "@saknaha/shared-types";
import {
  distanceUnitLabels,
  formatRooms,
  formatServiceDistance,
  getGoogleMapsUrl,
} from "@saknaha/utils/propertyFormat";

const steps = [
  "الموقع",
  "معلومات السكن",
  "السعر والعقد",
  "الخدمات القريبة",
  "الصور",
  "المراجعة والنشر",
];
const propertyTypes: PropertyType[] = ["شقة", "دور", "غرفة", "عمارة", "سكن مشترك"];
const classifications: PropertyClassification[] = [
  "نسائي بالكامل",
  "عوائل",
  "دور نسائي داخل سكن عوائل",
  "متاح للجميع",
];
const paymentTypes: PaymentType[] = ["شهري", "سنوي", "سنة دراسية"];
const serviceTypes: ServiceType[] = [
  "بقالة",
  "مطعم",
  "مغسلة",
  "صيدلية",
  "مواصلات",
  "جامعة",
  "غير ذلك",
];
const distanceUnits = Object.keys(distanceUnitLabels) as DistanceUnit[];
const saknahaWhatsappNumber = "966500000000";

interface AddPropertyPageProps {
  owner: Owner;
  editing?: Property | null;
  onSaved: () => void;
  onBack: () => void;
}

export default function AddPropertyPage({ owner, editing, onSaved, onBack }: AddPropertyPageProps) {
  const [step, setStep] = useState(0);
  const [locationMode, setLocationMode] = useState<"manual" | "current">("manual");
  const [locationMessage, setLocationMessage] = useState("");
  const [property, setProperty] = useState<Property>(
    () =>
      editing ?? {
        id: "",
        ownerId: owner.id,
        ownerName: owner.fullName,
        ownerPhone: owner.phone,
        title: "",
        propertyLicenseNumber: "",
        city: "أبها",
        neighborhood: "",
        address: "",
        universityNearby: "جامعة الملك خالد - قريقر",
        googleMapsUrl: "",
        classification: "نسائي بالكامل",
        propertyType: "شقة",
        minRooms: 2,
        maxRooms: 3,
        floorsCount: 1,
        hasElevator: false,
        hasCleaningWorker: false,
        hasTransportService: false,
        universityBusPasses: false,
        bathrooms: 2,
        furnished: true,
        maxResidents: 3,
        roommateAllowed: true,
        requiresLeaseContract: true,
        price: 2000,
        paymentType: "شهري",
        negotiable: true,
        allowWhatsappContact: true,
        deposit: 0,
        priceNotes: "",
        services: [
          {
            id: "service-default",
            type: "بقالة",
            name: "بقالة قريبة",
            distanceValue: 5,
            distanceUnit: "walking_minutes",
          },
        ],
        images: [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
        ],
        videos: [],
        status: "draft",
        distanceText: "قريب من الجامعة",
        timeText: "10 دقائق بالسيارة",
        createdAt: new Date().toISOString(),
      },
  );

  const canGoNext = useMemo(() => {
    if (step === 0) return property.city && property.neighborhood && property.address;
    if (step === 1) {
      return (
        property.title &&
        property.propertyLicenseNumber &&
        property.minRooms > 0 &&
        property.maxRooms >= property.minRooms &&
        property.bathrooms > 0
      );
    }
    if (step === 2) return property.price > 0;
    if (step === 3)
      return property.services.every((service) => service.name && service.distanceValue > 0);
    if (step === 4) return property.images.length > 0;
    return true;
  }, [property, step]);

  function update<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty((current) => ({ ...current, [key]: value }));
  }

  function updateService(id: string, patch: Partial<ServiceNearby>) {
    update(
      "services",
      property.services.map((service) => (service.id === id ? { ...service, ...patch } : service)),
    );
  }

  function addService() {
    update("services", [
      ...property.services,
      {
        id: `service-${Date.now()}`,
        type: "بقالة",
        name: "",
        distanceValue: 5,
        distanceUnit: "walking_minutes",
      },
    ]);
  }

  function removeService(id: string) {
    update(
      "services",
      property.services.filter((service) => service.id !== id),
    );
  }

  function useMockCurrentLocation() {
    setLocationMode("current");
    setLocationMessage("تم وضع موقع تقريبي للتجربة. يمكن تعديل البيانات يدويًا قبل الحفظ.");
    setProperty((current) => ({
      ...current,
      city: current.city || "أبها",
      neighborhood: current.neighborhood || "حي النزهة",
      address: current.address || "موقع تقريبي قريب من الخدمات",
      universityNearby: current.universityNearby || "جامعة الملك خالد - قريقر",
      lat: current.lat ?? 18.239,
      lng: current.lng ?? 42.519,
    }));
  }

  function useManualLocation() {
    setLocationMode("manual");
    setLocationMessage("اكتب بيانات الموقع يدويًا، ويمكن ترك الإحداثيات فارغة.");
  }

  function publish(status: "published" | "draft") {
    saveProperty({
      ...property,
      status,
      ownerId: owner.id,
      ownerName: owner.fullName,
      ownerPhone: owner.phone,
    });
    onSaved();
  }

  function stopFormSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6 md:py-8">
      <button className="secondary-button mb-5" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" />
        رجوع إلى لوحة التحكم
      </button>
      <section className="panel">
        <div className="mb-6">
          <p className="text-sm font-black text-mintdeep">
            {editing ? "تعديل وحدة سكنية" : "إضافة سكن"}
          </p>
          <h1 className="text-3xl font-black text-ink">خطوات قصيرة وواضحة</h1>
          <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
            أدخل البيانات الأساسية فقط. يمكنك المراجعة قبل النشر.
          </p>
        </div>
        <Stepper steps={steps} currentStep={step} />
        <form className="mt-6" onSubmit={stopFormSubmit}>
          {step === 0 ? (
            <LocationStep
              property={property}
              update={update}
              mode={locationMode}
              message={locationMessage}
              onCurrentLocation={useMockCurrentLocation}
              onManualLocation={useManualLocation}
            />
          ) : null}
          {step === 1 ? <DetailsStep property={property} update={update} /> : null}
          {step === 2 ? <PricingStep property={property} update={update} /> : null}
          {step === 3 ? (
            <ServicesStep
              property={property}
              updateService={updateService}
              addService={addService}
              removeService={removeService}
            />
          ) : null}
          {step === 4 ? <ImagesStep owner={owner} property={property} update={update} /> : null}
          {step === 5 ? <ReviewStep property={property} /> : null}
        </form>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            className="secondary-button"
            disabled={step === 0}
            onClick={() => setStep((current) => current - 1)}
          >
            السابق
          </button>
          {step < steps.length - 1 ? (
            <button
              className="primary-button"
              disabled={!canGoNext}
              onClick={() => setStep((current) => current + 1)}
            >
              التالي
            </button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="secondary-button" onClick={() => publish("draft")}>
                حفظ كمسودة
              </button>
              <button className="primary-button" onClick={() => publish("published")}>
                حفظ السكن
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type UpdateFn = <K extends keyof Property>(key: K, value: Property[K]) => void;

function LocationStep({
  property,
  update,
  mode,
  message,
  onCurrentLocation,
  onManualLocation,
}: {
  property: Property;
  update: UpdateFn;
  mode: "manual" | "current";
  message: string;
  onCurrentLocation: () => void;
  onManualLocation: () => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className={mode === "current" ? "primary-button" : "secondary-button"}
          type="button"
          onClick={onCurrentLocation}
        >
          تحديد حسب موقعي الحالي
        </button>
        <button
          className={mode === "manual" ? "primary-button" : "secondary-button"}
          type="button"
          onClick={onManualLocation}
        >
          تحديد يدوي
        </button>
      </div>
      {message ? (
        <p className="rounded-2xl bg-sky-50 p-4 text-sm font-bold leading-7 text-skysoft">
          {message}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Input label="المدينة" value={property.city} onChange={(value) => update("city", value)} />
        <Input
          label="الحي"
          value={property.neighborhood}
          onChange={(value) => update("neighborhood", value)}
        />
        <Input
          label="العنوان المختصر"
          value={property.address}
          onChange={(value) => update("address", value)}
        />
        <Input
          label="أقرب جامعة أو جهة عمل"
          value={property.universityNearby}
          onChange={(value) => update("universityNearby", value)}
        />
        <Input
          label="خط العرض اختياري"
          value={String(property.lat ?? "")}
          onChange={(value) => update("lat", Number(value) || undefined)}
        />
        <Input
          label="خط الطول اختياري"
          value={String(property.lng ?? "")}
          onChange={(value) => update("lng", Number(value) || undefined)}
        />
      </div>
    </div>
  );
}

function DetailsStep({ property, update }: { property: Property; update: UpdateFn }) {
  function updateMinRooms(value: string) {
    const minRooms = Number(value) || 1;
    update("minRooms", minRooms);
    if (property.maxRooms < minRooms) update("maxRooms", minRooms);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Input
        label="اسم السكن"
        value={property.title}
        onChange={(value) => update("title", value)}
      />
      <Input
        label="رقم رخصة السكن"
        value={property.propertyLicenseNumber}
        onChange={(value) => update("propertyLicenseNumber", value)}
      />
      <Select
        label="نوع السكن"
        value={property.propertyType}
        options={propertyTypes}
        onChange={(value) => update("propertyType", value as PropertyType)}
      />
      <Select
        label="التصنيف"
        value={property.classification}
        options={classifications}
        onChange={(value) => update("classification", value as PropertyClassification)}
      />
      <Input label="عدد الغرف من" value={String(property.minRooms)} onChange={updateMinRooms} />
      <Input
        label="عدد الغرف إلى"
        value={String(property.maxRooms)}
        onChange={(value) =>
          update("maxRooms", Math.max(Number(value) || property.minRooms, property.minRooms))
        }
      />
      <Input
        label="عدد الأدوار"
        value={String(property.floorsCount)}
        onChange={(value) => update("floorsCount", Math.max(Number(value) || 1, 1))}
      />
      <Input
        label="عدد دورات المياه"
        value={String(property.bathrooms)}
        onChange={(value) => update("bathrooms", Number(value) || 0)}
      />
      <Input
        label="الحد الأقصى لعدد الساكنات"
        value={String(property.maxResidents)}
        onChange={(value) => update("maxResidents", Number(value) || 0)}
      />
      <Toggle
        label="هل يوجد مصعد؟"
        checked={property.hasElevator}
        onChange={(value) => update("hasElevator", value)}
      />
      <Toggle
        label="هل السكن مفروش؟"
        checked={property.furnished}
        onChange={(value) => update("furnished", value)}
      />
      <Toggle
        label="عقد إيجار إلزامي؟"
        checked={property.requiresLeaseContract ?? true}
        onChange={(value) => update("requiresLeaseContract", value)}
      />
      <Toggle
        label="هل يوجد عامل نظافة؟"
        checked={property.hasCleaningWorker}
        onChange={(value) => update("hasCleaningWorker", value)}
      />
      <Toggle
        label="هل يمر باص الجامعة عليه؟"
        checked={property.universityBusPasses}
        onChange={(value) => update("universityBusPasses", value)}
      />
    </div>
  );
}

function PricingStep({ property, update }: { property: Property; update: UpdateFn }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Input
        label="السعر"
        value={String(property.price)}
        onChange={(value) => update("price", Number(value) || 0)}
      />
      <Select
        label="نوع الدفع"
        value={property.paymentType}
        options={paymentTypes}
        onChange={(value) => update("paymentType", value as PaymentType)}
      />
      <Toggle
        label="السماح للتواصل عبر الواتساب؟"
        checked={property.allowWhatsappContact}
        onChange={(value) => update("allowWhatsappContact", value)}
      />
      <Input
        label="العربون إن وجد"
        value={String(property.deposit ?? "")}
        onChange={(value) => update("deposit", Number(value) || 0)}
      />
      <label className="md:col-span-2 xl:col-span-3">
        <span className="label">ملاحظات السعر</span>
        <textarea
          className="field min-h-28"
          value={property.priceNotes ?? ""}
          onChange={(event) => update("priceNotes", event.target.value)}
        />
      </label>
    </div>
  );
}

function ServicesStep({
  property,
  updateService,
  addService,
  removeService,
}: {
  property: Property;
  updateService: (id: string, patch: Partial<ServiceNearby>) => void;
  addService: () => void;
  removeService: (id: string) => void;
}) {
  return (
    <div className="grid gap-4">
      {property.services.map((service) => (
        <div
          className="grid gap-3 rounded-2xl border border-stone-100 bg-linen p-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
          key={service.id}
        >
          <Select
            label="نوع الخدمة"
            value={service.type}
            options={serviceTypes}
            onChange={(value) => updateService(service.id, { type: value as ServiceType })}
          />
          <Input
            label="اسم الخدمة"
            value={service.name}
            onChange={(value) => updateService(service.id, { name: value })}
          />
          <Input
            label="المسافة"
            value={String(service.distanceValue)}
            onChange={(value) => updateService(service.id, { distanceValue: Number(value) || 0 })}
          />
          <Select
            label="وحدة المسافة"
            value={service.distanceUnit}
            options={distanceUnits}
            optionLabel={(value) => distanceUnitLabels[value as DistanceUnit]}
            onChange={(value) => updateService(service.id, { distanceUnit: value as DistanceUnit })}
          />
          <button
            className="danger-button self-end"
            type="button"
            onClick={() => removeService(service.id)}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button className="secondary-button w-full" type="button" onClick={addService}>
        <Plus size={18} aria-hidden="true" />
        إضافة خدمة
      </button>
    </div>
  );
}

function ImagesStep({
  owner,
  property,
  update,
}: {
  owner: Owner;
  property: Property;
  update: UpdateFn;
}) {
  async function readFiles(files: FileList | null) {
    if (!files?.length) return;
    return Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
  }

  async function uploadImages(files: FileList | null) {
    const images = await readFiles(files);
    if (!images?.length) return;
    update("images", [...property.images, ...images]);
  }

  async function uploadVideos(files: FileList | null) {
    const videos = await readFiles(files);
    if (!videos?.length) return;
    update("videos", [...(property.videos ?? []), ...videos]);
  }

  function photographyRequestUrl() {
    const propertyLink = property.id
      ? `${window.location.origin}/property/${encodeURIComponent(property.id)}`
      : "سيظهر رابط السكن بعد الحفظ";
    const mapsLink = getGoogleMapsUrl(property) || "غير مضاف";
    const message = [
      "طلب تصوير سكن من منصة سكنها",
      `اسم صاحب السكن: ${owner.fullName}`,
      `رقم الجوال: ${owner.phone}`,
      `اسم السكن: ${property.title || "غير محدد"}`,
      `رقم السكن/الرخصة: ${property.propertyLicenseNumber || "غير محدد"}`,
      `رابط السكن: ${propertyLink}`,
      `رابط Google Maps: ${mapsLink}`,
    ].join("\n");

    return `https://wa.me/${saknahaWhatsappNumber}?text=${encodeURIComponent(message)}`;
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <label>
          <span className="label">رابط Google Maps للسكن</span>
          <div className="relative">
            <input
              className="field pr-12"
              dir="ltr"
              placeholder="https://www.google.com/maps/..."
              value={property.googleMapsUrl}
              onChange={(event) => update("googleMapsUrl", event.target.value)}
            />
            <MapPinned
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-500"
              size={18}
              aria-hidden="true"
            />
          </div>
          <p className="mt-2 text-xs font-bold leading-6 text-stone-500">
            أضف رابط موقع السكن من Google Maps حتى تستطيع الباحثة فتح الموقع الحقيقي.
          </p>
        </label>
        <label>
          <span className="label">رفع صور من الجهاز</span>
          <input
            className="field"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => uploadImages(event.target.files)}
          />
        </label>
      </div>
      <div className="grid gap-3 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-4 lg:grid-cols-[1fr_1fr]">
        <label>
          <span className="label inline-flex items-center gap-2">
            <Video size={18} aria-hidden="true" />
            رفع فيديو للسكن
          </span>
          <input
            className="field"
            type="file"
            accept="video/*"
            multiple
            onChange={(event) => uploadVideos(event.target.files)}
          />
          <p className="mt-2 text-xs font-bold leading-6 text-stone-500">
            يفضل رفع فيديو قصير وواضح يشرح المدخل، الغرف، ودورات المياه.
          </p>
        </label>
        <div className="rounded-2xl bg-white/80 p-4">
          <div className="flex items-center gap-2 text-berry">
            <Camera size={20} aria-hidden="true" />
            <h3 className="font-black text-ink">تصوير احترافي للسكن</h3>
          </div>
          <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
            إذا رغبت بأن يأتي فريق سكنها لتصوير الوحدة بشكل احترافي، يمكنك طلب التصوير. سعر الخدمة
            يحدد حسب الموقع.
          </p>
          <a
            className="primary-button mt-4 w-full"
            href={photographyRequestUrl()}
            target="_blank"
            rel="noreferrer"
          >
            <Camera size={18} aria-hidden="true" />
            طلب تصوير
          </a>
          <p className="mt-2 text-xs font-bold leading-6 text-stone-500">
            لاحقًا سيرسل الطلب مباشرة إلى واتساب فريق سكنها مع بيانات صاحب السكن ورقم الرخصة وروابط
            السكن والموقع.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {property.images.map((image) => (
          <div className="relative" key={image}>
            <img src={image} alt="صورة السكن" className="h-40 w-full rounded-2xl object-cover" />
            <button
              className="danger-button absolute left-3 top-3 !min-h-10 !px-3"
              type="button"
              onClick={() =>
                update(
                  "images",
                  property.images.filter((item) => item !== image),
                )
              }
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {(property.videos ?? []).length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(property.videos ?? []).map((video) => (
            <div className="relative" key={video}>
              <video
                src={video}
                controls
                className="h-48 w-full rounded-2xl bg-stone-900 object-cover"
              />
              <button
                className="danger-button absolute left-3 top-3 !min-h-10 !px-3"
                type="button"
                onClick={() =>
                  update(
                    "videos",
                    (property.videos ?? []).filter((item) => item !== video),
                  )
                }
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReviewStep({ property }: { property: Property }) {
  const googleMapsUrl = getGoogleMapsUrl(property);
  const items = [
    ["اسم السكن", property.title || "سكن جديد"],
    ["رقم رخصة السكن", property.propertyLicenseNumber],
    ["رابط Google Maps", googleMapsUrl ? "مضاف" : "غير مضاف"],
    [
      "الفيديوهات",
      (property.videos ?? []).length > 0
        ? `${(property.videos ?? []).length.toLocaleString("ar-SA")} فيديو`
        : "لا يوجد",
    ],
    ["المدينة", property.city],
    ["الحي", property.neighborhood],
    ["التصنيف", property.classification],
    ["عدد الغرف", formatRooms(property)],
    ["عدد الأدوار", `${property.floorsCount.toLocaleString("ar-SA")}`],
    ["يوجد مصعد", property.hasElevator ? "نعم" : "لا"],
    ["عدد دورات المياه", `${property.bathrooms.toLocaleString("ar-SA")}`],
    ["الحد الأقصى للسكان", `${property.maxResidents.toLocaleString("ar-SA")}`],
    ["مفروش", property.furnished ? "نعم" : "لا"],
    ["عقد إيجار إلزامي", (property.requiresLeaseContract ?? true) ? "نعم" : "لا"],
    ["عامل نظافة", property.hasCleaningWorker ? "نعم" : "لا"],
    ["باص الجامعة يمر عليه", property.universityBusPasses ? "نعم" : "لا"],
    ["السعر", `${property.price.toLocaleString("ar-SA")} ريال`],
    ["نوع الدفع", property.paymentType],
    ["السماح للتواصل عبر الواتساب", property.allowWhatsappContact ? "نعم" : "لا"],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <div>
        <img
          src={property.images[0]}
          alt={property.title}
          className="h-72 w-full rounded-2xl object-cover"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {property.images.slice(1, 4).map((image) => (
            <img
              key={image}
              src={image}
              alt="صورة إضافية للسكن"
              className="h-24 w-full rounded-xl object-cover"
            />
          ))}
        </div>
        {(property.videos ?? []).length > 0 ? (
          <div className="mt-3 grid gap-2">
            {(property.videos ?? []).slice(0, 2).map((video) => (
              <video
                key={video}
                src={video}
                controls
                className="h-40 w-full rounded-xl bg-stone-900 object-cover"
              />
            ))}
          </div>
        ) : null}
      </div>
      <div className="rounded-2xl bg-linen p-5">
        <h2 className="text-2xl font-black text-ink">مراجعة نهائية قبل النشر</h2>
        <p className="mt-2 text-sm font-bold leading-7 text-stone-600">
          تأكد من صحة البيانات. هذه المعلومات ستظهر للباحثات في تفاصيل السكن.
        </p>
        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map(([label, value]) => (
            <div className="rounded-xl bg-white/80 p-3" key={label}>
              <dt className="text-xs font-bold text-stone-500">{label}</dt>
              <dd className="mt-1 font-black text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-xl bg-white/80 p-4">
          <p className="font-black text-ink">الخدمات القريبة</p>
          <ul className="mt-2 space-y-2 text-sm font-bold leading-7 text-stone-600">
            {property.services.map((service) => (
              <li key={service.id}>
                {service.type}: {service.name} - {formatServiceDistance(service)}
              </li>
            ))}
          </ul>
        </div>
        {googleMapsUrl ? (
          <a
            className="secondary-button mt-4 w-full"
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
          >
            <MapPinned size={18} aria-hidden="true" />
            فتح موقع السكن في Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  optionLabel,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  optionLabel?: (value: string) => string;
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <span className="relative block">
        <select
          className="field field-select"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {optionLabel ? optionLabel(option) : option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-500"
          size={18}
          aria-hidden="true"
        />
      </span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={checked ? "primary-button" : "secondary-button"}
          onClick={() => onChange(true)}
        >
          نعم
        </button>
        <button
          type="button"
          className={!checked ? "primary-button" : "secondary-button"}
          onClick={() => onChange(false)}
        >
          لا
        </button>
      </div>
    </div>
  );
}
