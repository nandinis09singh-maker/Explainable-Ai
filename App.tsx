import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import AuditReports from "./pages/AuditReports";
import Dashboard from "./pages/Dashboard";
import DecisionExplorer from "./pages/DecisionExplorer";
import Monitoring from "./pages/Monitoring";
import Settings from "./pages/Settings";
import WhatIfLab from "./pages/WhatIfLab";

const NAV = [
  ["/dashboard", "Overview"], ["/decisions", "Decision Explorer"], ["/simulate", "What-If Lab"],
  ["/monitoring", "Fairness & Monitoring"], ["/audit", "Audit & Reports"], ["/settings", "Settings"],
];

export default function App() {
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand"><i />Explainable<br />Lending</div>
        <nav aria-label="Main">{NAV.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
        <p className="demo-note">Demo mode. Synthetic data, not a lending recommendation.</p>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/decisions" element={<DecisionExplorer />} />
          <Route path="/decisions/:id" element={<DecisionExplorer />} />
          <Route path="/simulate" element={<WhatIfLab />} />
          <Route path="/decisions/:id/simulate" element={<WhatIfLab />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/audit" element={<AuditReports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<div className="state">Page not found.</div>} />
        </Routes>
      </main>
    </div>
  );
}
