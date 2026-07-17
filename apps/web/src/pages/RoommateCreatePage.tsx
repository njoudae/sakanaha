import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";
import { addRoommateRequest, saveProperty } from "../services/propertyService";
import { cityNames } from "@saknaha/constants/cities";
import type { Property, PropertyClassification, PropertyType, User } from "@saknaha/shared-types";

interface RoommateCreatePageProps {
  user: User;
  initialCity?: string;
  onBack: () => void;
  onDone: () => void;
}

export default function RoommateCreatePage({
  user,
  initialCity,
  onBack,
  onDone,
}: RoommateCreatePageProps) {
  const [city, setCity] = useState(initialCity || user.city || "أبها");
  const [neighborhood, setNeighborhood] = useState("");
  const [classification, setClassification] = useState<PropertyClassification>("نسائي بالكامل");
  const [propertyType, setPropertyType] = useState<PropertyType>("شقة");
  const [availableRooms, setAvailableRooms] = useState("1");
  const [pricePerPerson, setPricePerPerson] = useState("");
  const [universityNearby, setUniversityNearby] = useState("");
  const [bio, setBio] = useState("");

  const canSubmit =
    city.trim() &&
    neighborhood.trim() &&
    Number(availableRooms) > 0 &&
    Number(pricePerPerson) > 0 &&
    bio.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const rooms = Number(availableRooms);
    const price = Number(pricePerPerson) * Math.max(1, rooms);
    const now = new Date().toISOString();
    const property: Property = {
      id: "",
      ownerId: user.id,
      ownerName: user.name,
      ownerPhone: user.phone,
      title: `${propertyType} تبحث عن شريكات`,
      propertyLicenseNumber: "external-roommate-card",
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      address: neighborhood.trim(),
      universityNearby: universityNearby.trim() || "غير محدد",
      googleMapsUrl: "",
      classification,
      propertyType,
      minRooms: rooms,
      maxRooms: rooms,
      floorsCount: 1,
      hasElevator: false,
      hasCleaningWorker: false,
      hasTransportService: false,
      universityBusPasses: false,
      bathrooms: 1,
      furnished: true,
      maxResidents: rooms + 1,
      roommateAllowed: true,
      requiresLeaseContract: true,
      price,
      paymentType: "شهري",
      negotiable: false,
      allowWhatsappContact: true,
      services: [],
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80",
      ],
      status: "published",
      distanceText: "حسب موقع السكن",
      timeText: "يتم الاتفاق",
      createdAt: now,
    };

    const saved = saveProperty(property);
    addRoommateRequest({
      propertyId: saved.id,
      userId: user.id,
      requesterName: user.name,
      userType: user.role,
      age: 22,
      organization: universityNearby.trim() || city.trim(),
      moveInDate: "متاح الآن",
      bio: bio.trim(),
      availableRooms: rooms,
    });
    onDone();
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 md:px-8 md:py-12" dir="rtl">
      <button className="secondary-button mb-5" onClick={onBack} type="button">
        <ArrowRight size={18} aria-hidden="true" />
        رجوع
      </button>
      <form
        className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-5 text-right shadow-sm md:p-7"
        onSubmit={submit}
      >
        <div>
          <p className="text-sm font-black text-berry">إنشاء بطاقة شريكة سكن</p>
          <h1 className="mt-2 text-3xl font-black text-ink">أضيفي بيانات السكن المحجوز</h1>
        </div>
        <label>
          <span className="label">المنطقة</span>
          <select
            className="field field-select"
            value={city}
            onChange={(event) => setCity(event.target.value)}
          >
            {cityNames.map((cityName) => (
              <option key={cityName} value={cityName}>
                {cityName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">الحي</span>
          <input
            className="field"
            value={neighborhood}
            onChange={(event) => setNeighborhood(event.target.value)}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="label">نوع السكن</span>
            <select
              className="field field-select"
              value={classification}
              onChange={(event) => setClassification(event.target.value as PropertyClassification)}
            >
              <option value="نسائي بالكامل">نسائي بالكامل</option>
              <option value="دور نسائي داخل سكن عوائل">دور نسائي</option>
              <option value="عوائل">عوائل</option>
              <option value="متاح للجميع">متاح للجميع</option>
            </select>
          </label>
          <label>
            <span className="label">نوع العقار</span>
            <select
              className="field field-select"
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value as PropertyType)}
            >
              <option value="شقة">شقة</option>
              <option value="دور">دور</option>
              <option value="غرفة">فندق</option>
              <option value="عمارة">عمارة</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="label">عدد الغرف المتاحة</span>
            <input
              className="field"
              inputMode="numeric"
              value={availableRooms}
              onChange={(event) => setAvailableRooms(event.target.value.replace(/\D/g, ""))}
            />
          </label>
          <label>
            <span className="label">السعر المتوقع لكل واحدة</span>
            <input
              className="field"
              inputMode="numeric"
              value={pricePerPerson}
              onChange={(event) => setPricePerPerson(event.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>
        <label>
          <span className="label">الجامعة أو جهة العمل القريبة</span>
          <input
            className="field"
            value={universityNearby}
            onChange={(event) => setUniversityNearby(event.target.value)}
          />
        </label>
        <label>
          <span className="label">الوصف</span>
          <textarea
            className="field min-h-28"
            placeholder="مثال: باقي غرفتين والسكن قريب من جامعة الملك خالد."
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </label>
        <button className="primary-button w-full" disabled={!canSubmit}>
          نشر البطاقة
        </button>
      </form>
    </main>
  );
}
