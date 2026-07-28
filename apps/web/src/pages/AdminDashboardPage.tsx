import {
  BarChart3,
  Archive,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
  Eye,
  Trash2,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import {
  useAdminData,
  type AdminCount,
  type ModerationStatus,
  type PlatformRole,
  type ProfileStatus,
} from "../data/AdminDataContext";

const roleLabels: Record<PlatformRole, string> = {
  admin: "مدير",
  support: "دعم",
  moderator: "مشرف",
  real_estate_agent: "وسيط عقاري",
  owner: "مالك",
  user: "مستخدم",
  service_provider: "مزود خدمة",
};
const visibleRoleOptions: PlatformRole[] = [
  "admin",
  "real_estate_agent",
  "user",
  "owner",
  "service_provider",
];

const statusLabels: Record<ProfileStatus, string> = {
  active: "نشط",
  pending_claim: "بانتظار التفعيل",
  suspended: "موقوف",
  deleted: "محذوف",
};

const moderationLabels: Record<ModerationStatus, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
  needs_review: "يحتاج مراجعة",
  archived: "مؤرشف",
};

function countLabel(count: AdminCount | undefined) {
  if (!count) return "—";
  return `${count.value.toLocaleString("ar-SA")}${count.capped ? "+" : ""}`;
}

export default function AdminDashboardPage() {
  const admin = useAdminData();
  const [message, setMessage] = useState("");
  const overview = admin.overview;

  async function updateUser(userId: string, status: ProfileStatus) {
    setMessage("");
    try {
      await admin.updateUserStatus(userId, status);
      setMessage("تم تحديث حالة المستخدم.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث المستخدم.");
    }
  }

  async function moderateProperty(
    propertyId: string,
    moderation: ModerationStatus,
    reason?: string,
  ) {
    setMessage("");
    try {
      await admin.moderateProperty(propertyId, moderation, reason);
      setMessage("تم تحديث حالة مراجعة العقار.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث العقار.");
    }
  }

  async function rejectProperty(propertyId: string, requestChanges = false) {
    const reason = window.prompt(
      requestChanges ? "اكتبي التغييرات المطلوبة من المالك:" : "اكتبي سبب الرفض:",
    );
    if (!reason?.trim()) return;
    await moderateProperty(propertyId, requestChanges ? "needs_review" : "rejected", reason);
  }

  async function moderateRoommate(
    roommateId: string,
    moderation: ModerationStatus,
    reason?: string,
  ) {
    setMessage("");
    try {
      await admin.moderateRoommate(roommateId, moderation, reason);
      setMessage("تم تحديث حالة بطاقة شريكة السكن.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحديث البطاقة.");
    }
  }

  return (
    <DashboardShell kind="admin" name="إدارة سكنها" status="مساحة إدارية محمية">
      <header
        className="mb-5 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft"
        id="admin-dashboard"
      >
        <p className="text-sm font-black uppercase tracking-wide text-berry">لوحة الإدارة</p>
        <h1 className="mt-2 text-3xl font-black text-ink">إدارة المنصة العامة</h1>
      </header>
      <nav
        className="mb-5 flex gap-2 overflow-x-auto rounded-2xl bg-white p-3 shadow-soft"
        aria-label="تنقل الإدارة"
      >
        {[
          ["لوحة التحكم", "admin-dashboard"],
          ["العقارات المعلقة", "admin-properties"],
          ["بطاقات الشريكات المعلقة", "admin-roommates"],
          ["المعتمدة", "admin-properties"],
          ["المرفوضة", "admin-properties"],
          ["المستخدمون", "admin-users"],
          ["الملاك", "admin-users"],
          ["البلاغات", "admin-operations"],
          ["الإعدادات", "admin-operations"],
          ["سجل التدقيق", "admin-operations"],
        ].map(([label, target]) => (
          <a
            className="secondary-button shrink-0 !min-h-10 !px-3 text-xs"
            href={`#${target}`}
            key={label}
          >
            {label}
          </a>
        ))}
      </nav>

      {admin.loading ? (
        <div className="panel flex min-h-48 items-center justify-center">
          <Loader2 className="animate-spin text-berry" size={30} aria-label="جاري تحميل البيانات" />
        </div>
      ) : (
        <div className="grid gap-5">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="نظرة عامة">
            <MetricCard icon={UserRound} label="المستخدمون" value={countLabel(overview?.users)} />
            <MetricCard icon={Building2} label="الملاك" value={countLabel(overview?.owners)} />
            <MetricCard
              icon={ShieldCheck}
              label="العقارات"
              value={countLabel(overview?.properties)}
            />
            <MetricCard
              icon={UsersRound}
              label="طلبات شريكات السكن"
              value={countLabel(overview?.roommateRequests)}
            />
            <MetricCard
              icon={ClipboardCheck}
              label="عقارات بانتظار الاعتماد"
              value={countLabel(overview?.pendingPropertyApprovals)}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="حالات المراجعة">
            <MetricCard
              icon={ClipboardCheck}
              label="بطاقات شريكات معلقة"
              value={countLabel(overview?.pendingRoommateApprovals)}
            />
            <MetricCard
              icon={CheckCircle2}
              label="المعتمدة"
              value={countLabel(overview?.approved)}
            />
            <MetricCard icon={XCircle} label="المرفوضة" value={countLabel(overview?.rejected)} />
            <MetricCard icon={Archive} label="المؤرشفة" value={countLabel(overview?.archived)} />
          </section>

          <section className="grid gap-3 sm:grid-cols-3" aria-label="التحليلات الأساسية">
            <MetricCard
              icon={BarChart3}
              label="المستخدمون النشطون"
              value={countLabel(overview?.activeUsers)}
            />
            <MetricCard
              icon={BarChart3}
              label="العقارات المنشورة"
              value={countLabel(overview?.publishedProperties)}
            />
            <MetricCard
              icon={BarChart3}
              label="طلبات السكن المفتوحة"
              value={countLabel(overview?.openRoommateRequests)}
            />
          </section>

          {message ? (
            <p
              className="rounded-2xl bg-emerald-50 p-3 text-sm font-black text-mintdeep"
              role="status"
            >
              {message}
            </p>
          ) : null}

          <section className="panel" id="admin-users">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black text-berry">إدارة المستخدمين</p>
                <h2 className="text-2xl font-black text-ink">المستخدمون والصلاحيات</h2>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-auto">
                <SearchField
                  value={admin.userSearch}
                  onChange={admin.setUserSearch}
                  placeholder="بحث بالاسم أو المدينة"
                />
                <select
                  className="field field-select"
                  value={admin.userRole}
                  onChange={(event) => admin.setUserRole(event.target.value as PlatformRole | "")}
                  aria-label="تصفية حسب الدور"
                >
                  <option value="">كل الأدوار</option>
                  {visibleRoleOptions.map((value) => (
                    <option key={value} value={value}>
                      {roleLabels[value]}
                    </option>
                  ))}
                </select>
                <select
                  className="field field-select"
                  value={admin.userStatus}
                  onChange={(event) =>
                    admin.setUserStatus(event.target.value as ProfileStatus | "")
                  }
                  aria-label="تصفية حسب الحالة"
                >
                  <option value="">كل الحالات</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-right text-sm">
                <thead className="border-b border-stone-200 text-stone-500">
                  <tr>
                    <th className="p-3">المستخدم</th>
                    <th className="p-3">الدور</th>
                    <th className="p-3">المدينة</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {admin.users.map((item) => (
                    <tr className="border-b border-stone-100" key={item.id}>
                      <td className="p-3 font-black text-ink">{item.name}</td>
                      <td className="p-3">{roleLabels[item.role]}</td>
                      <td className="p-3">{item.city || "—"}</td>
                      <td className="p-3">{statusLabels[item.status]}</td>
                      <td className="p-3">
                        <button
                          className={
                            item.status === "active" ? "danger-button" : "secondary-button"
                          }
                          type="button"
                          onClick={() =>
                            updateUser(item.id, item.status === "active" ? "suspended" : "active")
                          }
                        >
                          {item.status === "active" ? "إيقاف" : "تفعيل"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {admin.users.length === 0 ? <EmptyState label="لا توجد نتائج للمستخدمين." /> : null}
            </div>
          </section>

          <section className="panel" id="admin-properties">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-black text-berry">مراجعة العقارات</p>
                <h2 className="text-2xl font-black text-ink">اعتماد وإدارة العقارات</h2>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto">
                <SearchField
                  value={admin.propertySearch}
                  onChange={admin.setPropertySearch}
                  placeholder="بحث باسم العقار"
                />
                <select
                  className="field field-select"
                  value={admin.propertyModeration}
                  onChange={(event) =>
                    admin.setPropertyModeration(event.target.value as ModerationStatus | "")
                  }
                  aria-label="تصفية حسب حالة المراجعة"
                >
                  <option value="">كل حالات المراجعة</option>
                  {Object.entries(moderationLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px] text-right text-sm">
                <thead className="border-b border-stone-200 text-stone-500">
                  <tr>
                    <th className="p-3">الغلاف</th>
                    <th className="p-3">العقار</th>
                    <th className="p-3">المالك</th>
                    <th className="p-3">المنطقة</th>
                    <th className="p-3">المدينة</th>
                    <th className="p-3">الحي</th>
                    <th className="p-3">تاريخ الإرسال</th>
                    <th className="p-3">النشر</th>
                    <th className="p-3">المراجعة</th>
                    <th className="p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {admin.properties.map((item) => (
                    <tr className="border-b border-stone-100" key={item.id}>
                      <td className="p-3">
                        {item.coverImage ? (
                          <img
                            src={item.coverImage}
                            alt=""
                            className="h-14 w-20 rounded-xl object-cover"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3 font-black text-ink">{item.title}</td>
                      <td className="p-3">{item.ownerName}</td>
                      <td className="p-3">{item.region || "—"}</td>
                      <td className="p-3">{item.city}</td>
                      <td className="p-3">{item.district || "—"}</td>
                      <td className="p-3">
                        {new Date(item.submittedAt ?? item.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="p-3">{item.status}</td>
                      <td className="p-3">{moderationLabels[item.moderationStatus]}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="secondary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() =>
                              window.alert(
                                `${item.title}\n${item.ownerName}\n${item.region ?? ""} - ${item.city} - ${item.district ?? ""}`,
                              )
                            }
                          >
                            <Eye size={16} aria-hidden="true" />
                            التفاصيل
                          </button>
                          <button
                            className="primary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => moderateProperty(item.id, "approved")}
                          >
                            <CheckCircle2 size={16} aria-hidden="true" />
                            اعتماد
                          </button>
                          <button
                            className="danger-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => void rejectProperty(item.id)}
                          >
                            <XCircle size={16} aria-hidden="true" />
                            رفض
                          </button>
                          <button
                            className="secondary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => void rejectProperty(item.id, true)}
                          >
                            طلب تعديلات
                          </button>
                          <button
                            className="secondary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => void moderateProperty(item.id, "archived")}
                          >
                            <Archive size={16} aria-hidden="true" />
                            أرشفة
                          </button>
                          <button
                            className="danger-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => {
                              if (window.confirm("حذف العقار نهائيًا من قائمة الإدارة؟")) {
                                void admin.deleteProperty(item.id);
                              }
                            }}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {admin.properties.length === 0 ? <EmptyState label="لا توجد عقارات مطابقة." /> : null}
            </div>
          </section>

          <section className="panel" id="admin-roommates">
            <div className="mb-4">
              <p className="text-sm font-black text-berry">مراجعة بطاقات شريكات السكن</p>
              <h2 className="text-2xl font-black text-ink">البطاقات المقدمة للمراجعة</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-right text-sm">
                <thead className="border-b border-stone-200 text-stone-500">
                  <tr>
                    <th className="p-3">صاحبة البطاقة</th>
                    <th className="p-3">المنطقة</th>
                    <th className="p-3">المدينة</th>
                    <th className="p-3">الحي</th>
                    <th className="p-3">الجامعة</th>
                    <th className="p-3">تاريخ الإرسال</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {admin.roommates.map((item) => (
                    <tr className="border-b border-stone-100" key={item.id}>
                      <td className="p-3 font-black text-ink">{item.requesterName}</td>
                      <td className="p-3">{item.region || "—"}</td>
                      <td className="p-3">{item.city || "—"}</td>
                      <td className="p-3">{item.district || "—"}</td>
                      <td className="p-3">{item.university || "—"}</td>
                      <td className="p-3">
                        {new Date(item.submittedAt ?? item.createdAt).toLocaleDateString("ar-SA")}
                      </td>
                      <td className="p-3">{moderationLabels[item.moderationStatus]}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="secondary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() =>
                              window.alert(
                                `${item.requesterName}\n${item.region ?? ""} - ${item.city ?? ""} - ${item.district ?? ""}\n${item.university ?? ""}`,
                              )
                            }
                          >
                            <Eye size={16} aria-hidden="true" />
                            التفاصيل
                          </button>
                          <button
                            className="primary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => void moderateRoommate(item.id, "approved")}
                          >
                            اعتماد
                          </button>
                          <button
                            className="danger-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => {
                              const reason = window.prompt("اكتبي سبب رفض البطاقة:");
                              if (reason?.trim()) {
                                void moderateRoommate(item.id, "rejected", reason);
                              }
                            }}
                          >
                            رفض
                          </button>
                          <button
                            className="secondary-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => void moderateRoommate(item.id, "archived")}
                          >
                            أرشفة
                          </button>
                          <button
                            className="danger-button !min-h-10 !px-3"
                            type="button"
                            onClick={() => {
                              if (window.confirm("حذف بطاقة شريكة السكن؟")) {
                                void admin.deleteRoommate(item.id);
                              }
                            }}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {admin.roommates.length === 0 ? (
                <EmptyState label="لا توجد بطاقات شريكات سكن مطابقة." />
              ) : null}
            </div>
          </section>
          <section className="grid gap-3 md:grid-cols-3" id="admin-operations">
            <article className="panel">
              <h2 className="font-black text-ink">البلاغات</h2>
              <p className="mt-2 text-sm font-bold text-stone-600">
                تعرض مؤشرات المراجعة أعلاه الحالات التي تحتاج تدخل الإدارة.
              </p>
            </article>
            <article className="panel">
              <h2 className="font-black text-ink">الإعدادات</h2>
              <p className="mt-2 text-sm font-bold text-stone-600">
                رسوم النشر محكومة بإعداد البيئة ولا يمكن تجاوزها من الواجهة.
              </p>
            </article>
            <article className="panel">
              <h2 className="font-black text-ink">سجل التدقيق</h2>
              <p className="mt-2 text-sm font-bold text-stone-600">
                تسجل جميع قرارات الاعتماد والرفض والأرشفة والحذف في سجل التدقيق.
              </p>
            </article>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <article className="panel flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linen text-berry">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span>
        <span className="block text-xs font-bold text-stone-500">{label}</span>
        <span className="mt-1 block text-2xl font-black text-ink">{value}</span>
      </span>
    </article>
  );
}

function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange(value: string): void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <input
        className="field min-w-56 pr-10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <Search
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
        size={17}
        aria-hidden="true"
      />
    </label>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="p-6 text-center text-sm font-bold text-stone-500">{label}</p>;
}
