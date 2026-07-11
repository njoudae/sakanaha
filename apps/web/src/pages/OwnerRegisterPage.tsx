import { ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuthService } from "../auth";
import type { Owner } from "@saknaha/shared-types";

interface OwnerRegisterPageProps {
  onDone: (owner: Owner) => void;
  onBack: () => void;
}

export default function OwnerRegisterPage({ onDone, onBack }: OwnerRegisterPageProps) {
  const authService = useAuthService();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [ministryPropertyNumber, setMinistryPropertyNumber] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const owner = await authService.registerOwner({ fullName, phone, ministryPropertyNumber });
    onDone(owner);
  }

  return (
    <main className="page-shell">
      <button className="secondary-button mb-5" onClick={onBack}>
        <ArrowRight size={18} aria-hidden="true" />
        رجوع إلى تسجيل الدخول
      </button>
      <section className="mx-auto max-w-2xl">
        <div className="panel">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-mintdeep">
              <ShieldCheck size={28} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-mintdeep">إنشاء حساب صاحب سكن</p>
              <h1 className="text-3xl font-black text-ink">بيانات بسيطة فقط</h1>
            </div>
          </div>
          <form className="grid gap-4" onSubmit={submit}>
            <p className="rounded-2xl bg-sky-50 p-4 text-sm font-bold leading-7 text-skysoft">
              هذا إصدار تجريبي. تحفظ البيانات على هذا الجهاز فقط ولا يتم إرسالها إلى خادم خارجي.
            </p>
            <label>
              <span className="label">الاسم الكامل</span>
              <input
                className="field"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
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
            <label>
              <span className="label">رقم الرخصة أو وثيقة السكن</span>
              <input
                className="field"
                required
                value={ministryPropertyNumber}
                onChange={(event) => setMinistryPropertyNumber(event.target.value)}
              />
            </label>
            <div className="grid gap-2 rounded-2xl bg-linen p-4 text-sm font-bold text-stone-600 sm:grid-cols-2">
              <span>الدخول عبر نفاذ - قريبًا</span>
              <span>الربط مع منصة إيجار - قريبًا</span>
              <span>التحقق من رقم الجوال - قريبًا</span>
              <span>الدفع الإلكتروني - قريبًا</span>
            </div>
            <button className="primary-button w-full">إنشاء الحساب والدخول</button>
          </form>
        </div>
      </section>
    </main>
  );
}
