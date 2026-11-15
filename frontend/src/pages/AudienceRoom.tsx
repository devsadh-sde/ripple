import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, LoaderCircle, Radio, RefreshCw, Users } from "lucide-react";

type EventDetails = {
  id: number;
  title: string;
  description: string | null;
  joinCode: string;
  status: string;
};

type PollOption = { id: number; text: string };
type Poll = {
  id: number;
  eventId: number;
  question: string;
  status: string;
  options: PollOption[];
};
type OptionResult = {
  optionId: number;
  optionText: string;
  votes: number;
  percentage: number;
};
type PollResults = {
  pollId: number;
  totalVotes: number;
  options: OptionResult[];
};
type ResultsApiResponse = {
  pollId: number;
  totalVotes: number;
  results?: OptionResult[];
  options?: OptionResult[];
  optionResults?: OptionResult[];
};

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return (await response.json()) as T;
}

export default function AudienceRoom() {
  const { code } = useParams();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [results, setResults] = useState<Record<number, PollResults>>({});
  const [votedPolls, setVotedPolls] = useState<number[]>([]);
  const [nickname, setNickname] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [voteError, setVoteError] = useState<Record<number, string>>({});
  const refreshCounter = useRef(0);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setEvent(null);
      setPolls([]);
      setResults({});
      setError("");
      try {
        if (!code) throw new Error("Missing event code.");
        const found = await getJson<EventDetails>(
          `/api/events/code/${encodeURIComponent(code)}`,
          controller.signal
        );
        const id = sessionStorage.getItem(`ripple:participant:${found.id}`);
        const name = sessionStorage.getItem(`ripple:nickname:${found.id}`);
        if (!id || !name) {
          throw new Error("Please join through the event code page first.");
        }
        const storedVotes = sessionStorage.getItem(`ripple:voted:${found.id}`);
        let votes: number[] = [];
        if (storedVotes) {
          try {
            const parsed: unknown = JSON.parse(storedVotes);
            if (Array.isArray(parsed)) {
              votes = parsed.filter((value): value is number => typeof value === "number");
            }
          } catch {
            // Ignore corrupted local demo state.
          }
        }
        if (controller.signal.aborted) return;
        setEvent(found);
        setNickname(name);
        setParticipantId(id);
        setVotedPolls(votes);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Cannot load event.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [code]);

  // Receive changes immediately. The REST endpoints remain the source of truth.
  useEffect(() => {
    if (!event?.id) return;

    const eventId = event.id;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const client = new Client({
      brokerURL: `${protocol}://${window.location.host}/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("Audience WebSocket connected");
        client.subscribe(`/topic/events/${eventId}`, (message) => {
          try {
            const update: { eventId?: number; type?: string } = JSON.parse(message.body);
            if (
              update.eventId === eventId &&
              ["POLL_STARTED", "POLL_CLOSED", "VOTE_CAST"].includes(update.type ?? "")
            ) {
              console.log("Audience real-time update:", update);
              setRefreshSignal((value) => value + 1);
            }
          } catch (cause) {
            console.error("Invalid WebSocket message:", cause);
          }
        });
      },
      onStompError: (frame) => {
        console.error("Audience WebSocket STOMP error:", frame);
      },
      onWebSocketError: (event) => {
        console.error("Audience WebSocket transport error:", event);
      },
    });

    client.activate();
    return () => { void client.deactivate(); };
  }, [event?.id]);

  // Always get ALL polls so CLOSED questions and ENDED event results remain visible.
  // Filter down to LIVE questions only while event itself is LIVE.
  useEffect(() => {
    if (!event) return;
    const eventId = event.id;
    const joinCode = event.joinCode;
    const controller = new AbortController();
    let fetching = false;
    async function refresh() {
      if (fetching) return;
      fetching = true;
      const requestNumber = ++refreshCounter.current;
      try {
        const latest = await getJson<EventDetails>(
          `/api/events/code/${encodeURIComponent(joinCode)}`,
          controller.signal
        );
        const all = await getJson<Poll[]>(
          `/api/polls/event/${eventId}`,
          controller.signal
        );
        if (controller.signal.aborted || requestNumber !== refreshCounter.current) return;
        setEvent(latest);
        setPolls(all);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to refresh polls.");
        }
      } finally {
        fetching = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [event?.id, event?.joinCode, refreshSignal]);

  // Fetch poll result history for all polls, whether LIVE or CLOSED.
  useEffect(() => {
    if (!event || polls.length === 0) return;
    const controller = new AbortController();
    let fetching = false;
    async function refreshResults() {
      if (fetching) return;
      fetching = true;
      try {
        const responses = await Promise.all(
          polls.map(async (poll) => {
            try {
              const raw = await getJson<ResultsApiResponse>(
                `/api/polls/${poll.id}/results`,
                controller.signal
              );
              return {
                pollId: poll.id,
                totalVotes: raw.totalVotes,
                options: raw.options ?? raw.results ?? raw.optionResults ?? [],
              } satisfies PollResults;
            } catch {
              return null;
            }
          })
        );
        if (controller.signal.aborted) return;
        setResults((previous) => {
          const next = { ...previous };
          for (const response of responses) {
            if (response) next[response.pollId] = response;
          }
          return next;
        });
      } finally {
        fetching = false;
      }
    }
    void refreshResults();
    const timer = window.setInterval(() => void refreshResults(), 5000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [event?.id, polls.map((poll) => poll.id).join(","), refreshSignal]);

  async function submitVote(poll: Poll) {
    const choice = selected[poll.id];
    if (!event || event.status !== "LIVE" || poll.status !== "LIVE" || !choice || !participantId) return;
    setSubmitting(poll.id);
    setVoteError((prev) => ({ ...prev, [poll.id]: "" }));
    try {
      const response = await fetch(`/api/polls/${poll.id}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: choice, participantId }),
      });
      if (!response.ok) {
        throw new Error(response.status === 409
          ? "You've already voted."
          : "Vote not accepted. This poll may have closed, or you've already voted.");
      }
      const updated = [...new Set([...votedPolls, poll.id])];
      setVotedPolls(updated);
      sessionStorage.setItem(`ripple:voted:${event.id}`, JSON.stringify(updated));
    } catch (cause) {
      setVoteError((prev) => ({
        ...prev,
        [poll.id]: cause instanceof Error ? cause.message : "Unable to vote.",
      }));
    } finally {
      setSubmitting(null);
    }
  }

  const livePolls = event?.status === "LIVE"
    ? polls.filter((poll) => poll.status === "LIVE")
    : [];
  const historyPolls = event?.status === "ENDED"
    ? polls
    : polls.filter((poll) => poll.status === "CLOSED");

  function renderResults(poll: Poll) {
    const info = results[poll.id];
    if (!info) return <p className="text-sm text-slate-400">Loading results...</p>;
    if (info.options.length === 0) {
      return <p className="text-sm text-slate-400">No result breakdown available yet.</p>;
    }
    return (
      <div className="space-y-4">
        {info.options.map((option) => (
          <div key={option.optionId}>
            <div className="mb-2 flex justify-between gap-3 text-sm">
              <span>{option.optionText}</span>
              <span className="text-slate-400">{option.votes} votes · {option.percentage}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${Math.max(0, Math.min(100, option.percentage))}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-sm text-slate-400">{info.totalVotes} total votes</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090B16] px-5 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 py-6">
        <Link to="/" className="text-2xl font-bold">ripple<span className="text-violet-400">.</span></Link>
        <span className="flex items-center gap-2 text-sm text-slate-400"><Users size={16} />{nickname || "Audience"}</span>
      </header>
      <main className="mx-auto max-w-3xl py-12">
        {loading && <div className="flex justify-center py-20"><LoaderCircle className="animate-spin text-violet-400" size={36} /></div>}
        {!loading && !event && (
          <div className="text-center">
            <p className="mb-5 text-red-400">{error || "Unable to join event."}</p>
            <Link to="/" className="text-violet-400 underline">Return to Ripple</Link>
          </div>
        )}
        {event && (
          <>
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-2 text-sm text-violet-400"><Radio size={17} />AUDIENCE ROOM</div>
              <h1 className="text-3xl font-bold sm:text-4xl">{event.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg bg-white/5 px-3 py-2 font-mono text-slate-300">{event.joinCode}</span>
                <span className="rounded-full bg-violet-500/15 px-3 py-2 text-violet-300">{event.status}</span>
              </div>
            </div>
            {error && <p role="alert" className="mb-6 rounded-xl bg-red-400/10 p-4 text-sm text-red-300">{error}</p>}
            {event.status === "DRAFT" && (
              <div className="rounded-2xl border border-white/10 bg-[#15182A] p-10 text-center">
                <RefreshCw size={32} className="mx-auto mb-4 text-violet-400" />
                <h2 className="text-xl font-semibold">Waiting for the event to start</h2>
                <p className="mt-3 text-slate-400">This page updates automatically.</p>
              </div>
            )}
            {event.status === "ENDED" && (
              <div className="mb-7 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-7 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={30} />
                <h2 className="text-xl font-semibold">This event has ended</h2>
                <p className="mt-2 text-slate-300">Thank you for participating! Final results are below.</p>
              </div>
            )}
            {event.status === "LIVE" && (
              <section className="space-y-6">
                {livePolls.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#15182A] p-10 text-center">
                    <RefreshCw size={32} className="mx-auto mb-4 text-violet-400" />
                    <h2 className="text-xl font-semibold">Waiting for a live poll...</h2>
                    <p className="mt-3 text-slate-400">Closed polls are removed from voting automatically.</p>
                  </div>
                ) : livePolls.map((poll) => (
                  <article key={poll.id} className="rounded-3xl border border-white/10 bg-[#15182A] p-7">
                    <div className="mb-5 flex justify-between text-sm"><span className="text-violet-400">LIVE POLL</span><span className="text-emerald-400">● LIVE</span></div>
                    <h2 className="mb-7 text-2xl font-semibold">{poll.question}</h2>
                    {votedPolls.includes(poll.id) ? (
                      <div>
                        <div className="mb-6 flex items-center gap-2 text-emerald-400"><CheckCircle2 size={20} />Your vote was recorded</div>
                        {renderResults(poll)}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {poll.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelected((prev) => ({ ...prev, [poll.id]: option.id }))}
                              className={`w-full rounded-xl border p-4 text-left ${selected[poll.id] === option.id ? "border-violet-400 bg-violet-500/15" : "border-white/10 bg-[#0D1020] hover:border-white/30"}`}
                            >
                              <span className="flex items-center gap-3">
                                <span className={`h-4 w-4 rounded-full border ${selected[poll.id] === option.id ? "border-violet-400 bg-violet-400" : "border-slate-500"}`} />
                                {option.text}
                              </span>
                            </button>
                          ))}
                        </div>
                        {voteError[poll.id] && <p role="alert" className="mt-4 text-sm text-red-400">{voteError[poll.id]}</p>}
                        <button
                          type="button"
                          onClick={() => void submitVote(poll)}
                          disabled={!selected[poll.id] || submitting === poll.id}
                          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:opacity-40"
                        >
                          {submitting === poll.id ? "Submitting..." : "Submit Vote"}<ArrowRight size={18} />
                        </button>
                      </>
                    )}
                  </article>
                ))}
              </section>
            )}
            {event.status !== "DRAFT" && historyPolls.length > 0 && (
              <section className="mt-10 space-y-5">
                <h2 className="text-xl font-semibold">{event.status === "ENDED" ? "Final poll results" : "Closed poll results"}</h2>
                {historyPolls.map((poll) => (
                  <article key={poll.id} className="rounded-2xl border border-white/10 bg-[#15182A] p-7">
                    <div className="mb-3 text-xs font-medium text-slate-400">{poll.status === "LIVE" ? "FINAL RESULTS" : poll.status}</div>
                    <h3 className="mb-6 text-lg font-semibold">{poll.question}</h3>
                    {poll.status === "DRAFT" ? <p className="text-sm text-slate-400">This poll never opened for voting.</p> : renderResults(poll)}
                  </article>
                ))}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
