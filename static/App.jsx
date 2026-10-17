import React, { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import AccountPage from "./pages/AccountPage.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";
import Layout from "./components/Layout.jsx";
import AssistantPage from "./pages/AssistantPage.jsx";
import CollectionsPage from "./pages/CollectionsPage.jsx";
import ExplorePage from "./pages/ExplorePage.jsx";
import HomePage from "./pages/HomePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import PaletteDetailsPage from "./pages/PaletteDetailsPage.jsx";
import PreviewPage from "./pages/PreviewPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { useAppState } from "./appState.jsx";

function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { pathname } = location;
  useEffect(() => {
    if (navigationType !== "POP" && !location.state?.backgroundLocation) {
      window.scrollTo(0, 0);
    }
  }, [location.state, navigationType, pathname]);
  return null;
}

function RequireSignIn() {
  const { authReady, isSignedIn } = useAppState();
  const location = useLocation();

  if (!authReady) {
    return <div className="auth-checking" role="status">Checking your workspace…</div>;
  }
  if (!isSignedIn) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

export default function App() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

  return (
    <>
      <ScrollToTop />
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="login" element={<AccountPage />} />
        <Route path="signup" element={<AccountPage />} />
        <Route element={<RequireSignIn />}>
          <Route element={<Layout />}>
            <Route path="home" element={<HomePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="palette/:paletteId" element={<PaletteDetailsPage />} />
            <Route path="preview" element={<PreviewPage />} />
            <Route path="collections" element={<CollectionsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {backgroundLocation && (
        <Routes>
          <Route path="login" element={<AccountPage />} />
          <Route path="signup" element={<AccountPage />} />
        </Routes>
      )}
    </>
  );
}
