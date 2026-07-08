import { useState } from "react";
import type { FormEvent } from "react";
import { addRoommateRequest } from "../services/propertyService";
import type { Property, User, UserRole } from "@saknaha/shared-types";
import { formatRooms } from "@saknaha/utils/propertyFormat";

interface RoommateRequestFormProps {
  property: Property;
  user: User | null;
  onDone: () => void;
}

export default function RoommateRequestForm({ property, user, onDone }: RoommateRequestFormProps) {
  const [userType, setUserType] = useState<UserRole>(user?.role ?? "student");
  const [age, setAge] = useState("");
  const [organization, setOrganization] = useState(property.universityNearby);
  const [major, setMajor] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [bio, setBio] = useState("");
  const [saved, setSaved] = useState(false);

  const totalRooms = property.maxRooms;
  const availableRooms = Math.max(1, Math.min(totalRooms, property.maxResidents - 1));
  const canSubmit = Number(age) > 0 && organization.trim() && moveInDate.trim() && bio.trim();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    addRoommateRequest({
      propertyId: property.id,
      userId: user?.id ?? "guest-user",
      userType,
      age: Number(age),
      organization: organization.trim(),
      major: major.trim(),
      moveInDate: moveInDate.trim(),
      bio: bio.trim(),
      availableRooms,
    });
    setSaved(true);
    onDone();
  }

  return (
    <form
      className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4 md:p-5"
      onSubmit={submit}
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-black text-mintdeep">تسجيل طلب شريكة سكن</p>
          <h2 className="mt-1 text-xl font-black text-ink">بيانات السكن مضافة تلقائيًا</h2>
        </div>
        {saved ? (
          <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-mintdeep">
            تم حفظ الطلب
          </span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Info label="اسم السكن" value={property.title} />
        <Info label="المدينة" value={property.city} />
        <Info label="الحي" value={property.neighborhood} />
        <Info label="عدد الغرف الكلي" value={formatRooms(property)} />
        <Info label="السعر الكلي" value={`${property.price.toLocaleString("ar-SA")} ريال`} />
        <Info label="عدد الغرف المتاحة" value={`${availableRooms.toLocaleString("ar-SA")} غرفة`} />
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label>
          <span className="label">نوع المستخدمة</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={userType === "student" ? "primary-button" : "secondary-button"}
              onClick={() => setUserType("student")}
            >
              طالبة
            </button>
            <button
              type="button"
              className={userType === "employee" ? "primary-button" : "secondary-button"}
              onClick={() => setUserType("employee")}
            >
              موظفة
            </button>
          </div>
        </label>
        <label>
          <span className="label">العمر</span>
          <input
            className="field"
            type="number"
            min="16"
            value={age}
            onChange={(event) => setAge(event.target.value)}
          />
        </label>
        <label>
          <span className="label">الجامعة أو جهة العمل</span>
          <input
            className="field"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
          />
        </label>
        <label>
          <span className="label">التخصص (اختياري)</span>
          <input
            className="field"
            value={major}
            onChange={(event) => setMajor(event.target.value)}
          />
        </label>
        <label>
          <span className="label">موعد الانتقال</span>
          <input
            className="field"
            placeholder="مثال: سبتمبر 2026"
            value={moveInDate}
            onChange={(event) => setMoveInDate(event.target.value)}
          />
        </label>
        <label className="md:col-span-2">
          <span className="label">نبذة قصيرة</span>
          <textarea
            className="field min-h-28"
            placeholder="مثال: طالبة حاسب بجامعة الملك خالد، هادئة وأفضل السكن المنظم."
            value={bio}
            onChange={(event) => setBio(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button className="primary-button" disabled={!canSubmit}>
          حفظ الطلب
        </button>
      </div>
    </form>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/90 p-3">
      <p className="text-xs font-bold text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-black text-ink">{value}</p>
    </div>
  );
}
