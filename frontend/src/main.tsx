
import React from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import App from "./App";
import JoinEvent from "./pages/JoinEvent";
import AudienceRoom from "./pages/AudienceRoom";

import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/join/:code" element={<JoinEvent />} />
        <Route path="/room/:code" element={<AudienceRoom />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
