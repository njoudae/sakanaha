import { ArrowRight, Camera, ChevronDown, MapPinned, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import Stepper from "../components/Stepper";
import { saveProperty } from "../services/propertyService";
import type {
  Owner,
  PaymentType,
  Property,
  PropertyClassification,
  PropertyType,
} from "@saknaha/shared-types";
import { formatRooms, getGoogleMapsUrl } from "@saknaha/utils/propertyFormat";

const steps = ["الموقع", "معلومات السكن", "السعر والصور", "المراجعة والنشر"];

const classificationOptions: Array<{ label: string; value: PropertyClassification }> = [
  { label: "عمارة نسائية بالكامل", value: "نسائي بالكامل" },
  { label: "دور نسائي في عمارة عوائل", value: "دور نسائي داخل سكن عوائل" },
  { label: "فندق", value: "متاح للجميع" },
  { label: "شقة في عمارة عوائل", value: "عوائل" },
];

const propertyTypeOptions: Array<{ label: string; value: PropertyType }> = [
  { label: "عمارة", value: "عمارة" },
  { label: "شقة", value: "شقة" },
  { label: "فندق", value: "غرفة" },
  { label: "دور", value: "دور" },
];

const paymentTypes: PaymentType[] = ["شهري", "سنوي", "سنة دراسية"];

interface AddPropertyPageProps {
  owner: Owner;
  editing?: Property | null;
  onSaved: () => void;
  onBack: () => void;
}

export default function AddPropertyPage({ owner, editing, onSaved, onBack }: AddPropertyPageProps) {
  const [step, setStep] = useState(0);
  const [property, setProperty] = useState<Property>(
    () =>
      editing ?? {
        id: "",
        ownerId: owner.id,
        ownerName: owner.fullName,
        ownerPhone: owner.phone,
        title: "",
        propertyLicenseNumber: "",
        city: "",
        neighborhood: "",
        address: "",
        universityNearby: "",
        googleMapsUrl: "",
        classification: "نسائي بالكامل",
        propertyType: "عمارة",
        minRooms: 1,
        maxRooms: 3,
        floorsCount: 1,
        hasElevator: false,
        hasCleaningWorker: false,
        hasTransportService: false,
        universityBusPasses: false,
        bathrooms: 1,
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
        services: [],
        images: [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80",
        ],
        videos: [],
        status: "draft",
        distanceText: "قريب من الخدمات",
        timeText: "10 دقائق بالسيارة",
        createdAt: new Date().toISOString(),
      },
  );

  const canGoNext = useMemo(() => {
    if (step === 0) return property.city && property.neighborhood && property.classification;
    if (step === 1) {
      return (
        property.propertyType &&
        property.maxResidents > 0 &&
        property.minRooms > 0 &&
        property.maxRooms >= property.minRooms
      );
    }
    if (step === 2) return property.price > 0 && property.images.length > 0;
    return true;
  }, [property, step]);

  function update<K extends keyof Property>(key: K, value: Property[K]) {
    setProperty((current) => ({ ...current, [key]: value }));
  }

  function stopFormSubmit(event: FormEvent) {
    event.preventDefault();
  }

  function updateRooms(key: "minRooms" | "maxRooms", value: string) {
    const numeric = Number(value.replace(/\D/g, ""));
    if (!numeric) {
      update(key, 0);
      return;
    }
    if (key === "minRooms") {
      update("minRooms", numeric);
      if (property.maxRooms && property.maxRooms < numeric) update("maxRooms", numeric);
      return;
    }
    update("maxRooms", Math.max(numeric, property.minRooms || 1));
  }

  async function readFiles(files: FileList | null) {
    if (!files?.length) return [];
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
    if (!images.length) return;
    update("images", [...property.images, ...images]);
  }

  function publish(status: "published" | "draft") {
    saveProperty({
      ...property,
      status,
      title: property.title || selectedClassificationLabel(property.classification),
      address: property.address || `${property.city} - ${property.neighborhood}`,
      propertyLicenseNumber: property.propertyLicenseNumber || "غير محدد",
      universityNearby: property.universityNearby || "غير محدد",
      distanceText: property.distanceText || "قريب من الخدمات",
      timeText: property.timeText || "10 دقائق بالسيارة",
      ownerId: owner.id,
      ownerName: owner.fullName,
      ownerPhone: owner.phone,
    });
    onSaved();
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-5 md:px-6 md:py-8" dir="rtl">
      <button className="secondary-button mb-5" onClick={onBack} type="button">
        <ArrowRight size={18} aria-hidden="true" />
        رجوع إلى لوحة التحكم
      </button>

      <section className="panel">
        <div className="mb-6 text-right">
          <p className="text-sm font-black text-mintdeep">
            {editing ? "تعديل وحدة سكنية" : "إضافة سكن"}
          </p>
          <h1 className="text-3xl font-black text-ink">بيانات السكن</h1>
        </div>

        <Stepper steps={steps} currentStep={step} />

        {step === steps.length - 1 ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep((current) => current - 1)}
              type="button"
            >
              السابق
            </button>
            <div className="grid gap-2 sm:grid-cols-2">
              <button className="secondary-button" onClick={() => publish("draft")} type="button">
                حفظ كمسودة
              </button>
              <button className="primary-button" onClick={() => publish("published")} type="button">
                حفظ السكن
              </button>
            </div>
          </div>
        ) : null}

        <form className="mt-6" onSubmit={stopFormSubmit}>
          {step === 0 ? <LocationStep property={property} update={update} /> : null}
          {step === 1 ? (
            <DetailsStep property={property} update={update} updateRooms={updateRooms} />
          ) : null}
          {step === 2 ? (
            <MediaStep property={property} update={update} uploadImages={uploadImages} />
          ) : null}
          {step === 3 ? <ReviewStep property={property} /> : null}
        </form>

        {step < steps.length - 1 ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              className="secondary-button"
              disabled={step === 0}
              onClick={() => setStep((current) => current - 1)}
              type="button"
            >
              السابق
            </button>
            <button
              className="primary-button"
              disabled={!canGoNext}
              onClick={() => setStep((current) => current + 1)}
              type="button"
            >
              التالي
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

type UpdateFn = <K extends keyof Property>(key: K, value: Property[K]) => void;

function LocationStep({ property, update }: { property: Property; update: UpdateFn }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Input
        label="المدينة"
        placeholder="مثال: أبها"
        value={property.city}
        onChange={(value) => update("city", value)}
      />
      <Input
        label="الحي"
        placeholder="مثال: النزهة"
        value={property.neighborhood}
        onChange={(value) => update("neighborhood", value)}
      />
      <Select
        label="التصنيف"
        value={property.classification}
        options={classificationOptions}
        onChange={(value) => update("classification", value as PropertyClassification)}
      />
      <Input
        label="العنوان المختصر"
        placeholder="مثال: قريب من الجامعة والخدمات"
        value={property.address}
        onChange={(value) => update("address", value)}
      />
      <Input
        label="أقرب جامعة أو جهة عمل"
        placeholder="مثال: جامعة الملك خالد"
        value={property.universityNearby}
        onChange={(value) => update("universityNearby", value)}
      />
      <Input
        label="رقم رخصة السكن"
        placeholder="اختياري"
        value={property.propertyLicenseNumber}
        onChange={(value) => update("propertyLicenseNumber", value)}
      />
    </div>
  );
}

function DetailsStep({
  property,
  update,
  updateRooms,
}: {
  property: Property;
  update: UpdateFn;
  updateRooms: (key: "minRooms" | "maxRooms", value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Select
        label="نوع السكن"
        value={property.propertyType}
        options={propertyTypeOptions}
        onChange={(value) => update("propertyType", value as PropertyType)}
      />
      <Input
        label="العدد المتاح"
        placeholder="مثال: 3"
        value={property.maxResidents ? String(property.maxResidents) : ""}
        inputMode="numeric"
        onChange={(value) => update("maxResidents", Number(value.replace(/\D/g, "")) || 0)}
      />
      <Input
        label="عدد الغرف من"
        placeholder="1"
        value={property.minRooms ? String(property.minRooms) : ""}
        inputMode="numeric"
        onChange={(value) => updateRooms("minRooms", value)}
      />
      <Input
        label="عدد الغرف إلى"
        placeholder="3"
        value={property.maxRooms ? String(property.maxRooms) : ""}
        inputMode="numeric"
        onChange={(value) => updateRooms("maxRooms", value)}
      />
      <Input
        label="عدد دورات المياه"
        placeholder="مثال: 2"
        value={property.bathrooms ? String(property.bathrooms) : ""}
        inputMode="numeric"
        onChange={(value) => update("bathrooms", Number(value.replace(/\D/g, "")) || 0)}
      />
      <Toggle
        label="هل السكن مفروش؟"
        checked={property.furnished}
        onChange={(value) => update("furnished", value)}
      />
    </div>
  );
}

function MediaStep({
  property,
  update,
  uploadImages,
}: {
  property: Property;
  update: UpdateFn;
  uploadImages: (files: FileList | null) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Input
          label="السعر"
          placeholder="مثال: 2000"
          value={property.price ? String(property.price) : ""}
          inputMode="numeric"
          onChange={(value) => update("price", Number(value.replace(/\D/g, "")) || 0)}
        />
        <Select
          label="نوع الدفع"
          value={property.paymentType}
          options={paymentTypes.map((value) => ({ label: value, value }))}
          onChange={(value) => update("paymentType", value as PaymentType)}
        />
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
        </label>
      </div>

      <label>
        <span className="label inline-flex items-center gap-2">
          <Camera size={18} aria-hidden="true" />
          رفع صور السكن
        </span>
        <input
          className="field"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => uploadImages(event.target.files)}
        />
      </label>

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
    </div>
  );
}

function ReviewStep({ property }: { property: Property }) {
  const googleMapsUrl = getGoogleMapsUrl(property);
  const items = [
    ["المدينة", property.city],
    ["الحي", property.neighborhood],
    ["التصنيف", selectedClassificationLabel(property.classification)],
    ["نوع السكن", selectedPropertyTypeLabel(property.propertyType)],
    ["العدد المتاح", property.maxResidents.toLocaleString("ar-SA")],
    ["عدد الغرف", formatRooms(property)],
    ["السعر", `${property.price.toLocaleString("ar-SA")} ريال`],
    ["رابط Google Maps", googleMapsUrl ? "مضاف" : "غير مضاف"],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <img
        src={property.images[0]}
        alt="صورة السكن"
        className="h-72 w-full rounded-2xl object-cover"
      />
      <div className="rounded-2xl bg-linen p-5">
        <h2 className="text-2xl font-black text-ink">مراجعة نهائية قبل النشر</h2>
        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          {items.map(([label, value]) => (
            <div className="rounded-xl bg-white/80 p-3" key={label}>
              <dt className="text-xs font-bold text-stone-500">{label}</dt>
              <dd className="mt-1 font-black text-ink">{value}</dd>
            </div>
          ))}
        </dl>
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

function selectedClassificationLabel(value: PropertyClassification) {
  return classificationOptions.find((option) => option.value === value)?.label ?? value;
}

function selectedPropertyTypeLabel(value: PropertyType) {
  return propertyTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel";
}) {
  return (
    <label>
      <span className="label">{label}</span>
      <input
        className="field"
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
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
            <option key={option.value} value={option.value}>
              {option.label}
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
