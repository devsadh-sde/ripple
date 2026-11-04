
import { useState } from "react";
import {
  ArrowRight,
  AudioLines,
  BarChart3,
  MessageCircle,
  Radio,
  Sparkles,
  Users,
} from "lucide-react";

export default function App() {
  const [eventCode, setEventCode] = useState("");
  const [error, setError] = useState("");

  function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const code = eventCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError("Please enter a valid 6-character event code.");
      return;
    }

    setError("");
    window.location.href = `/join/${encodeURIComponent(code)}`;
  }

  return (
    <div className="min-h-screen bg-[#090B16] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <a href="/" className="flex items-center gap-2 text-2xl font-bold">
          <AudioLines className="text-violet-400" />
          ripple<span className="text-violet-400">.</span>
        </a>

        <nav className="flex items-center gap-6">
          <a
            href="#features"
            className="hidden text-sm text-slate-300 hover:text-white sm:block"
          >
            How it works
          </a>
          <a
            href="/login"
            className="rounded-full border border-white/20 px-5 py-2 text-sm hover:bg-white/10"
          >
            Organizer Login
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-xs font-medium text-violet-300">
              <Sparkles size={15} />
              THE FUTURE OF AUDIENCE ENGAGEMENT
            </div>

            <h1 className="max-w-2xl text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
              Every voice creates a{" "}
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                ripple.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
              Transform presentations, classrooms, and events into
              interactive experiences with live polls, audience
              questions, and real-time insights.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 font-semibold transition hover:bg-violet-500"
              >
                Create an Event <ArrowRight size={18} />
              </a>
              <a
                href="#join"
                className="rounded-xl border border-white/20 px-6 py-3 font-semibold transition hover:bg-white/10"
              >
                Join an Event
              </a>
            </div>
          </div>

          <div
            id="join"
            className="rounded-3xl border border-white/10 bg-[#15182A] p-8 shadow-2xl shadow-violet-950/30"
          >
            <div className="mb-7 flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/15 p-3">
                <Radio className="text-violet-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Join an event</h2>
                <p className="text-sm text-slate-400">
                  No account required
                </p>
              </div>
            </div>

            <form onSubmit={handleJoin}>
              <label
                htmlFor="event-code"
                className="mb-3 block text-sm font-medium text-slate-300"
              >
                Event code
              </label>

              <input
                id="event-code"
                value={eventCode}
                onChange={(e) => {
                  setEventCode(e.target.value.toUpperCase().slice(0, 6));
                  setError("");
                }}
                placeholder="98T55Q"
                maxLength={6}
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#0D1020] px-5 py-4 text-center text-2xl font-bold tracking-[0.35em] outline-none transition focus:border-violet-400"
              />

              {error && (
                <p role="alert" className="mt-3 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold transition hover:bg-violet-500"
              >
                Join Event <ArrowRight size={18} />
              </button>
            </form>

            <div className="mt-7 border-t border-white/10 pt-6 text-center text-sm text-slate-400">
              Hosting an event?{" "}
              <a href="/signup" className="font-semibold text-violet-400">
                Get started
              </a>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold">
              Make every moment interactive
            </h2>
            <p className="mt-3 text-slate-400">
              Everything you need to engage your audience.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: BarChart3,
                title: "Live Polling",
                description:
                  "Collect audience votes and visualize results instantly.",
              },
              {
                icon: MessageCircle,
                title: "Interactive Q&A",
                description:
                  "Give everyone a voice through audience questions.",
              },
              {
                icon: Users,
                title: "Audience Insights",
                description:
                  "Understand participation and engagement in real time.",
              },
            ].map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-7"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-violet-500/10 p-3">
                    <Icon className="text-violet-400" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="leading-relaxed text-slate-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        Ripple — Every voice creates a ripple.
      </footer>
    </div>
  );
}
