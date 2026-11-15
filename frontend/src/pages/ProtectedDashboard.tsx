
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { LoaderCircle, LogOut, ShieldCheck } from "lucide-react";
import PresenterDashboard from "./PresenterDashboard";

type Organizer = {
  id: string;
  name: string;
  email: string;
};

type AuthStatus = "loading" | "authorized" | "unauthorized" | "error";

export default function ProtectedDashboard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const checkSession = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });

      if (signal?.aborted) return;

      if (response.status === 401 || response.status === 403) {
        setOrganizer(null);
        sessionStorage.removeItem("ripple:organizer");
        sessionStorage.removeItem("ripple:demo-organizer-id");
        sessionStorage.removeItem("ripple:presenter:event");
        setStatus("unauthorized");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to verify your session.");
      }

      const current = (await response.json()) as Organizer;
      if (signal?.aborted) return;

      const previousRaw = sessionStorage.getItem("ripple:organizer");
      if (previousRaw) {
        try {
          const previous = JSON.parse(previousRaw) as Organizer;
          if (previous.id !== current.id) {
            sessionStorage.removeItem("ripple:presenter:event");
          }
        } catch {
          sessionStorage.removeItem("ripple:presenter:event");
        }
      }

      localStorage.removeItem("ripple:demo-organizer-id");
      sessionStorage.setItem(
        "ripple:organizer",
        JSON.stringify(current)
      );
      sessionStorage.setItem("ripple:demo-organizer-id", current.id);

      setOrganizer(current);
      setStatus("authorized");
    } catch (error) {
      if (signal?.aborted) return;
      console.error("Session check failed:", error);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void checkSession(controller.signal);
    return () => controller.abort();
  }, [checkSession]);

  useEffect(() => {
    if (status !== "authorized") return;

    const refresh = () => void checkSession();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 60000);

    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [status, checkSession]);

  async function logout() {
    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Logout failed. Please try again.");
      }

      sessionStorage.removeItem("ripple:organizer");
      sessionStorage.removeItem("ripple:demo-organizer-id");
      sessionStorage.removeItem("ripple:presenter:event");
      localStorage.removeItem("ripple:demo-organizer-id");

      setOrganizer(null);
      setStatus("unauthorized");
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(
        error instanceof Error ? error.message : "Unable to log out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (status === "unauthorized") {
    return <Navigate to="/login" replace />;
  }

  if (status === "loading" || status === "error" || !organizer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#090B16] text-slate-300">
        {status === "loading" ? (
          <LoaderCircle
            className="animate-spin text-violet-400"
            size={34}
          />
        ) : (
          <p>Unable to verify your Ripple session.</p>
        )}

        {status === "loading" && <p>Checking your Ripple session...</p>}

        <button
          onClick={() => {
            setStatus("loading");
            void checkSession();
          }}
          className="text-sm text-violet-300 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-4 border-b border-violet-500/20 bg-[#101426] px-6 py-3 text-sm text-white">
        <span className="flex items-center gap-2 text-slate-300">
          <ShieldCheck size={17} className="text-emerald-400" />
          Signed in as <strong>{organizer.name}</strong>
        </span>

        <button
          type="button"
          onClick={() => void logout()}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10 disabled:opacity-50"
        >
          <LogOut size={16} />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>

        {logoutError && (
          <span role="alert" className="text-red-300">
            {logoutError}
          </span>
        )}
      </div>

      <PresenterDashboard />
    </>
  );
}
