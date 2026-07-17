import { Bell, CheckCircle2, Home, MessageCircle, UsersRound } from "lucide-react";

const notificationItems = [
  {
    icon: Home,
    title: "اهتمام بعقار",
    detail: "يفتح الاهتمام الجديد صفحة العقار ومحادثة المالك مباشرة.",
  },
  {
    icon: UsersRound,
    title: "طلب شريكة سكن",
    detail: "يفتح الطلب فرصة شريكة السكن المرتبطة به.",
  },
  {
    icon: MessageCircle,
    title: "رسالة جديدة",
    detail: "إشعارات الرسائل تفتح المحادثة مباشرة.",
  },
  {
    icon: CheckCircle2,
    title: "تحديث التحقق",
    detail: "الموافقات والرفض تفتح سجل العقار المتأثر.",
  },
];

export default function NotificationCenter() {
  return (
    <section className="panel">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-berry">مركز الإشعارات</p>
          <h2 className="text-xl font-black text-ink">آخر النشاطات</h2>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linen text-berry">
          <Bell size={18} aria-hidden="true" />
        </span>
      </div>
      <div className="grid gap-3">
        {notificationItems.map((item) => (
          <button
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-stone-100 bg-white p-3 text-right transition hover:border-berry"
            type="button"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-mintdeep">
              <item.icon size={18} aria-hidden="true" />
            </span>
            <span>
              <span className="block font-black text-ink">{item.title}</span>
              <span className="mt-1 block text-xs font-bold leading-5 text-stone-600">
                {item.detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
