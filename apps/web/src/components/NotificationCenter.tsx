import { Bell, BellOff, CheckCheck, Circle, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNotificationData, type NotificationRecord } from "../data/NotificationDataContext";

export default function NotificationCenter() {
  const notifications = useNotificationData();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function openNotification(notification: NotificationRecord) {
    setBusyId(notification.id);
    try {
      if (notification.status === "unread") await notifications.markRead(notification.id);
      if (notification.deepLink) window.location.assign(notification.deepLink);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleRead(notification: NotificationRecord) {
    setBusyId(notification.id);
    try {
      if (notification.status === "unread") await notifications.markRead(notification.id);
      else await notifications.markUnread(notification.id);
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    setBusyId("all");
    try {
      await notifications.markAllRead();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-berry">مركز الإشعارات</p>
          <h2 className="text-xl font-black text-ink">آخر النشاطات</h2>
          {notifications.unreadCount > 0 ? (
            <p className="mt-1 text-xs font-bold text-stone-500">
              {notifications.unreadCount.toLocaleString("ar-SA")} غير مقروء
            </p>
          ) : null}
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-linen text-berry">
          <Bell size={18} aria-hidden="true" />
        </span>
      </div>

      {notifications.unreadCount > 0 ? (
        <button
          className="secondary-button mb-3 w-full !min-h-10 text-xs"
          type="button"
          onClick={markAllRead}
          disabled={busyId !== null}
        >
          {busyId === "all" ? (
            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
          ) : (
            <CheckCheck size={16} aria-hidden="true" />
          )}
          تحديد الكل كمقروء
        </button>
      ) : null}

      {notifications.loading ? (
        <div className="flex min-h-28 items-center justify-center">
          <Loader2
            className="animate-spin text-berry"
            size={24}
            aria-label="جاري تحميل الإشعارات"
          />
        </div>
      ) : notifications.notifications.length > 0 ? (
        <div className="grid gap-3">
          {notifications.notifications.map((item) => (
            <article
              className={`rounded-xl border p-3 transition ${
                item.status === "unread"
                  ? "border-berry/30 bg-fuchsia-50/60"
                  : "border-stone-100 bg-white"
              }`}
              key={item.id}
            >
              <button
                className="w-full text-right"
                type="button"
                onClick={() => openNotification(item)}
                disabled={busyId === item.id}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      item.status === "unread" ? "bg-berry text-white" : "bg-linen text-stone-500"
                    }`}
                  >
                    {busyId === item.id ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    ) : item.status === "unread" ? (
                      <Circle size={12} fill="currentColor" aria-hidden="true" />
                    ) : (
                      <Bell size={16} aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-ink">{item.title}</span>
                    <span className="mt-1 block text-xs font-bold leading-5 text-stone-600">
                      {item.body}
                    </span>
                    <span className="mt-2 block text-[11px] font-bold text-stone-400">
                      {new Date(item.createdAt).toLocaleString("ar-SA")}
                    </span>
                  </span>
                </span>
              </button>
              <button
                className="mt-2 inline-flex items-center gap-1 text-xs font-black text-berry"
                type="button"
                onClick={() => toggleRead(item)}
                disabled={busyId !== null}
              >
                {item.status === "unread" ? (
                  <CheckCheck size={14} aria-hidden="true" />
                ) : (
                  <BellOff size={14} aria-hidden="true" />
                )}
                {item.status === "unread" ? "تحديد كمقروء" : "تحديد كغير مقروء"}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-linen p-5 text-center">
          <BellOff className="mx-auto text-stone-400" size={24} aria-hidden="true" />
          <p className="mt-2 text-sm font-black text-ink">لا توجد إشعارات</p>
        </div>
      )}
    </section>
  );
}
