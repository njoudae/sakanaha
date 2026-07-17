import {
  Check,
  Edit3,
  Eye,
  Heart,
  Home,
  Inbox,
  Plus,
  Save,
  Trash2,
  UserCheck,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { cityNames } from "@saknaha/constants/cities";
import {
  getUserActivity,
  deleteRoommateCard,
  removeFavoriteProperty,
  removeUserInterest,
  updateRoommateJoinRequestStatus,
  updateRoommateCard,
} from "../services/propertyService";
import { updateUserProfile } from "../services/userService";
import type { User } from "@saknaha/shared-types";

interface UserDashboardPageProps {
  user: User;
  onFindHousing: () => void;
  onFindRoommates: () => void;
  onCreateRoommateCard: () => void;
  onProperty: (propertyId: string) => void;
  onRoommateDetails: (requestId: string) => void;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
}

export default function UserDashboardPage({
  user,
  onFindHousing,
  onFindRoommates,
  onCreateRoommateCard,
  onProperty,
  onRoommateDetails,
  onUserUpdated,
  onLogout,
}: UserDashboardPageProps) {
  const [, setActivityVersion] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user.name);
  const [profileCity, setProfileCity] = useState(user.city);
  const [profileMessage, setProfileMessage] = useState("");
  const [editingCardId, setEditingCardId] = useState("");
  const [cardCity, setCardCity] = useState("");
  const [cardNeighborhood, setCardNeighborhood] = useState("");
  const [cardRooms, setCardRooms] = useState("1");
  const [cardPrice, setCardPrice] = useState("");
  const [cardOrganization, setCardOrganization] = useState("");
  const [cardBio, setCardBio] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const activity = getUserActivity(user.id);
  const incomingRequests = activity.roommateCards.flatMap((card) => card.incomingRequests);
  const totalCardViews = activity.roommateCards.reduce((sum, card) => sum + card.views, 0);
  const pendingIncoming = incomingRequests.filter((request) => request.status === "pending").length;
  const acceptedSent = activity.sentJoinRequests.filter(
    (item) => item.joinRequest.status === "accepted",
  ).length;

  function updateJoinStatus(id: string, status: "accepted" | "rejected") {
    updateRoommateJoinRequestStatus(id, status);
    setActivityVersion((version) => version + 1);
  }

  function saveProfile() {
    const name = profileName.trim();
    if (!name) {
      setProfileMessage("اكتبي الاسم أولاً.");
      return;
    }
    const updated = updateUserProfile(user.id, { name, city: profileCity });
    if (!updated) {
      setProfileMessage("تعذر حفظ التعديل، حاولي مرة أخرى.");
      return;
    }
    onUserUpdated(updated);
    setEditingProfile(false);
    setProfileMessage("تم تحديث بياناتك.");
  }

  function removeInterest(propertyId: string) {
    removeUserInterest(user.id, propertyId);
    setActivityVersion((version) => version + 1);
  }

  function removeFavorite(propertyId: string) {
    removeFavoriteProperty(propertyId, user.id);
    setActivityVersion((version) => version + 1);
  }

  function startEditCard(card: (typeof activity.roommateCards)[number]) {
    const property = card.property;
    const pricePerPerson = property
      ? Math.ceil(property.price / Math.max(1, property.maxResidents))
      : 0;
    setEditingCardId(card.request.id);
    setCardCity(property?.city ?? user.city);
    setCardNeighborhood(property?.neighborhood ?? "");
    setCardRooms(String(card.request.availableRooms || 1));
    setCardPrice(pricePerPerson ? String(pricePerPerson) : "");
    setCardOrganization(card.request.organization);
    setCardBio(card.request.bio);
    setCardMessage("");
  }

  function cancelEditCard() {
    setEditingCardId("");
    setCardMessage("");
  }

  function saveCardEdit() {
    const rooms = Number(cardRooms);
    const price = Number(cardPrice);
    if (!editingCardId || !cardCity || !cardNeighborhood.trim() || rooms < 1 || price < 1) {
      setCardMessage("راجعي المدينة والحي وعدد الغرف والسعر.");
      return;
    }
    const updated = updateRoommateCard(editingCardId, user.id, {
      city: cardCity,
      neighborhood: cardNeighborhood,
      availableRooms: rooms,
      pricePerPerson: price,
      organization: cardOrganization,
      bio: cardBio,
    });
    if (!updated) {
      setCardMessage("تعذر تعديل البطاقة.");
      return;
    }
    setEditingCardId("");
    setCardMessage("تم تعديل البطاقة.");
    setActivityVersion((version) => version + 1);
  }

  function deleteCard(requestId: string) {
    const deleted = deleteRoommateCard(requestId, user.id);
    if (!deleted) {
      setCardMessage("تعذر حذف البطاقة.");
      return;
    }
    setEditingCardId("");
    setCardMessage("تم حذف البطاقة.");
    setActivityVersion((version) => version + 1);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-12" dir="rtl">
      <section className="rounded-3xl border border-stone-200 bg-white/95 p-5 text-right shadow-sm md:p-7">
        <p className="text-sm font-black text-berry">لوحة الباحثة عن سكن</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-ink">مرحباً {user.name}</h1>
            <p className="mt-2 text-sm font-bold text-stone-600">المنطقة الحالية: {user.city}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="secondary-button w-fit"
              onClick={() => {
                setProfileName(user.name);
                setProfileCity(user.city);
                setProfileMessage("");
                setEditingProfile((value) => !value);
              }}
              type="button"
            >
              <Edit3 size={18} aria-hidden="true" />
              تعديل البيانات
            </button>
            <button className="danger-button w-fit" onClick={onLogout} type="button">
              تسجيل الخروج
            </button>
          </div>
        </div>
        {editingProfile ? (
          <div className="mt-5 grid gap-3 rounded-2xl bg-linen p-4 md:grid-cols-[minmax(0,1fr)_260px_auto] md:items-end">
            <label>
              <span className="label">الاسم</span>
              <input
                className="field"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </label>
            <label>
              <span className="label">المنطقة</span>
              <select
                className="field field-select"
                value={profileCity}
                onChange={(event) => setProfileCity(event.target.value)}
              >
                {cityNames.map((cityName) => (
                  <option key={cityName} value={cityName}>
                    {cityName}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" onClick={saveProfile} type="button">
              <Save size={18} aria-hidden="true" />
              حفظ
            </button>
          </div>
        ) : null}
        {profileMessage ? (
          <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-mintdeep">
            {profileMessage}
          </p>
        ) : null}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <DashboardAction
          icon={Home}
          title="خيارات السكن"
          description="استعرضي العقارات المتاحة حسب منطقتك."
          onClick={onFindHousing}
        />
        <DashboardAction
          icon={UsersRound}
          title="شريكات السكن"
          description="شاهدي الباحثات عن شريكة سكن في منطقتك."
          onClick={onFindRoommates}
        />
        <DashboardAction
          icon={Plus}
          title="إنشاء بطاقة"
          description="أضيفي بطاقة إذا استأجرتِ سكناً وتبحثين عن شريكات."
          onClick={onCreateRoommateCard}
        />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Heart} title="السكن المحفوظ" value={activity.favorites.length} />
        <StatCard icon={Inbox} title="اهتمامات السكن" value={activity.interests.length} />
        <StatCard icon={UsersRound} title="بطاقاتي" value={activity.roommateCards.length} />
        <StatCard icon={Eye} title="مشاهدات بطاقاتي" value={totalCardViews} />
        <StatCard icon={UserCheck} title="طلبات بانتظارك" value={pendingIncoming} />
      </section>

      <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 text-right shadow-sm">
          <SectionTitle title="بطاقات شريكة السكن التي أنشأتيها" />
          {cardMessage ? (
            <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-mintdeep">
              {cardMessage}
            </p>
          ) : null}
          {activity.roommateCards.length === 0 ? (
            <EmptyState text="لم تنشئي بطاقة شريكة سكن بعد." />
          ) : (
            <div className="mt-4 grid gap-3">
              {activity.roommateCards.map((card) => (
                <div key={card.request.id} className="rounded-2xl bg-linen p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        className="text-right text-lg font-black text-ink hover:text-berry"
                        onClick={() => onRoommateDetails(card.request.id)}
                        type="button"
                      >
                        {card.property
                          ? `${card.property.city}، ${card.property.neighborhood}`
                          : "بطاقة شريكة سكن"}
                      </button>
                      <p className="mt-1 text-sm font-bold text-stone-600">
                        {card.request.availableRooms.toLocaleString("ar-SA")} غرف متاحة
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <SmallMetric label="مشاهدات" value={card.views} />
                      <SmallMetric label="طلبات" value={card.incomingRequests.length} />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="secondary-button !min-h-10 !px-3"
                      onClick={() => startEditCard(card)}
                      type="button"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                      تعديل
                    </button>
                    <button
                      className="secondary-button !min-h-10 !px-3 text-rose-700"
                      onClick={() => deleteCard(card.request.id)}
                      type="button"
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      حذف
                    </button>
                  </div>

                  {editingCardId === card.request.id ? (
                    <div className="mt-4 grid gap-3 rounded-2xl bg-white p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <label>
                          <span className="label">المدينة</span>
                          <select
                            className="field field-select"
                            value={cardCity}
                            onChange={(event) => setCardCity(event.target.value)}
                          >
                            {cityNames.map((cityName) => (
                              <option key={cityName} value={cityName}>
                                {cityName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className="label">الحي</span>
                          <input
                            className="field"
                            value={cardNeighborhood}
                            onChange={(event) => setCardNeighborhood(event.target.value)}
                          />
                        </label>
                        <label>
                          <span className="label">الغرف المتاحة</span>
                          <input
                            className="field"
                            inputMode="numeric"
                            value={cardRooms}
                            onChange={(event) =>
                              setCardRooms(event.target.value.replace(/\D/g, ""))
                            }
                          />
                        </label>
                        <label>
                          <span className="label">السعر لكل واحدة</span>
                          <input
                            className="field"
                            inputMode="numeric"
                            value={cardPrice}
                            onChange={(event) =>
                              setCardPrice(event.target.value.replace(/\D/g, ""))
                            }
                          />
                        </label>
                      </div>
                      <label>
                        <span className="label">الجامعة أو جهة العمل القريبة</span>
                        <input
                          className="field"
                          value={cardOrganization}
                          onChange={(event) => setCardOrganization(event.target.value)}
                        />
                      </label>
                      <label>
                        <span className="label">الوصف</span>
                        <textarea
                          className="field min-h-24"
                          value={cardBio}
                          onChange={(event) => setCardBio(event.target.value)}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button className="primary-button" onClick={saveCardEdit} type="button">
                          <Save size={16} aria-hidden="true" />
                          حفظ التعديل
                        </button>
                        <button className="secondary-button" onClick={cancelEditCard} type="button">
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {card.incomingRequests.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {card.incomingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"
                        >
                          <div>
                            <p className="font-black text-ink">{request.requesterName}</p>
                            <p className="text-xs font-bold text-stone-500">
                              الحالة: {statusLabel(request.status)}
                            </p>
                          </div>
                          {request.status === "pending" ? (
                            <div className="flex gap-2">
                              <button
                                className="primary-button !min-h-10 !px-3"
                                onClick={() => updateJoinStatus(request.id, "accepted")}
                                type="button"
                              >
                                <Check size={16} aria-hidden="true" />
                                قبول
                              </button>
                              <button
                                className="secondary-button !min-h-10 !px-3"
                                onClick={() => updateJoinStatus(request.id, "rejected")}
                                type="button"
                              >
                                <X size={16} aria-hidden="true" />
                                رفض
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-5">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 text-right shadow-sm">
            <SectionTitle title="طلبات الانضمام التي أرسلتيها" />
            {activity.sentJoinRequests.length === 0 ? (
              <EmptyState text="لم ترسلي طلب انضمام لشريكة سكن بعد." />
            ) : (
              <div className="mt-4 grid gap-3">
                {activity.sentJoinRequests.map((item) => (
                  <button
                    key={item.joinRequest.id}
                    className="rounded-2xl bg-linen p-4 text-right transition hover:bg-stone-100"
                    onClick={() => onRoommateDetails(item.joinRequest.requestId)}
                    type="button"
                  >
                    <p className="font-black text-ink">
                      {item.property
                        ? `${item.property.city}، ${item.property.neighborhood}`
                        : "طلب شريكة سكن"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-stone-600">
                      الحالة: {statusLabel(item.joinRequest.status)}
                    </p>
                  </button>
                ))}
              </div>
            )}
            {acceptedSent > 0 ? (
              <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-mintdeep">
                لديك {acceptedSent.toLocaleString("ar-SA")} طلب مقبول.
              </p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 text-right shadow-sm">
            <SectionTitle title="آخر اهتمامات السكن" />
            {activity.interests.length === 0 && activity.favorites.length === 0 ? (
              <EmptyState text="لم تضيفي أي اهتمام أو مفضلة بعد." />
            ) : (
              <div className="mt-4 grid gap-3">
                {[...activity.interests, ...activity.favorites].slice(0, 6).map((item, index) => {
                  const property = item.property;
                  if (!property) return null;
                  const isInterest = "interest" in item;
                  return (
                    <div
                      key={`${property.id}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-linen p-4"
                    >
                      <button
                        className="min-w-0 flex-1 text-right"
                        onClick={() => onProperty(property.id)}
                        type="button"
                      >
                        <p className="font-black text-ink">{property.title}</p>
                        <p className="mt-1 text-sm font-bold text-stone-600">
                          {property.city}، {property.neighborhood}
                        </p>
                      </button>
                      <button
                        className="secondary-button !min-h-10 !px-3 text-rose-700"
                        onClick={() =>
                          isInterest ? removeInterest(property.id) : removeFavorite(property.id)
                        }
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                        حذف
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-4 text-right shadow-sm">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-mintdeep">
        <Icon size={21} aria-hidden="true" />
      </span>
      <p className="text-2xl font-black text-ink">{value.toLocaleString("ar-SA")}</p>
      <p className="mt-1 text-sm font-bold text-stone-600">{title}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-2xl bg-white px-3 py-2 text-center">
      <span className="block text-base font-black text-ink">{value.toLocaleString("ar-SA")}</span>
      <span className="block text-xs font-bold text-stone-500">{label}</span>
    </span>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-xl font-black text-ink">{title}</h2>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-4 rounded-2xl bg-linen p-4 text-sm font-bold text-stone-600">{text}</p>;
}

function statusLabel(status: "pending" | "accepted" | "rejected") {
  if (status === "accepted") return "مقبول";
  if (status === "rejected") return "مرفوض";
  return "بانتظار الرد";
}

function DashboardAction({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-3xl border border-stone-200 bg-white p-5 text-right shadow-sm transition hover:border-berry hover:-translate-y-0.5"
      onClick={onClick}
      type="button"
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-linen text-berry">
        <Icon size={24} aria-hidden="true" />
      </span>
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm font-bold leading-6 text-stone-600">{description}</p>
    </button>
  );
}
