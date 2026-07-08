import { ArrowRight, LogIn, Search, UserPlus } from "lucide-react";
import { useState } from "react";
import { loginUser } from "../services/userService";
import type { User } from "@saknaha/shared-types";

interface UserLoginPageProps {
  onLogin: (user: User) => void;
  onCreateAccount: () => void;
  onHome: () => void;
}

export default function UserLoginPage({ onLogin, onCreateAccount, onHome }: UserLoginPageProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const user = loginUser(phone);
    if (!user) {
      setError("لم نجد حسابًا بهذا الرقم. يمكنك إنشاء حساب جديد للمتابعة.");
      return;
    }
    onLogin(user);
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
            <p className="text-sm font-black text-skysoft">دخول الباحثة عن سكن</p>
            <h1 className="mt-2 text-3xl font-black text-ink">أدخلي رقم الجوال للمتابعة</h1>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              يلزم إنشاء حساب بسيط قبل عرض تفاصيل السكن أو تفاصيل شريكة السكن.
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
            <button className="secondary-button w-full" type="button" onClick={onCreateAccount}>
              <Search size={18} aria-hidden="true" />
              باحثة عن سكن
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
