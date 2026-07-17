import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import AuthModal from "./components/AuthModal";
import AppBar from "./components/AppBar";
import DashboardShell from "./components/DashboardShell";
import Footer from "./components/Footer";
import AddPropertyPage from "./pages/AddPropertyPage";
import AboutPage from "./pages/AboutPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import CityResultsPage from "./pages/CityResultsPage";
import FaqPage from "./pages/FaqPage";
import HousingPage from "./pages/HousingPage";
import LandingPage from "./pages/LandingPage";
import ManagePropertyPage from "./pages/ManagePropertyPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";
import OwnerRegisterPage from "./pages/OwnerRegisterPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import RoommateDetailsPage from "./pages/RoommateDetailsPage";
import RoommatesPage from "./pages/RoommatesPage";
import RoommateCreatePage from "./pages/RoommateCreatePage";
import SupportPage from "./pages/SupportPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import UserLocationPage from "./pages/UserLocationPage";
import UserLoginPage from "./pages/UserLoginPage";
import UserRegisterPage from "./pages/UserRegisterPage";
import UserSearchPage from "./pages/UserSearchPage";
import { useAuthService } from "./auth";
import type { Owner, Property, UniversityLocation, User } from "@saknaha/shared-types";

type Route =
  | "landing"
  | "owner-login"
  | "owner-register"
  | "owner-dashboard"
  | "add-property"
  | "manage-property"
  | "owner-property-preview"
  | "user-login"
  | "user-register"
  | "user-dashboard"
  | "user-location"
  | "user-search"
  | "roommate-create"
  | "housing"
  | "city"
  | "property"
  | "roommates"
  | "roommate-detail"
  | "admin-dashboard"
  | "about"
  | "faq"
  | "support";

interface RouteState {
  route: Route;
  cityName?: string;
  propertyId?: string;
  requestId?: string;
}

function parsePublicPath(): RouteState {
  const path = window.location.pathname;
  if (path.startsWith("/city/")) {
    const cityName = decodeURIComponent(path.replace("/city/", "")).trim();
    return { route: "city", cityName: cityName || "أخرى" };
  }
  if (path.startsWith("/property/")) {
    const propertyId = decodeURIComponent(path.replace("/property/", "")).trim();
    return { route: "property", propertyId };
  }
  if (path.startsWith("/roommates/")) {
    const requestId = decodeURIComponent(path.replace("/roommates/", "")).trim();
    return { route: "roommate-detail", requestId };
  }
  if (path === "/housing") return { route: "housing" };
  if (path === "/admin") return { route: "admin-dashboard" };
  if (path === "/about") return { route: "about" };
  if (path === "/roommates") return { route: "roommates" };
  if (path === "/faq") return { route: "faq" };
  if (path === "/support") return { route: "support" };
  return { route: "landing" };
}

function publicPathFor(state: RouteState) {
  if (state.route === "city") return `/city/${encodeURIComponent(state.cityName ?? "أخرى")}`;
  if (state.route === "property") return `/property/${encodeURIComponent(state.propertyId ?? "")}`;
  if (state.route === "roommate-detail")
    return `/roommates/${encodeURIComponent(state.requestId ?? "")}`;
  if (state.route === "housing") return "/housing";
  if (state.route === "admin-dashboard") return "/admin";
  if (state.route === "roommates") return "/roommates";
  if (state.route === "about") return "/about";
  if (state.route === "faq") return "/faq";
  if (state.route === "support") return "/support";
  return "/";
}

interface UserAuthOptions {
  isNewAccount?: boolean;
}

