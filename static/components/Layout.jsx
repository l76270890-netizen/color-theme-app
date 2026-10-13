import React from "react";
import { Outlet } from "react-router-dom";
import AssistantPanel from "./AssistantPanel.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Sidebar from "./Sidebar.jsx";
import { useAppState } from "../appState.jsx";

export default function Layout() {
  const { sidebarCollapsed } = useAppState();

  return (
    <div className={`dashboard-layout${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <Sidebar />
      <div className="workspace-column">
        <Header />
        <main className="workspace-main"><Outlet /></main>
        <Footer />
      </div>
      <AssistantPanel />
    </div>
  );
}
