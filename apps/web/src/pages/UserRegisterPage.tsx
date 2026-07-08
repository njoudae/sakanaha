import { ArrowRight, UserRoundCheck } from "lucide-react";
import { useState } from "react";
import { registerUser } from "../services/userService";
import type { User, UserRole } from "@saknaha/shared-types";

interface UserRegisterPageProps {
  onDone: (user: User) => void;
  onBack: () => void;
}

export default function UserRegisterPage({ onDone, onBack }: UserRegisterPageProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [city, setCity] = useState("أبها");
  const [monthlyBudget, setMonthlyBudget] = useState("2000");
  const [acceptsRoommate, setAcceptsRoommate] = useState(true);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const user = registerUser({
      name,
      phone,
      role,
      city,
      monthlyBudget: Number(monthlyBudget) || 0,
      acceptsRoommate,
    });
    onDone(user);
  }

  return (
    <main className="page-shell">
      <button className="secondary-button mb-5" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" />
        رجوع
      </button>
      <section className="mx-auto max-w-2xl">
        <div className="panel">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-skysoft">
              <UserRoundCheck size={28} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-skysoft">تسجيل مستخدمة</p>
              <h1 className="text-3xl font-black text-ink">لنبدأ بتفضيلاتك</h1>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={submit}>
            <p className="rounded-2xl bg-sky-50 p-4 text-sm font-bold leading-7 text-skysoft">
              هذا إصدار تجريبي. تحفظ البيانات على هذا الجهاز فقط ولا يتم إرسالها إلى خادم خارجي.
            </p>
            <label>
              <span className="label">الاسم</span>
              <input
                className="field"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              <span className="label">رقم الجوال</span>
              <input
                className="field"
                required
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">النوع</span>
                <select
                  className="field"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <option value="student">طالبة</option>
                  <option value="employee">موظفة</option>
                </select>
              </label>
              <label>
                <span className="label">المنطقة أو المدينة</span>
                <input
                  className="field"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                />
              </label>
            </div>
            <label>
              <span className="label">الدخل أو الميزانية الشهرية</span>
              <input
                className="field"
                required
                inputMode="numeric"
                value={monthlyBudget}
                onChange={(event) => setMonthlyBudget(event.target.value)}
              />
            </label>
            <div>
              <span className="label">هل تقبلين السكن مع روم ميت؟</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  className={acceptsRoommate ? "primary-button" : "secondary-button"}
                  type="button"
                  onClick={() => setAcceptsRoommate(true)}
                >
                  نعم
                </button>
                <button
                  className={!acceptsRoommate ? "primary-button" : "secondary-button"}
                  type="button"
                  onClick={() => setAcceptsRoommate(false)}
                >
                  لا
                </button>
              </div>
            </div>
            <button className="primary-button w-full">اختيار الموقع</button>
          </form>
        </div>
      </section>
    </main>
  );
}
