
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ProtectedDashboard from "./pages/ProtectedDashboard";
import JoinEvent from "./pages/JoinEvent";
import AudienceRoom from "./pages/AudienceRoom";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedDashboard />} />
        <Route path="/join/:code" element={<JoinEvent />} />
        <Route path="/room/:code" element={<AudienceRoom />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
