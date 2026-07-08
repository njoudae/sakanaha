import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { loginOwner } from "../services/userService";
import type { Owner } from "@saknaha/shared-types";

interface OwnerLoginPageProps {
  onLogin: (owner: Owner) => void;
  onCreateAccount: () => void;
  onHome: () => void;
}

export default function OwnerLoginPage({ onLogin, onCreateAccount, onHome }: OwnerLoginPageProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const owner = loginOwner(phone);
    if (!owner) {
      setError("لم نجد حسابًا بهذا الرقم. يمكنك إنشاء حساب جديد خلال أقل من دقيقة.");
      return;
    }
    onLogin(owner);
  }

  return (
    <main className="page-shell">
      <section className="mx-auto max-w-xl">
        <button className="secondary-button mb-4" type="button" onClick={onHome}>
          <ArrowRight size={18} aria-hidden="true" />
          العودة للصفحة الرئيسية
        </button>
        <div className="panel">
          <div className="mb-6">
            <p className="text-sm font-black text-mintdeep">دخول صاحب السكن</p>
            <h1 className="mt-2 text-3xl font-black text-ink">أدخل رقم الجوال للمتابعة</h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              هذه نسخة تجريبية، وسيتم تفعيل التحقق الكامل من الهوية وربط بيانات السكن لاحقًا.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={submit}>
            <label>
              <span className="label">رقم الجوال</span>
              <input
                className="field"
                required
                inputMode="tel"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
              />
            </label>
            {error ? (
              <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-700">
                {error}
              </p>
            ) : null}
            <button className="primary-button w-full">
              <LogIn size={18} aria-hidden="true" />
              تسجيل الدخول
            </button>
            <button className="secondary-button w-full" type="button" onClick={onCreateAccount}>
              <UserPlus size={18} aria-hidden="true" />
              إنشاء حساب جديد
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
