import {
  ArrowLeft,
  Building2,
  Check,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAuthService } from "../auth";
import { cityNames } from "@saknaha/constants/cities";
import type { Owner, User } from "@saknaha/shared-types";

type AuthIntent = "owner" | "user" | null;
type AuthStep = "intent" | "signin" | "register";
type OtpChannel = "email" | "phone";
type SignInMethod = OtpChannel | null;

interface AuthModalProps {
  open: boolean;
  initialIntent?: AuthIntent;
  onClose: () => void;
  onOwnerAuthenticated: (owner: Owner) => void;
  onUserAuthenticated: (user: User, options?: { isNewAccount?: boolean }) => void;
}

const DEMO_OTP_CODE = "1234";
const saudiRegionOptions = [
  "الرياض",
  "مكة المكرمة",
  "المدينة المنورة",
  "القصيم",
  "الشرقية",
  "عسير",
  "تبوك",
  "حائل",
  "الحدود الشمالية",
  "جازان",
  "نجران",
  "الباحة",
  "الجوف",
];
const locationOptions = Array.from(new Set([...saudiRegionOptions, ...cityNames]));

function normalizeContact(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function isValidSaudiPhone(value: string) {
  return /^05\d{8}$/.test(normalizeContact(value));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.com$/i.test(normalizeContact(value));
}

export default function AuthModal({
  open,
  initialIntent = null,
  onClose,
  onOwnerAuthenticated,
  onUserAuthenticated,
}: AuthModalProps) {
  const authService = useAuthService();
  const [intent, setIntent] = useState<AuthIntent>(() => initialIntent);
  const [step, setStep] = useState<AuthStep>(() => (initialIntent ? "signin" : "intent"));
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpChannel, setOtpChannel] = useState<OtpChannel | null>(null);
  const [signInMethod, setSignInMethod] = useState<SignInMethod>(null);
  const [otpRequested, setOtpRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [city, setCity] = useState("أبها");
  const [ministryPropertyNumber, setMinistryPropertyNumber] = useState("");
  const [ownerOtpSent, setOwnerOtpSent] = useState(false);

  if (!open) return null;

  function chooseIntent(nextIntent: Exclude<AuthIntent, null>) {
    setIntent(nextIntent);
    setStep("signin");
    setSignInMethod(null);
    setOtpChannel(null);
    setOtpRequested(false);
    setOtpCode("");
    setError("");
    setMessage("");
  }

  function chooseSignInMethod(method: OtpChannel) {
    setSignInMethod(method);
    setOtpChannel(null);
    setOtpRequested(false);
    setOtpCode("");
    setError("");
    setMessage("");
  }

  function cleanPhoneInput(value: string) {
    setPhone(value.replace(/\s+/g, ""));
  }

  function cleanEmailInput(value: string) {
    setEmail(value.replace(/\s+/g, "").toLowerCase());
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      await authService.signInWithGoogle();
      setMessage("بدأ تسجيل الدخول عبر جوجل. أكملي الخطوات في نافذة المزود.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "تعذر تسجيل الدخول عبر جوجل.");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp(channel: OtpChannel) {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (channel === "email") {
        await authService.requestEmailOtp(normalizeContact(email));
      } else {
        await authService.requestPhoneOtp(normalizeContact(phone));
      }
      setOtpChannel(channel);
      setOtpRequested(true);
      setMessage(
        `تم إرسال رمز التحقق إلى ${channel === "email" ? "البريد الإلكتروني" : "الجوال"}.`,
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "تعذر طلب رمز التحقق.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!otpChannel) return;
    setLoading(true);
    setError("");
    try {
      const ok =
        otpChannel === "email"
          ? await authService.verifyEmailOtp(normalizeContact(email), otpCode)
          : await authService.verifyPhoneOtp(normalizeContact(phone), otpCode);
      if (!ok) {
        setError("فشل التحقق من الرمز. تأكدي من الرمز وحاولي مرة أخرى.");
        return;
      }
      setMessage("تم التحقق من الرمز. جلستك الآمنة فعالة الآن.");
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "فشل التحقق من الرمز.");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithCompatibilityPhone(event: FormEvent) {
    event.preventDefault();
    if (!intent) return;
    const normalizedPhone = normalizeContact(phone);
    if (!isValidSaudiPhone(normalizedPhone)) {
      setError("رقم الجوال يجب أن يكون 10 خانات ويبدأ بـ 05.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (intent === "owner") {
        const owner = await authService.loginOwnerWithPhone(normalizedPhone);
        if (!owner) {
          setError("لم يتم العثور على حساب مالك بهذا الرقم.");
          return;
        }
        onOwnerAuthenticated(owner);
      } else {
        const user = await authService.loginUserWithPhone(normalizedPhone);
        if (!user) {
          setError("لم يتم العثور على حساب باحثة عن سكن بهذا الرقم.");
          return;
        }
        onUserAuthenticated(user);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function validateOwnerRegister() {
    if (!name.trim()) return "اكتبي الاسم أولاً.";
    if (!ministryPropertyNumber.trim()) return "اكتبي رقم الهوية.";
    if (!isValidEmail(email)) {
      return "البريد الإلكتروني يجب أن يحتوي على @ وينتهي بـ .com.";
    }
    if (!isValidSaudiPhone(phone)) {
      return "رقم الجوال يجب أن يكون 10 خانات ويبدأ بـ 05.";
    }
    if (!city.trim()) return "اكتبي المنطقة.";
    return "";
  }

  function requestOwnerRegisterOtp(event: FormEvent) {
    event.preventDefault();
    const validationError = validateOwnerRegister();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setOwnerOtpSent(true);
    setOtpCode("");
    setMessage(
      `تم إرسال رمز التحقق إلى ${normalizeContact(phone)}. رمز التجربة هو ${DEMO_OTP_CODE}.`,
    );
  }

  async function verifyOwnerRegisterOtp(event: FormEvent) {
    event.preventDefault();
    const validationError = validateOwnerRegister();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (otpCode.trim() !== DEMO_OTP_CODE) {
      setError("رمز التحقق غير صحيح. اكتبي الرمز مرة أخرى.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const owner = await authService.registerOwner({
        fullName: name.trim(),
        email: normalizeContact(email),
        phone: normalizeContact(phone),
        nationalId: ministryPropertyNumber.trim(),
        region: city.trim(),
        ministryPropertyNumber: ministryPropertyNumber.trim(),
      });
      onOwnerAuthenticated(owner);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    if (!intent) return;
    if (!name.trim()) {
      setError("اكتبي الاسم أولاً.");
      return;
    }
    if (!isValidEmail(email)) {
      setError("البريد الإلكتروني يجب أن يحتوي على @ وينتهي بـ .com.");
      return;
    }
    if (!isValidSaudiPhone(phone)) {
      setError("رقم الجوال يجب أن يكون 10 خانات ويبدأ بـ 05.");
      return;
    }
    if (!city.trim()) {
      setError("اكتبي المنطقة.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await authService.registerUser({
        name: name.trim(),
        email: normalizeContact(email),
        phone: normalizeContact(phone),
        role: "student",
        city: city.trim(),
        monthlyBudget: 0,
        acceptsRoommate: true,
      });
      onUserAuthenticated(user, { isNewAccount: true });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  const canEmailOtp = authService.capabilities.emailOtp;
  const canPhoneOtp = authService.capabilities.phoneOtp;
  const canGoogle = authService.capabilities.google;
  const modalTitle = step === "register" ? "إنشاء حساب جديد" : "تسجيل الدخول";

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="تسجيل الدخول"
      dir="rtl"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/70 bg-white p-5 text-right shadow-2xl md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black text-ink">{modalTitle}</h2>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition hover:border-berry hover:text-berry"
            onClick={onClose}
            aria-label="إغلاق نافذة تسجيل الدخول"
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {step === "intent" ? (
          <div className="grid gap-3">
            <IntentButton
              icon={Building2}
              title="مالك/ة عقار"
              onClick={() => chooseIntent("owner")}
            />
            <IntentButton
              icon={UserRound}
              title="باحثة عن سكن / شريكة سكن"
              onClick={() => chooseIntent("user")}
            />
          </div>
        ) : null}

        {step !== "intent" && intent ? (
          <div className="grid gap-4">
            <button
              className="inline-flex w-fit items-center gap-2 rounded-full px-2 py-1 text-sm font-bold text-stone-600 transition hover:text-berry"
              onClick={() => {
                setStep("intent");
                setIntent(null);
                setSignInMethod(null);
                setOtpChannel(null);
                setOtpRequested(false);
                setOtpCode("");
                setError("");
                setMessage("");
              }}
              type="button"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              رجوع
            </button>

            {step === "signin" ? (
              <>
                <button
                  className="secondary-button w-full"
                  onClick={handleGoogle}
                  disabled={!canGoogle || loading}
                  type="button"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <KeyRound size={18} />
                  )}
                  المتابعة عبر جوجل
                </button>

                <div className="grid gap-2">
                  <button
                    className={
                      signInMethod === "email" ? "primary-button w-full" : "secondary-button w-full"
                    }
                    onClick={() => chooseSignInMethod("email")}
                    type="button"
                  >
                    <Mail size={18} aria-hidden="true" />
                    رمز الإيميل
                  </button>
                  <button
                    className={
                      signInMethod === "phone" ? "primary-button w-full" : "secondary-button w-full"
                    }
                    onClick={() => chooseSignInMethod("phone")}
                    type="button"
                  >
                    <Phone size={18} aria-hidden="true" />
                    رمز الجوال
                  </button>
                </div>

                {signInMethod === "email" ? (
                  <div className="grid gap-3 rounded-2xl border border-stone-200 p-4">
                    <label>
                      <span className="label">البريد الإلكتروني</span>
                      <input
                        className="field"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(event) => cleanEmailInput(event.target.value)}
                        disabled={!canEmailOtp}
                      />
                    </label>
                    <button
                      className="primary-button w-full"
                      onClick={() => requestOtp("email")}
                      disabled={!canEmailOtp || !email || loading}
                      type="button"
                    >
                      <Mail size={18} aria-hidden="true" />
                      إرسال رمز الإيميل
                    </button>
                  </div>
                ) : null}

                {signInMethod === "phone" ? (
                  <form
                    className="grid gap-3 rounded-2xl border border-stone-200 p-4"
                    onSubmit={canPhoneOtp ? undefined : loginWithCompatibilityPhone}
                  >
                    <label>
                      <span className="label">رقم الجوال</span>
                      <input
                        className="field"
                        required
                        inputMode="tel"
                        maxLength={10}
                        placeholder="0500000000"
                        value={phone}
                        onChange={(event) => cleanPhoneInput(event.target.value)}
                      />
                    </label>
                    {canPhoneOtp ? (
                      <button
                        className="primary-button w-full"
                        onClick={() => requestOtp("phone")}
                        disabled={!phone || loading}
                        type="button"
                      >
                        <Phone size={18} aria-hidden="true" />
                        إرسال رمز الجوال
                      </button>
                    ) : (
                      <button className="primary-button w-full" disabled={loading}>
                        <Phone size={18} aria-hidden="true" />
                        متابعة
                      </button>
                    )}
                  </form>
                ) : null}

                {otpRequested ? (
                  <form className="grid gap-3 rounded-2xl bg-emerald-50 p-4" onSubmit={verifyOtp}>
                    <label>
                      <span className="label">رمز التحقق</span>
                      <input
                        className="field"
                        required
                        inputMode="numeric"
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value)}
                      />
                    </label>
                    <button className="primary-button w-full" disabled={loading}>
                      <Check size={18} aria-hidden="true" />
                      تحقق من الرمز
                    </button>
                  </form>
                ) : null}

                <button
                  className="w-full rounded-xl px-4 py-3 text-sm font-black text-berry transition hover:bg-linen"
                  onClick={() => {
                    setStep("register");
                    setSignInMethod(null);
                    setOtpChannel(null);
                    setOtpRequested(false);
                    setOtpCode("");
                    setError("");
                    setMessage("");
                    setOwnerOtpSent(false);
                  }}
                  type="button"
                >
                  ليس لديك حساب؟ إنشاء حساب جديد
                </button>
              </>
            ) : intent === "owner" ? (
              <form
                className="grid gap-3"
                onSubmit={ownerOtpSent ? verifyOwnerRegisterOtp : requestOwnerRegisterOtp}
              >
                <label>
                  <span className="label">الاسم الكامل</span>
                  <input
                    className="field"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">رقم الهوية</span>
                  <input
                    className="field"
                    required
                    inputMode="numeric"
                    value={ministryPropertyNumber}
                    onChange={(event) =>
                      setMinistryPropertyNumber(event.target.value.replace(/\D/g, ""))
                    }
                  />
                </label>
                <label>
                  <span className="label">البريد الإلكتروني</span>
                  <input
                    className="field"
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => cleanEmailInput(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">رقم الجوال</span>
                  <input
                    className="field"
                    required
                    inputMode="tel"
                    maxLength={10}
                    placeholder="0500000000"
                    value={phone}
                    onChange={(event) => cleanPhoneInput(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">المنطقة</span>
                  <select
                    className="field field-select"
                    required
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  >
                    {locationOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </label>

                {ownerOtpSent ? (
                  <label>
                    <span className="label">رمز التحقق</span>
                    <input
                      className="field"
                      required
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                    />
                  </label>
                ) : null}

                <button className="primary-button w-full" disabled={loading}>
                  {ownerOtpSent ? "تحقق ودخول لوحة المالك" : "إنشاء الحساب"}
                </button>
                <button
                  className="secondary-button w-full"
                  onClick={() => setStep("signin")}
                  type="button"
                >
                  العودة لتسجيل الدخول
                </button>
              </form>
            ) : (
              <form className="grid gap-3" onSubmit={register}>
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
                  <span className="label">البريد الإلكتروني</span>
                  <input
                    className="field"
                    required
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => cleanEmailInput(event.target.value)}
                  />
                </label>
                <label>
                  <span className="label">رقم الجوال</span>
                  <input
                    className="field"
                    required
                    inputMode="tel"
                    maxLength={10}
                    placeholder="0500000000"
                    value={phone}
                    onChange={(event) => cleanPhoneInput(event.target.value)}
                  />
                </label>

                <label>
                  <span className="label">المنطقة</span>
                  <select
                    className="field field-select"
                    required
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  >
                    {locationOptions.map((location) => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="primary-button w-full" disabled={loading}>
                  إنشاء الحساب
                </button>
                <button
                  className="secondary-button w-full"
                  onClick={() => setStep("signin")}
                  type="button"
                >
                  العودة لتسجيل الدخول
                </button>
              </form>
            )}
          </div>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-mintdeep">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm font-bold leading-6 text-rose-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function IntentButton({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 text-right transition hover:border-berry hover:bg-linen"
      onClick={onClick}
      type="button"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-berry/10 text-berry">
        <Icon size={24} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-black text-ink">{title}</span>
        {description ? (
          <span className="mt-1 block text-sm font-bold leading-6 text-stone-600">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
