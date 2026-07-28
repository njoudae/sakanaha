import { useState, type FormEvent } from "react";
import { Check, Loader2, LogIn, Mail, Phone, X } from "lucide-react";
import type { Owner, User } from "@saknaha/shared-types";
import { useAuthService } from "../auth";

interface AuthModalProps {
  open: boolean;
  initialIntent?: "owner" | "user" | null;
  onClose: () => void;
  onOwnerAuthenticated: (owner: Owner) => void;
  onUserAuthenticated: (user: User, options?: { isNewAccount?: boolean }) => void;
}

type OtpChannel = "email" | "phone";

export default function AuthModal({
  open,
  initialIntent = null,
  onClose,
  onOwnerAuthenticated,
  onUserAuthenticated,
}: AuthModalProps) {
  const authService = useAuthService();
  const [intent, setIntent] = useState<"owner" | "user" | null>(initialIntent);
  const [channel, setChannel] = useState<OtpChannel | null>(null);
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  if (!open) return null;

  const hasProvider =
    authService.capabilities.google ||
    authService.capabilities.emailOtp ||
    authService.capabilities.phoneOtp;

  function completeAuthenticatedSession() {
    const owner = authService.getCurrentOwner();
    const user = authService.getCurrentUser();
    if (intent === "owner" && owner) {
      onOwnerAuthenticated(owner);
      onClose();
      return;
    }
    if (user) {
      onUserAuthenticated(user);
      onClose();
      return;
    }
    setMessage("تم التحقق بنجاح. جارٍ تجهيز حسابك الآمن.");
  }

  async function signInWithGoogle() {
    setLoading(true);
    setError("");
    try {
      await authService.signInWithGoogle();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر بدء تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(event: FormEvent) {
    event.preventDefault();
    if (!channel || !contact.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (channel === "email") await authService.requestEmailOtp(contact.trim());
      else await authService.requestPhoneOtp(contact.trim());
      setRequested(true);
      setMessage("تم إرسال رمز التحقق عبر مزود الهوية المعتمد.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "تعذر إرسال رمز التحقق.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!channel || !contact.trim() || !code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const verified =
        channel === "email"
          ? await authService.verifyEmailOtp(contact.trim(), code.trim())
          : await authService.verifyPhoneOtp(contact.trim(), code.trim());
      if (!verified) {
        setError("تعذر التحقق من الرمز.");
        return;
      }
      completeAuthenticatedSession();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="تسجيل الدخول"
      dir="rtl"
    >
      <section className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <button
          className="absolute left-4 top-4 rounded-full p-2 text-stone-500 hover:bg-stone-100"
          onClick={onClose}
          type="button"
          aria-label="إغلاق"
        >
          <X aria-hidden="true" size={20} />
        </button>
        <div className="pr-1 text-right">
          <p className="text-sm font-black text-berry">حساب سكنها</p>
          <h2 className="mt-1 text-2xl font-black text-ink">تسجيل الدخول الآمن</h2>
        </div>

        {!intent ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button className="primary-button" onClick={() => setIntent("user")} type="button">
              باحثة عن سكن
            </button>
            <button className="secondary-button" onClick={() => setIntent("owner")} type="button">
              مالك عقار
            </button>
          </div>
        ) : !hasProvider ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-900">
            تسجيل الدخول غير متاح مؤقتاً. يمكنك تصفح العقارات وبطاقات شريكات السكن، وسيتم تفعيل
            إنشاء الحسابات بعد ربط مزود الهوية المعتمد.
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {authService.capabilities.google ? (
              <button
                className="secondary-button w-full"
                disabled={loading}
                onClick={signInWithGoogle}
                type="button"
              >
                <LogIn size={18} aria-hidden="true" />
                المتابعة عبر Google
              </button>
            ) : null}
            {authService.capabilities.emailOtp ? (
              <button
                className="secondary-button w-full"
                onClick={() => {
                  setChannel("email");
                  setRequested(false);
                }}
                type="button"
              >
                <Mail size={18} aria-hidden="true" />
                رمز عبر البريد الإلكتروني
              </button>
            ) : null}
            {authService.capabilities.phoneOtp ? (
              <button
                className="secondary-button w-full"
                onClick={() => {
                  setChannel("phone");
                  setRequested(false);
                }}
                type="button"
              >
                <Phone size={18} aria-hidden="true" />
                رمز عبر الجوال
              </button>
            ) : null}
            {channel ? (
              <form
                className="mt-2 grid gap-3 rounded-2xl bg-linen p-4"
                onSubmit={requested ? verifyOtp : requestOtp}
              >
                <label>
                  <span className="label">
                    {channel === "email" ? "البريد الإلكتروني" : "رقم الجوال"}
                  </span>
                  <input
                    className="field"
                    type={channel === "email" ? "email" : "tel"}
                    value={contact}
                    onChange={(event) => setContact(event.target.value)}
                    required
                  />
                </label>
                {requested ? (
                  <label>
                    <span className="label">رمز التحقق</span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      required
                    />
                  </label>
                ) : null}
                <button className="primary-button w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                  ) : requested ? (
                    <Check size={18} aria-hidden="true" />
                  ) : (
                    <Mail size={18} aria-hidden="true" />
                  )}
                  {requested ? "تحقق من الرمز" : "إرسال الرمز"}
                </button>
              </form>
            ) : null}
          </div>
        )}
        {error ? <p className="mt-4 text-sm font-bold text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 text-sm font-bold text-mintdeep">{message}</p> : null}
      </section>
    </div>
  );
}
