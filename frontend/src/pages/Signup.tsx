
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  UserRound,
  UserPlus,
} from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    if (password.length < 12 || password.length > 72) {
      setError("Password must be between 12 and 72 characters.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? "This email is already registered. Please sign in."
            : "Unable to create your account. Please try again."
        );
      }

      // Signup creates the account but doesn't log the user in.
      navigate("/login", {
        replace: true,
        state: { registered: true },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create account."
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
          to="/login"
          className="text-sm text-violet-300 hover:text-violet-200"
        >
          Already have an account?
        </Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col justify-center py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15">
            <UserPlus className="text-violet-300" size={26} />
          </div>

          <h1 className="text-4xl font-bold">Create your account.</h1>
          <p className="mt-3 text-slate-400">
            Start hosting interactive experiences with Ripple.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-white/10 bg-[#15182A] p-8"
        >
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
              htmlFor="signup-name"
              className="mb-2 block text-sm text-slate-300"
            >
              Your name
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1020] px-4 focus-within:border-violet-400">
              <UserRound size={18} className="text-slate-500" />
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="min-w-0 flex-1 bg-transparent py-4 outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="mb-2 block text-sm text-slate-300"
            >
              Email address
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1020] px-4 focus-within:border-violet-400">
              <Mail size={18} className="text-slate-500" />
              <input
                id="signup-email"
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
              htmlFor="signup-password"
              className="mb-2 block text-sm text-slate-300"
            >
              Password
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1020] px-4 focus-within:border-violet-400">
              <LockKeyhole size={18} className="text-slate-500" />
              <input
                id="signup-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="12–72 characters"
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
            <p className="mt-2 text-xs text-slate-500">
              Use a unique password between 12 and 72 characters.
            </p>
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
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-slate-400">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-medium text-violet-300 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
