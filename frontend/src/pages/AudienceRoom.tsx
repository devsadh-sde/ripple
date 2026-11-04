
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Radio,
  RefreshCw,
  Users,
} from "lucide-react";

type EventDetails = {
  id: number;
  title: string;
  description: string | null;
  joinCode: string;
  status: string;
};

type PollOption = {
  id: number;
  text: string;
};

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
  results: OptionResult[];
};

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

  // Verify event and restore the participant's session.
  useEffect(() => {
    const controller = new AbortController();

    async function loadEvent() {
      setLoading(true);
      setError("");
      setEvent(null);
      setPolls([]);
      setResults({});
      setVotedPolls([]);

      try {
        if (!code) throw new Error("Event code is missing.");

        const response = await fetch(
          `/api/events/code/${encodeURIComponent(code)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Event not found or unavailable.");
        }

        const data: EventDetails = await response.json();

        const id = sessionStorage.getItem(
          `ripple:participant:${data.id}`
        );

        const name = sessionStorage.getItem(
          `ripple:nickname:${data.id}`
        );

        if (!id || !name) {
          throw new Error(
            "Please join through the event code page first."
          );
        }

        if (controller.signal.aborted) return;

        setEvent(data);
        setParticipantId(id);
        setNickname(name);

        const saved = sessionStorage.getItem(
          `ripple:voted:${data.id}`
        );

        if (saved) {
          try {
            const parsed: unknown = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setVotedPolls(
                parsed.filter(
                  (item): item is number =>
                    typeof item === "number"
                )
              );
            }
          } catch {
            // Ignore invalid local demo session data.
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Unable to load event."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadEvent();
    return () => controller.abort();
  }, [code]);

  // Refresh the event and available polls every five seconds.
  useEffect(() => {
    if (!event) return;

    const controller = new AbortController();

    async function refresh() {
      try {
        const eventResponse = await fetch(
          `/api/events/code/${encodeURIComponent(event.joinCode)}`,
          { signal: controller.signal }
        );

        if (eventResponse.ok) {
          const updated: EventDetails = await eventResponse.json();
          if (controller.signal.aborted) return;
          setEvent(updated);

          if (updated.status !== "LIVE") {
            setPolls([]);
            return;
          }
        } else {
          throw new Error("Unable to refresh event.");
        }

        const pollResponse = await fetch(
          `/api/polls/event/${event.id}/live`,
          { signal: controller.signal }
        );

        if (!pollResponse.ok) {
          throw new Error("Unable to load active polls.");
        }

        const data: Poll[] = await pollResponse.json();
        if (!controller.signal.aborted) {
          setPolls(data);
          setError("");
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to refresh polls. Check that both services are running.");
        }
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 5000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [event?.id, event?.joinCode]);

  // Fetch updated results after the participant votes.
  useEffect(() => {
    if (!event || votedPolls.length === 0) return;

    const controller = new AbortController();

    async function refreshResults() {
      for (const pollId of votedPolls) {
        try {
          const response = await fetch(
            `/api/polls/${pollId}/results`,
            { signal: controller.signal }
          );

          if (!response.ok) continue;

          const data: PollResults = await response.json();

          if (!controller.signal.aborted) {
            setResults((previous) => ({
              ...previous,
              [pollId]: data,
            }));
          }
        } catch {
          // Keep the previous result if a refresh fails.
        }
      }
    }

    refreshResults();
    const timer = window.setInterval(refreshResults, 5000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [event?.id, votedPolls]);

  async function submitVote(poll: Poll) {
    const optionId = selected[poll.id];

    if (!optionId || !participantId) return;

    setSubmitting(poll.id);
    setVoteError((previous) => ({
      ...previous,
      [poll.id]: "",
    }));

    try {
      const response = await fetch(
        `/api/polls/${poll.id}/votes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            optionId,
            participantId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? "You have already voted in this poll."
            : "Vote not accepted. The poll may be closed or you may have already voted."
        );
      }

      const updated = [...new Set([...votedPolls, poll.id])];

      setVotedPolls(updated);

      sessionStorage.setItem(
        `ripple:voted:${event!.id}`,
        JSON.stringify(updated)
      );
    } catch (err) {
      setVoteError((previous) => ({
        ...previous,
        [poll.id]:
          err instanceof Error ? err.message : "Unable to submit vote.",
      }));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#090B16] px-5 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between border-b border-white/10 py-6">
        <Link to="/" className="text-2xl font-bold">
          ripple<span className="text-violet-400">.</span>
        </Link>

        <span className="flex items-center gap-2 text-sm text-slate-400">
          <Users size={16} />
          {nickname || "Audience"}
        </span>
      </header>

      <main className="mx-auto max-w-3xl py-12">
        {loading && (
          <div className="flex justify-center py-20">
            <LoaderCircle className="animate-spin text-violet-400" size={36} />
          </div>
        )}

        {!loading && !event && (
          <div className="text-center">
            <p className="mb-5 text-red-400">
              {error || "Unable to join event."}
            </p>
            <Link to="/" className="text-violet-400 underline">
              Return to Ripple
            </Link>
          </div>
        )}

        {event && (
          <>
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-2 text-sm text-violet-400">
                <Radio size={17} />
                AUDIENCE ROOM
              </div>

              <h1 className="text-3xl font-bold sm:text-4xl">
                {event.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg bg-white/5 px-3 py-2 font-mono text-slate-300">
                  {event.joinCode}
                </span>

                <span className="rounded-full bg-violet-500/15 px-3 py-2 text-violet-300">
                  {event.status}
                </span>
              </div>
            </div>

            {error && (
              <p role="alert" className="mb-6 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300">
                {error}
              </p>
            )}

            {event.status !== "LIVE" ? (
              <div className="rounded-2xl border border-white/10 bg-[#15182A] p-9 text-center">
                <h2 className="text-xl font-semibold">
                  {event.status === "ENDED"
                    ? "This event has ended."
                    : "Waiting for the event to start"}
                </h2>
                <p className="mt-3 text-slate-400">
                  {event.status === "ENDED"
                    ? "Thank you for participating!"
                    : "The presenter will start the event shortly."}
                </p>
              </div>
            ) : polls.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#15182A] p-10 text-center">
                <RefreshCw
                  size={34}
                  className="mx-auto mb-5 text-violet-400"
                />
                <h2 className="text-xl font-semibold">
                  Waiting for a live poll...
                </h2>
                <p className="mt-3 text-slate-400">
                  Polls will appear automatically when the presenter starts one.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {polls.map((poll) => {
                  const hasVoted = votedPolls.includes(poll.id);
                  const pollResults = results[poll.id];

                  return (
                    <div
                      key={poll.id}
                      className="rounded-3xl border border-white/10 bg-[#15182A] p-7"
                    >
                      <div className="mb-5 flex justify-between">
                        <span className="text-sm text-violet-400">
                          LIVE POLL
                        </span>
                        <span className="text-xs text-emerald-400">
                          ● LIVE
                        </span>
                      </div>

                      <h2 className="mb-7 text-2xl font-semibold">
                        {poll.question}
                      </h2>

                      {hasVoted ? (
                        <div>
                          <div className="mb-6 flex items-center gap-2 text-emerald-400">
                            <CheckCircle2 size={20} />
                            Your vote was recorded
                          </div>

                          {pollResults ? (
                            <div className="space-y-5">
                              {pollResults.results.map((result) => (
                                <div key={result.optionId}>
                                  <div className="mb-2 flex justify-between text-sm">
                                    <span>{result.optionText}</span>
                                    <span className="text-slate-400">
                                      {result.votes} votes · {result.percentage}%
                                    </span>
                                  </div>
                                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-violet-500 transition-all"
                                      style={{
                                        width: `${result.percentage}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                              <p className="text-sm text-slate-400">
                                {pollResults.totalVotes} total votes
                              </p>
                            </div>
                          ) : (
                            <p className="text-slate-400">
                              Loading results...
                            </p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {poll.options.map((option) => (
                              <button
                                key={option.id}
                                onClick={() =>
                                  setSelected((previous) => ({
                                    ...previous,
                                    [poll.id]: option.id,
                                  }))
                                }
                                className={`w-full rounded-xl border p-4 text-left transition ${
                                  selected[poll.id] === option.id
                                    ? "border-violet-400 bg-violet-500/15"
                                    : "border-white/10 bg-[#0D1020] hover:border-white/30"
                                }`}
                              >
                                <span className="flex items-center gap-3">
                                  <span className={`h-4 w-4 rounded-full border ${
                                    selected[poll.id] === option.id
                                      ? "border-violet-400 bg-violet-400"
                                      : "border-slate-500"
                                  }`} />
                                  {option.text}
                                </span>
                              </button>
                            ))}
                          </div>

                          {voteError[poll.id] && (
                            <p role="alert" className="mt-4 text-sm text-red-400">
                              {voteError[poll.id]}
                            </p>
                          )}

                          <button
                            onClick={() => submitVote(poll)}
                            disabled={
                              !selected[poll.id] ||
                              submitting === poll.id
                            }
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {submitting === poll.id
                              ? "Submitting..."
                              : "Submit Vote"}
                            <ArrowRight size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
