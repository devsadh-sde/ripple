
import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";

type Organizer = {
  id: string;
  name: string;
  email: string;
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const registered =
    (location.state as { registered?: boolean } | null)?.registered === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Incorrect email or password."
            : "Unable to sign in. Please try again."
        );
      }

      const organizer: Organizer = await response.json();

      if (!organizer.id || !organizer.email) {
        throw new Error("Invalid server response.");
      }

      localStorage.removeItem("ripple:demo-organizer-id");
      sessionStorage.removeItem("ripple:presenter:event");

      sessionStorage.setItem(
        "ripple:organizer",
        JSON.stringify(organizer)
      );
      sessionStorage.setItem(
        "ripple:demo-organizer-id",
        organizer.id
      );

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090B16] px-5 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between py-7">
        <Link to="/" className="text-2xl font-bold">
          ripple<span className="text-violet-400">.</span>
        </Link>
        <Link
          to="/signup"
          className="text-sm text-violet-300 hover:text-violet-200"
        >
          Create an account
        </Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col justify-center py-16">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15">
            <LockKeyhole className="text-violet-300" size={26} />
          </div>
          <h1 className="text-4xl font-bold">Welcome back.</h1>
          <p className="mt-3 text-slate-400">
            Sign in to manage your Ripple events.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-white/10 bg-[#15182A] p-8"
        >
          {registered && !error && (
            <p
              role="status"
              className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300"
            >
              Account created! Sign in to continue.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm text-slate-300"
            >
              Email address
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1020] px-4 focus-within:border-violet-400">
              <Mail size={18} className="text-slate-500" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 bg-transparent py-4 outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm text-slate-300"
            >
              Password
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1020] px-4 focus-within:border-violet-400">
              <LockKeyhole size={18} className="text-slate-500" />
              <input
                id="login-password"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="min-w-0 flex-1 bg-transparent py-4 outline-none"
              />
              <button
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((v) => !v)}
                className="text-slate-400 hover:text-white"
              >
                {visible ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <ArrowRight size={18} />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-sm text-slate-400">
            New to Ripple?{" "}
            <Link
              to="/signup"
              className="font-medium text-violet-300 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
