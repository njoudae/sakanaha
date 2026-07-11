import { useEffect, useMemo, useState, type ReactNode } from "react";
import AppBar from "./components/AppBar";
import Footer from "./components/Footer";
import AddPropertyPage from "./pages/AddPropertyPage";
import AboutPage from "./pages/AboutPage";
import CityResultsPage from "./pages/CityResultsPage";
import FaqPage from "./pages/FaqPage";
import LandingPage from "./pages/LandingPage";
import ManagePropertyPage from "./pages/ManagePropertyPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import OwnerLoginPage from "./pages/OwnerLoginPage";
import OwnerRegisterPage from "./pages/OwnerRegisterPage";
import PropertyDetailsPage from "./pages/PropertyDetailsPage";
import RoommateDetailsPage from "./pages/RoommateDetailsPage";
import RoommatesPage from "./pages/RoommatesPage";
import SupportPage from "./pages/SupportPage";
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
  | "user-location"
  | "user-search"
  | "city"
  | "property"
  | "roommates"
  | "roommate-detail"
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
  if (state.route === "roommates") return "/roommates";
  if (state.route === "about") return "/about";
  if (state.route === "faq") return "/faq";
  if (state.route === "support") return "/support";
  return "/";
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
  const [, forceRefresh] = useState(0);

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

  const ownerRoutes: Route[] = [
    "owner-login",
    "owner-register",
    "owner-dashboard",
    "add-property",
    "manage-property",
    "owner-property-preview",
  ];

  function navigatePublic(next: RouteState) {
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
    if (ownerRoutes.includes(route)) {
      setRoute(owner ? "owner-dashboard" : "owner-login");
      return;
    }
    navigatePublic({ route: "landing" });
  }

  function goOwnerLogin() {
    setRoute("owner-login");
  }

  function goUserStart() {
    if (user) {
      setRoute("user-location");
      return;
    }
    setPendingUserRoute({ route: "user-location" });
    setRoute("user-login");
  }

  function goCity(nextCity: string) {
    navigatePublic({ route: "city", cityName: nextCity });
  }

  function goProperty(nextPropertyId: string) {
    const next = { route: "property" as const, propertyId: nextPropertyId };
    if (!user) {
      setPendingUserRoute(next);
      setRoute("user-login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigatePublic(next);
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

  function goRoommateDetails(nextRequestId: string) {
    const next = { route: "roommate-detail" as const, requestId: nextRequestId };
    if (!user) {
      setPendingUserRoute(next);
      setRoute("user-login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigatePublic(next);
  }

  function completeUserAuth(nextUser: User, overrideRoute?: RouteState) {
    setUser(nextUser);
    const next = overrideRoute ?? pendingUserRoute;
    setPendingUserRoute(null);
    if (next) {
      if (next.route === "user-location") {
        setRoute("user-location");
        return;
      }
      navigatePublic(next);
      return;
    }
    setRoute("user-location");
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
    await authService.logout();
    setOwner(null);
    setEditingProperty(null);
    navigatePublic({ route: "landing" });
  }

  function frame(children: ReactNode, showFooter = false) {
    return (
      <>
        <AppBar
          onHome={goHome}
          onOwner={goOwnerLogin}
          onUser={goUserStart}
          onCities={scrollToCities}
          onCity={goCity}
          onRoommates={goRoommates}
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
      </>
    );
  }

  if (route === "owner-login") {
    return frame(
      <OwnerLoginPage
        onHome={() => navigatePublic({ route: "landing" })}
        onLogin={(nextOwner) => {
          setOwner(nextOwner);
          setRoute("owner-dashboard");
        }}
        onCreateAccount={() => setRoute("owner-register")}
      />,
    );
  }

  if (route === "owner-register") {
    return frame(
      <OwnerRegisterPage
        onBack={() => setRoute("owner-login")}
        onDone={(nextOwner) => {
          setOwner(nextOwner);
          setRoute("owner-dashboard");
        }}
      />,
    );
  }

  if (route === "owner-dashboard" && owner) {
    return frame(
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
      />,
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
      <UserRegisterPage onBack={() => setRoute("user-login")} onDone={completeUserAuth} />,
    );
  }

  if (route === "user-location") {
    return frame(
      <UserLocationPage
        onBack={() => setRoute("user-register")}
        onDone={(university) => {
          setSelectedUniversity(university);
          setRoute("user-search");
        }}
      />,
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

  if (route === "property" && !user) {
    const next = { route: "property" as const, propertyId };
    return frame(
      <UserLoginPage
        onHome={() => navigatePublic({ route: "landing" })}
        onLogin={(nextUser) => completeUserAuth(nextUser, next)}
        onCreateAccount={() => {
          setPendingUserRoute(next);
          setRoute("user-register");
        }}
      />,
    );
  }

  if (route === "property") {
    return frame(
      <PropertyDetailsPage
        propertyId={propertyId}
        user={user}
        onBackToCity={goCity}
        onProperty={goProperty}
      />,
      true,
    );
  }

  if (route === "roommates") {
    return frame(<RoommatesPage onDetails={goRoommateDetails} />, true);
  }

  if (route === "roommate-detail" && !user) {
    const next = { route: "roommate-detail" as const, requestId };
    return frame(
      <UserLoginPage
        onHome={() => navigatePublic({ route: "landing" })}
        onLogin={(nextUser) => completeUserAuth(nextUser, next)}
        onCreateAccount={() => {
          setPendingUserRoute(next);
          setRoute("user-register");
        }}
      />,
    );
  }

  if (route === "roommate-detail") {
    return frame(<RoommateDetailsPage requestId={requestId} onBack={goRoommates} />, true);
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
      onOwner={goOwnerLogin}
      onUser={goUserStart}
      onCity={goCity}
      onRoommates={goRoommates}
    />,
    true,
  );
}