export default function App() {
  const authService = useAuthService();
  const initialPublicRoute = useMemo(() => parsePublicPath(), []);
  const [route, setRoute] = useState<Route>(initialPublicRoute.route);
  const [cityName, setCityName] = useState(initialPublicRoute.cityName ?? "");
  const [propertyId, setPropertyId] = useState(initialPublicRoute.propertyId ?? "");
  const [requestId, setRequestId] = useState(initialPublicRoute.requestId ?? "");
  const [owner, setOwner] = useState<Owner | null>(() => authService.getCurrentOwner());
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [selectedUniversity, setSelectedUniversity] = useState<UniversityLocation | null>(null);
  const [pendingUserRoute, setPendingUserRoute] = useState<RouteState | null>(null);
  const [returnToUserDashboard, setReturnToUserDashboard] = useState(false);
  const [authTransitionMessage, setAuthTransitionMessage] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalIntent, setAuthModalIntent] = useState<"owner" | "user" | null>(null);
  const [, forceRefresh] = useState(0);

  const openAuthModal = useCallback((intent: "owner" | "user" | null = null) => {
    setAuthModalIntent(intent);
    setAuthModalOpen(true);
  }, []);

  useEffect(() => {
    function handlePopState() {
      const next = parsePublicPath();
      setRoute(next.route);
      setCityName(next.cityName ?? "");
      setPropertyId(next.propertyId ?? "");
      setRequestId(next.requestId ?? "");
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function refresh() {
    forceRefresh((value) => value + 1);
  }

  function showAuthTransition(message: string) {
    setAuthTransitionMessage(message);
    window.setTimeout(() => setAuthTransitionMessage(""), 1400);
  }

  function navigatePublic(next: RouteState) {
    setReturnToUserDashboard(false);
    const path = publicPathFor(next);
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    setRoute(next.route);
    setCityName(next.cityName ?? "");
    setPropertyId(next.propertyId ?? "");
    setRequestId(next.requestId ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    navigatePublic({ route: "landing" });
  }

  function goOwnerLogin() {
    openAuthModal("owner");
  }

  function goUserStart() {
    if (user) {
      setRoute("user-dashboard");
      return;
    }
    openAuthModal("user");
  }

  function goProfile() {
    if (owner) {
      setRoute("owner-dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (user) {
      setRoute("user-dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    openAuthModal(null);
  }

  function goHousing() {
    navigatePublic({ route: "housing" });
  }

  function goCity(nextCity: string) {
    navigatePublic({ route: "city", cityName: nextCity });
  }

  function goProperty(nextPropertyId: string) {
    const next = { route: "property" as const, propertyId: nextPropertyId };
    navigatePublic(next);
  }

  function goPropertyFromUserDashboard(nextPropertyId: string) {
    setReturnToUserDashboard(true);
    setPropertyId(nextPropertyId);
    setRequestId("");
    setRoute("property");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goOwnerPropertyPreview(nextPropertyId: string) {
    setPropertyId(nextPropertyId);
    setRoute("owner-property-preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editProperty(property: Property) {
    setEditingProperty(property);
    setRoute("add-property");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goFaq() {
    navigatePublic({ route: "faq" });
  }

  function goAbout() {
    navigatePublic({ route: "about" });
  }

  function goRoommates() {
    navigatePublic({ route: "roommates" });
  }

  function goFilteredHousing(nextCity: string, university: UniversityLocation | null = null) {
    setSelectedUniversity(university);
    setCityName(nextCity || "");
    setPropertyId("");
    setRequestId("");
    if (window.location.pathname !== "/housing") {
      window.history.pushState(null, "", "/housing");
    }
    setRoute("housing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goFilteredRoommates(nextCity: string) {
    setCityName(nextCity || "");
    setPropertyId("");
    setRequestId("");
    if (window.location.pathname !== "/roommates") {
      window.history.pushState(null, "", "/roommates");
    }
    setRoute("roommates");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goRoommateCreate(nextCity?: string) {
    setCityName(nextCity || user?.city || "");
    setRoute("roommate-create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goRoommateDetails(nextRequestId: string) {
    const next = { route: "roommate-detail" as const, requestId: nextRequestId };
    if (!user) {
      setPendingUserRoute(next);
      openAuthModal("user");
      return;
    }
    navigatePublic(next);
  }

  function goRoommateDetailsFromUserDashboard(nextRequestId: string) {
    setReturnToUserDashboard(true);
    setRequestId(nextRequestId);
    setPropertyId("");
    setRoute("roommate-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBackFromPropertyDetails(nextCity: string) {
    if (returnToUserDashboard && user) {
      setReturnToUserDashboard(false);
      setRoute("user-dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goCity(nextCity);
  }

  function goBackFromRoommateDetails() {
    if (returnToUserDashboard && user) {
      setReturnToUserDashboard(false);
      setRoute("user-dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goRoommates();
  }

  function completeUserAuth(nextUser: User, options?: UserAuthOptions) {
    showAuthTransition("جاري تسجيل الدخول...");
    setUser(nextUser);
    setOwner(null);
    const currentProtectedRoute =
      route === "roommate-detail" && requestId
        ? ({ route: "roommate-detail", requestId } as const)
        : null;
    const next = pendingUserRoute ?? currentProtectedRoute;
    setPendingUserRoute(null);
    if (next) {
      if (next.route === "user-location") {
        setRoute("user-location");
        return;
      }
      navigatePublic(next);
      return;
    }
    setRoute(options?.isNewAccount ? "user-location" : "user-dashboard");
  }

  function completeOwnerAuth(nextOwner: Owner) {
    showAuthTransition("جاري تسجيل الدخول...");
    setOwner(nextOwner);
    setUser(null);
    setPendingUserRoute(null);
    setRoute("owner-dashboard");
  }

  function goSupport() {
    navigatePublic({ route: "support" });
  }

  function scrollToCities() {
    if (route !== "landing") {
      navigatePublic({ route: "landing" });
      window.setTimeout(
        () => document.getElementById("cities")?.scrollIntoView({ behavior: "smooth" }),
        80,
      );
      return;
    }
    document.getElementById("cities")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleOwnerLogout() {
    await handleAccountLogout();
  }

  async function handleAccountLogout() {
    showAuthTransition("جاري تسجيل الخروج...");
    await authService.logout();
    setOwner(null);
    setUser(null);
    setPendingUserRoute(null);
    setEditingProperty(null);
    navigatePublic({ route: "landing" });
  }

  const protectedGuestRoute = !user && route === "roommate-detail" && requestId;
  const effectiveAuthModalOpen = authModalOpen || Boolean(protectedGuestRoute);
  const effectiveAuthModalIntent = authModalIntent ?? (protectedGuestRoute ? "user" : null);

  function frame(children: ReactNode, showFooter = false) {
    return (
      <>
        <AppBar
          onHome={goHome}
          onProfile={goProfile}
          onLogout={handleAccountLogout}
          accountName={owner?.fullName ?? user?.name}
          onCities={scrollToCities}
          onCity={goCity}
          onAbout={goAbout}
          onFaq={goFaq}
          onSupport={goSupport}
        />
        {children}
        {showFooter ? (
          <Footer
            onHome={() => navigatePublic({ route: "landing" })}
            onOwner={goOwnerLogin}
            onUser={goUserStart}
            onCities={scrollToCities}
            onFaq={goFaq}
            onSupport={goSupport}
          />
        ) : null}
        <AuthModal
          key={`${effectiveAuthModalOpen}-${effectiveAuthModalIntent ?? "choose"}-${propertyId}-${requestId}`}
          open={effectiveAuthModalOpen}
          initialIntent={effectiveAuthModalIntent}
          onClose={() => {
            setAuthModalOpen(false);
            if (protectedGuestRoute) navigatePublic({ route: "roommates" });
          }}
          onOwnerAuthenticated={completeOwnerAuth}
          onUserAuthenticated={completeUserAuth}
        />
        {authTransitionMessage ? <AuthTransitionOverlay message={authTransitionMessage} /> : null}
      </>
    );
  }

  if (route === "owner-login") {
    return frame(
      <OwnerLoginPage
        onHome={() => navigatePublic({ route: "landing" })}
        onLogin={completeOwnerAuth}
        onCreateAccount={() => setRoute("owner-register")}
      />,
    );
  }

  if (route === "owner-register") {
    return frame(
      <OwnerRegisterPage onBack={() => setRoute("owner-login")} onDone={completeOwnerAuth} />,
    );
  }

  if (route === "owner-dashboard" && owner) {
    return frame(
      <DashboardShell kind="owner" name={owner.fullName} status="صاحب سكن">
        <OwnerDashboardPage
          owner={owner}
          onLogout={handleOwnerLogout}
          onAddProperty={() => {
            setEditingProperty(null);
            setRoute("add-property");
          }}
          onManage={() => setRoute("manage-property")}
          onView={goOwnerPropertyPreview}
          onEdit={editProperty}
        />
      </DashboardShell>,
    );
  }

  if (route === "add-property" && owner) {
    return frame(
      <AddPropertyPage
        owner={owner}
        editing={editingProperty}
        onBack={() => setRoute("owner-dashboard")}
        onSaved={() => {
          refresh();
          setEditingProperty(null);
          setRoute("owner-dashboard");
        }}
      />,
    );
  }

  if (route === "manage-property" && owner) {
    return frame(
      <ManagePropertyPage
        owner={owner}
        onBack={() => setRoute("owner-dashboard")}
        onRefresh={refresh}
        onEdit={editProperty}
      />,
    );
  }

  if (route === "owner-property-preview" && owner) {
    return frame(
      <PropertyDetailsPage
        propertyId={propertyId}
        user={null}
        mode="owner-preview"
        onBackToCity={goCity}
        onProperty={goOwnerPropertyPreview}
        onEdit={editProperty}
        onPreviewBack={() => setRoute("owner-dashboard")}
        onOwnerProperties={() => setRoute("owner-dashboard")}
      />,
    );
  }

  if (route === "user-login") {
    return frame(
      <UserLoginPage
        onHome={() => {
          setPendingUserRoute(null);
          navigatePublic({ route: "landing" });
        }}
        onLogin={completeUserAuth}
        onCreateAccount={() => setRoute("user-register")}
      />,
    );
  }

  if (route === "user-register") {
    return frame(
      <UserRegisterPage
        onBack={() => setRoute("user-login")}
        onDone={(nextUser) => completeUserAuth(nextUser, { isNewAccount: true })}
      />,
    );
  }

  if (route === "user-dashboard" && user) {
    return frame(
      <UserDashboardPage
        user={user}
        onFindHousing={() => goFilteredHousing(user.city)}
        onFindRoommates={() => goFilteredRoommates(user.city)}
        onCreateRoommateCard={() => goRoommateCreate(user.city)}
        onProperty={goPropertyFromUserDashboard}
        onRoommateDetails={goRoommateDetailsFromUserDashboard}
        onUserUpdated={setUser}
        onLogout={handleAccountLogout}
      />,
      true,
    );
  }

  if (route === "user-location") {
    return frame(
      <UserLocationPage
        onBack={() => setRoute(user ? "user-dashboard" : "landing")}
        onFindHousing={goFilteredHousing}
        onFindRoommateMatch={goFilteredRoommates}
        onCreateRoommateCard={goRoommateCreate}
      />,
    );
  }

  if (route === "roommate-create" && user) {
    return frame(
      <RoommateCreatePage
        user={user}
        initialCity={cityName || user.city}
        onBack={() => setRoute("user-dashboard")}
        onDone={() => goFilteredRoommates(cityName || user.city)}
      />,
      true,
    );
  }

  if (route === "user-search") {
    return frame(
      <UserSearchPage
        user={user}
        selectedUniversity={selectedUniversity}
        onBack={() => setRoute("user-location")}
        onHome={() => navigatePublic({ route: "landing" })}
        onProperty={goProperty}
      />,
    );
  }

  if (route === "housing") {
    return frame(
      <HousingPage
        key={`housing-${cityName || "all"}`}
        user={user}
        initialCity={cityName || "all"}
        onProperty={goProperty}
        onRoommateDetails={goRoommateDetails}
        onRoommates={goRoommates}
      />,
      true,
    );
  }

  if (route === "city") {
    return frame(
      <CityResultsPage
        cityName={cityName || "أخرى"}
        user={user}
        onBackHome={() => navigatePublic({ route: "landing" })}
        onCity={goCity}
        onProperty={goProperty}
      />,
      true,
    );
  }

  if (route === "property") {
    return frame(
      <PropertyDetailsPage
        propertyId={propertyId}
        user={user}
        onBackToCity={goBackFromPropertyDetails}
        onProperty={goProperty}
      />,
      true,
    );
  }

  if (route === "roommates") {
    return frame(
      <RoommatesPage
        key={`roommates-${cityName || "all"}`}
        onDetails={goRoommateDetails}
        onProperty={goProperty}
        onHousing={goHousing}
        onHome={goHome}
        initialCity={cityName || "all"}
      />,
      true,
    );
  }

  if (route === "roommate-detail" && !user) {
    return frame(
      <RoommatesPage
        key={`roommates-guest-${cityName || "all"}`}
        onDetails={goRoommateDetails}
        onProperty={goProperty}
        onHousing={goHousing}
        onHome={goHome}
        initialCity={cityName || "all"}
      />,
      true,
    );
  }

  if (route === "roommate-detail") {
    return frame(
      <RoommateDetailsPage requestId={requestId} user={user} onBack={goBackFromRoommateDetails} />,
      true,
    );
  }

  if (route === "admin-dashboard") {
    const platformRole = (user as (User & { platformRole?: string }) | null)?.platformRole;
    return frame(platformRole === "admin" ? <AdminDashboardPage /> : <AdminAccessDenied />, true);
  }

  if (route === "faq") {
    return frame(<FaqPage />, true);
  }

  if (route === "about") {
    return frame(<AboutPage />, true);
  }

  if (route === "support") {
    return frame(<SupportPage />, true);
  }

  return frame(
    <LandingPage
      onUser={goUserStart}
      onHousing={goHousing}
      onCity={goCity}
      onRoommates={goRoommates}
      onRoommateDetails={goRoommateDetails}
    />,
    true,
  );
}

function AdminAccessDenied() {
  return (
    <main className="page-shell">
      <section className="panel mx-auto max-w-2xl text-center">
        <p className="text-sm font-black uppercase tracking-wide text-berry">مسار محمي</p>
        <h1 className="mt-2 text-3xl font-black text-ink">صلاحية المدير مطلوبة</h1>
        <p className="mt-3 text-sm font-bold leading-7 text-stone-600">
          لوحة الإدارة غير موجودة في التنقل العادي، ولا تفتح إلا بحساب يملك صلاحية المدير في المنصة.
        </p>
      </section>
    </main>
  );
}

function AuthTransitionOverlay({ message }: { message: string }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/70 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={message}
      dir="rtl"
    >
      <div className="flex min-w-64 flex-col items-center gap-4 rounded-3xl border border-stone-200 bg-white px-8 py-7 text-center shadow-soft">
        <Loader2 className="h-10 w-10 animate-spin text-berry" aria-hidden="true" />
        <p className="text-lg font-black text-ink">{message}</p>
      </div>
    </div>
  );
}
