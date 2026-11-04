
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Ticket,
  UserRound,
} from "lucide-react";

type EventDetails = {
  id: number;
  title: string;
  description: string | null;
  joinCode: string;
  status: string;
};

export default function JoinEvent() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function verifyEvent() {
      setLoading(true);
      setError("");
      setEvent(null);

      if (!code || !/^[A-Z0-9]{6}$/i.test(code)) {
        setError("Invalid event code. Please try again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/events/code/${encodeURIComponent(code.toUpperCase())}`,
          { signal: controller.signal }
        );

        if (response.status === 404) {
          throw new Error("Event not found. Check your code.");
        }

        if (!response.ok) {
          throw new Error("Unable to verify this event.");
        }

        const data: EventDetails = await response.json();
        setEvent(data);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    verifyEvent();

    return () => controller.abort();
  }, [code]);

  function handleJoin() {
    if (!event || !nickname.trim()) return;

    // Temporary participant identity for our MVP.
    const participantKey = `ripple:participant:${event.id}`;

    let participantId = sessionStorage.getItem(participantKey);

    if (!participantId) {
      participantId = crypto.randomUUID();
      sessionStorage.setItem(participantKey, participantId);
    }

    sessionStorage.setItem(
      `ripple:nickname:${event.id}`,
      nickname.trim()
    );

    navigate(`/room/${event.joinCode}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#090B16] px-5 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between py-7">
        <Link to="/" className="text-2xl font-bold">
          ripple<span className="text-violet-400">.</span>
        </Link>

        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft size={16} />
          Back home
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 items-center py-12">
        <div className="w-full rounded-3xl border border-white/10 bg-[#15182A] p-8 shadow-2xl">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-14">
              <LoaderCircle
                size={36}
                className="animate-spin text-violet-400"
              />
              <p className="text-slate-400">Verifying event code...</p>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-5 text-center">
              <h1 className="text-2xl font-semibold">
                Couldn't join event
              </h1>
              <p role="alert" className="text-slate-400">
                {error}
              </p>
              <Link
                to="/"
                className="inline-block rounded-xl bg-violet-600 px-6 py-3 font-semibold"
              >
                Try another code
              </Link>
            </div>
          )}

          {!loading && event && (
            <div>
              <div className="mb-6 flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 size={18} />
                Event code verified
              </div>

              <p className="mb-2 text-xs font-semibold tracking-widest text-slate-400">
                YOU'RE JOINING
              </p>

              <h1 className="text-3xl font-bold">
                {event.title}
              </h1>

              {event.description && (
                <p className="mt-3 text-slate-400">
                  {event.description}
                </p>
              )}

              <div className="mt-7 flex items-center justify-between rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <Ticket className="text-violet-400" />
                  <span className="font-mono font-semibold tracking-wider">
                    {event.joinCode}
                  </span>
                </div>
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-300">
                  {event.status}
                </span>
              </div>

              <div className="mt-8">
                <label
                  htmlFor="nickname"
                  className="mb-3 block font-medium"
                >
                  What should we call you?
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0D1020] px-4">
                  <UserRound size={20} className="text-slate-500" />

                  <input
                    id="nickname"
                    type="text"
                    maxLength={30}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname"
                    className="w-full bg-transparent py-4 outline-none"
                  />
                </div>

                <button
                  onClick={handleJoin}
                  disabled={!nickname.trim() || event.status === "ENDED"}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Enter Event Room
                  <ArrowRight size={19} />
                </button>

                {event.status === "ENDED" && (
                  <p className="mt-3 text-sm text-amber-300">
                    This event has ended.
                  </p>
                )}

                <p className="mt-5 text-center text-sm text-slate-500">
                  No account required
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
