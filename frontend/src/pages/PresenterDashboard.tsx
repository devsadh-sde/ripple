
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Client } from "@stomp/stompjs";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Plus,
  Radio,
  Trash2,
  Play,
  Square,
  RefreshCw,
} from "lucide-react";

type EventDetails = {
  id: number;
  title: string;
  description: string | null;
  joinCode: string;
  status: string;
  organizerId: string;
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
  options: OptionResult[];
};

type RawResults = {
  pollId: number;
  totalVotes: number;
  options?: OptionResult[];
  results?: OptionResult[];
  optionResults?: OptionResult[];
};

const EVENT_STORAGE_KEY = "ripple:presenter:event";

function getOrganizerId(): string {
  const raw = sessionStorage.getItem("ripple:organizer");

  if (!raw) {
    throw new Error("Please sign in to manage your events.");
  }

  const organizer = JSON.parse(raw) as { id?: string };

  if (!organizer.id) {
    throw new Error("Please sign in to manage your events.");
  }

  return organizer.id;
}

function getSavedEvent(): EventDetails | null {
  const saved = sessionStorage.getItem(EVENT_STORAGE_KEY);

  if (!saved) return null;

  try {
    const data = JSON.parse(saved) as EventDetails;

    if (
      data.id &&
      data.joinCode &&
      data.organizerId === getOrganizerId()
    ) {
      return data;
    }
  } catch {
    // Ignore invalid saved data.
  }

  sessionStorage.removeItem(EVENT_STORAGE_KEY);
  return null;
}

async function readError(
  response: Response,
  fallback: string
): Promise<Error> {
  try {
    const body = (await response.json()) as {
      message?: string;
      detail?: string;
    };

    return new Error(body.message || body.detail || fallback);
  } catch {
    return new Error(fallback);
  }
}

export default function PresenterDashboard() {
  const [event, setEvent] = useState<EventDetails | null>(
    getSavedEvent
  );

  const [myEvents, setMyEvents] = useState<EventDetails[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [results, setResults] = useState<
    Record<number, PollResults>
  >({});

  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lookupCode, setLookupCode] = useState("");

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const [busy, setBusy] = useState(false);
  const [busyPoll, setBusyPoll] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function saveEvent(data: EventDetails) {
    setEvent(data);
    sessionStorage.setItem(
      EVENT_STORAGE_KEY,
      JSON.stringify(data)
    );
  }

  function selectEvent(data: EventDetails) {
    setPolls([]);
    setResults({});
    setError("");
    setMessage("");
    saveEvent(data);
  }

  function clearSelectedEvent() {
    sessionStorage.removeItem(EVENT_STORAGE_KEY);
    setEvent(null);
    setPolls([]);
    setResults({});
    setError("");
    setMessage("");
  }

  const loadMyEvents = useCallback(async () => {
    try {
      const organizerId = getOrganizerId();

      const response = await fetch(
        `/api/events/organizer/${organizerId}`,
        { credentials: "same-origin" }
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to load your events."
        );
      }

      const data: EventDetails[] = await response.json();
      setMyEvents(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load event history."
      );
    }
  }, []);

  const refreshDashboard = useCallback(
    async (eventId: number, signal?: AbortSignal) => {
      try {
        const eventResponse = await fetch(
          `/api/events/${eventId}`,
          { signal, credentials: "same-origin" }
        );

        if (!eventResponse.ok) {
          throw await readError(
            eventResponse,
            "Unable to retrieve event."
          );
        }

        const updatedEvent: EventDetails =
          await eventResponse.json();

        if (updatedEvent.organizerId !== getOrganizerId()) {
          throw new Error("This event belongs to another organizer.");
        }

        const pollResponse = await fetch(
          `/api/polls/event/${eventId}`,
          { signal, credentials: "same-origin" }
        );

        if (!pollResponse.ok) {
          throw await readError(
            pollResponse,
            "Unable to retrieve polls."
          );
        }

        const savedPolls: Poll[] = await pollResponse.json();

        const resultEntries = await Promise.all(
          savedPolls.map(async (poll) => {
            try {
              const response = await fetch(
                `/api/polls/${poll.id}/results`,
                { signal, credentials: "same-origin" }
              );

              if (!response.ok) return null;

              const data: RawResults = await response.json();

              return [
                poll.id,
                {
                  pollId: data.pollId,
                  totalVotes: data.totalVotes,
                  options:
                    data.options ??
                    data.results ??
                    data.optionResults ??
                    [],
                },
              ] as const;
            } catch {
              return null;
            }
          })
        );

        if (signal?.aborted) return;

        setEvent(updatedEvent);
        sessionStorage.setItem(
          EVENT_STORAGE_KEY,
          JSON.stringify(updatedEvent)
        );
        setPolls(savedPolls);

        setResults(
          Object.fromEntries(
            resultEntries.filter(
              (entry): entry is NonNullable<typeof entry> =>
                entry !== null
            )
          )
        );
      } catch (err) {
        if (signal?.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to refresh dashboard."
        );
      }
    },
    []
  );

  useEffect(() => {
    void loadMyEvents();
  }, [loadMyEvents]);

  useEffect(() => {
    if (!event) return;

    const eventId = event.id;
    const controller = new AbortController();

    void refreshDashboard(eventId, controller.signal);

    const timer = window.setInterval(() => {
      void refreshDashboard(eventId, controller.signal);
    }, 5000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [event?.id, refreshDashboard]);

  useEffect(() => {
    if (!event) return;

    const eventId = event.id;
    const protocol =
      window.location.protocol === "https:" ? "wss" : "ws";

    const client = new Client({
      brokerURL: `${protocol}://${window.location.host}/ws`,
      reconnectDelay: 5000,

      onConnect: () => {
        client.subscribe(
          `/topic/events/${eventId}`,
          (message) => {
            try {
              const update = JSON.parse(message.body) as {
                type?: string;
                eventId?: number;
              };

              if (
                update.eventId === eventId &&
                [
                  "VOTE_CAST",
                  "POLL_STARTED",
                  "POLL_CLOSED",
                ].includes(update.type ?? "")
              ) {
                void refreshDashboard(eventId);
              }
            } catch (err) {
              console.error("Invalid WebSocket message:", err);
            }
          }
        );
      },

      onStompError: (frame) => {
        console.error("WebSocket error:", frame);
      },
    });

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [event?.id, refreshDashboard]);

  async function openEventByCode(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    const code = lookupCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError("Enter a valid six-character event code.");
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `/api/events/code/${code}`
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Event not found."
        );
      }

      const data: EventDetails = await response.json();

      if (data.organizerId !== getOrganizerId()) {
        throw new Error(
          "This event belongs to another organizer."
        );
      }

      selectEvent(data);
      setLookupCode("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to find event."
      );
    }
  }

  async function createEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!eventTitle.trim()) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: eventTitle.trim(),
          description: description.trim(),
          organizerId: getOrganizerId(),
        }),
      });

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to create event."
        );
      }

      const data: EventDetails = await response.json();

      selectEvent(data);
      setEventTitle("");
      setDescription("");
      setMessage("Event created successfully!");

      await loadMyEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create event."
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeEventStatus(
    action: "start" | "end"
  ) {
    if (!event) return;

    if (
      action === "end" &&
      !window.confirm(
        "End this event? This action cannot be undone."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/events/${event.id}/${action}`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw await readError(
          response,
          `Unable to ${action} event.`
        );
      }

      const data: EventDetails = await response.json();

      saveEvent(data);
      setMessage(
        action === "start"
          ? "Your event is now LIVE!"
          : "Event ended successfully."
      );

      await loadMyEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} event.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function createPoll(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!event || event.status === "ENDED") return;

    const cleanOptions = options
      .map((option) => option.trim())
      .filter(Boolean);

    if (
      !question.trim() ||
      cleanOptions.length < 2 ||
      cleanOptions.length > 10
    ) {
      setError("Enter a question and 2–10 answer options.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/polls", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event.id,
          question: question.trim(),
          options: cleanOptions,
        }),
      });

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to create poll."
        );
      }

      setQuestion("");
      setOptions(["", ""]);
      setMessage("Poll created!");

      await refreshDashboard(event.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create poll."
      );
    } finally {
      setBusy(false);
    }
  }

  async function updatePollStatus(
    pollId: number,
    action: "start" | "close"
  ) {
    if (!event || event.status !== "LIVE") return;

    setBusyPoll(pollId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/polls/${pollId}/${action}`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw await readError(
          response,
          `Unable to ${action} poll.`
        );
      }

      setMessage(
        action === "start"
          ? "Poll is LIVE!"
          : "Poll closed successfully."
      );

      await refreshDashboard(event.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to ${action} poll.`
      );
    } finally {
      setBusyPoll(null);
    }
  }

  async function manualRefresh() {
    if (!event) return;

    setRefreshing(true);
    setError("");

    try {
      await refreshDashboard(event.id);
      await loadMyEvents();
    } finally {
      setRefreshing(false);
    }
  }

  const joinUrl = event
    ? `${window.location.origin}/join/${encodeURIComponent(
        event.joinCode
      )}`
    : "";

  const totalVotes = Object.values(results).reduce(
    (sum, result) => sum + result.totalVotes,
    0
  );

  const panel =
    "rounded-3xl border border-white/10 bg-[#15182A] p-6";

  const input =
    "w-full rounded-xl border border-white/10 bg-[#0D1020] p-3 text-white outline-none focus:border-violet-400";

  const button =
    "rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="min-h-screen bg-[#090B16] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="text-2xl font-bold">
            ripple
            <span className="text-violet-400">.</span>
          </Link>

          <span className="rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-300">
            Presenter Workspace
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-7 px-6 py-10">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300"
          >
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {!event ? (
          <>
            <div>
              <p className="mb-2 text-sm uppercase tracking-widest text-violet-400">
                Welcome, Presenter
              </p>
              <h1 className="text-4xl font-bold">
                Create your next event.
              </h1>
              <p className="mt-3 text-slate-400">
                Bring your audience together with interactive polls.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className={panel}>
                <h2 className="mb-5 text-xl font-semibold">
                  Create Event
                </h2>

                <form
                  onSubmit={createEvent}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="event-title"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Event title
                    </label>
                    <input
                      id="event-title"
                      required
                      maxLength={200}
                      value={eventTitle}
                      onChange={(e) =>
                        setEventTitle(e.target.value)
                      }
                      placeholder="Ripple Tech Conference"
                      className={input}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="event-description"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Description
                    </label>
                    <textarea
                      id="event-description"
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                      placeholder="What is this event about?"
                      rows={3}
                      className={input}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className={button}
                  >
                    <Plus size={17} className="mr-2 inline" />
                    {busy ? "Creating..." : "Create Event"}
                  </button>
                </form>
              </section>

              <section className={panel}>
                <h2 className="mb-5 text-xl font-semibold">
                  My Events
                </h2>

                {myEvents.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No events found for this account yet.
                  </p>
                ) : (
                  <div className="max-h-80 space-y-3 overflow-auto">
                    {myEvents.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectEvent(item)}
                        className="w-full rounded-xl border border-white/10 bg-[#0D1020] p-4 text-left hover:border-violet-400"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">
                            {item.title}
                          </span>
                          <span className="text-xs text-violet-300">
                            {item.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          Join code: {item.joinCode}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void loadMyEvents()}
                  className="mt-5 text-sm text-violet-300 hover:underline"
                >
                  <RefreshCw size={15} className="mr-2 inline" />
                  Refresh event history
                </button>
              </section>
            </div>

            <section className={panel}>
              <h2 className="mb-4 text-lg font-semibold">
                Open an existing event
              </h2>

              <form
                onSubmit={openEventByCode}
                className="flex flex-wrap gap-3"
              >
                <input
                  value={lookupCode}
                  onChange={(e) =>
                    setLookupCode(e.target.value.toUpperCase())
                  }
                  maxLength={6}
                  placeholder="6-character event code"
                  aria-label="Event code"
                  className={`${input} max-w-xs`}
                />
                <button type="submit" className={button}>
                  Open Event
                </button>
              </form>
            </section>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={clearSelectedEvent}
                className="flex items-center gap-2 text-sm text-slate-300 hover:text-white"
              >
                <ArrowLeft size={18} />
                All Events
              </button>

              <button
                type="button"
                onClick={() => void manualRefresh()}
                disabled={refreshing}
                className="flex items-center gap-2 text-sm text-violet-300 disabled:opacity-50"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <section className={panel}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-violet-400">
                    Event #{event.id}
                  </span>
                  <h1 className="mt-2 text-3xl font-bold">
                    {event.title}
                  </h1>
                  {event.description && (
                    <p className="mt-3 text-slate-400">
                      {event.description}
                    </p>
                  )}
                </div>

                <span className="rounded-full bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-300">
                  {event.status}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {event.status === "DRAFT" && (
                  <button
                    type="button"
                    onClick={() => void changeEventStatus("start")}
                    disabled={busy}
                    className={button}
                  >
                    <Play size={17} className="mr-2 inline" />
                    Start Event
                  </button>
                )}

                {event.status === "LIVE" && (
                  <button
                    type="button"
                    onClick={() => void changeEventStatus("end")}
                    disabled={busy}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold hover:bg-red-500 disabled:opacity-50"
                  >
                    <Square size={17} className="mr-2 inline" />
                    End Event
                  </button>
                )}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className={`${panel} lg:col-span-1`}>
                <h2 className="mb-4 text-xl font-semibold">
                  Audience Access
                </h2>

                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG
                    value={joinUrl}
                    size={200}
                    className="mx-auto"
                  />
                </div>

                <p className="mt-5 text-sm text-slate-400">
                  Join code
                </p>
                <p className="mt-1 text-3xl font-bold tracking-widest text-violet-300">
                  {event.joinCode}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(joinUrl)
                      .then(() => setMessage("Join link copied!"))
                      .catch(() => setError("Unable to copy link."));
                  }}
                  className="mt-4 flex items-center gap-2 text-sm text-violet-300"
                >
                  <Copy size={16} />
                  Copy audience link
                </button>

                <a
                  href={joinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block break-all text-xs text-slate-400 underline"
                >
                  {joinUrl}
                </a>
              </section>

              <section className={`${panel} lg:col-span-2`}>
                <h2 className="mb-5 text-xl font-semibold">
                  Event Overview
                </h2>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-[#0D1020] p-4">
                    <p className="text-2xl font-bold">
                      {polls.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Total Polls
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0D1020] p-4">
                    <p className="text-2xl font-bold">
                      {polls.filter(
                        (poll) => poll.status === "LIVE"
                      ).length}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Live Polls
                    </p>
                  </div>

                  <div className="rounded-xl bg-[#0D1020] p-4">
                    <p className="text-2xl font-bold">
                      {totalVotes}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Total Votes
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3 text-sm text-slate-400">
                  <Radio size={18} className="text-violet-400" />
                  Live updates via WebSocket with an HTTP refresh fallback.
                </div>
              </section>
            </div>

            {event.status !== "ENDED" && (
              <section className={panel}>
                <h2 className="mb-5 text-xl font-semibold">
                  Create a Poll
                </h2>

                <form
                  onSubmit={createPoll}
                  className="space-y-5"
                >
                  <div>
                    <label
                      htmlFor="poll-question"
                      className="mb-2 block text-sm text-slate-300"
                    >
                      Question
                    </label>
                    <input
                      id="poll-question"
                      required
                      value={question}
                      onChange={(e) =>
                        setQuestion(e.target.value)
                      }
                      placeholder="What should we discuss next?"
                      className={input}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      Answer options
                    </p>

                    {options.map((option, index) => (
                      <div key={index} className="flex gap-3">
                        <input
                          value={option}
                          onChange={(e) =>
                            setOptions((previous) =>
                              previous.map((value, i) =>
                                i === index
                                  ? e.target.value
                                  : value
                              )
                            )
                          }
                          placeholder={`Option ${index + 1}`}
                          className={input}
                        />

                        <button
                          type="button"
                          disabled={options.length <= 2}
                          onClick={() =>
                            setOptions((previous) =>
                              previous.filter((_, i) => i !== index)
                            )
                          }
                          className="rounded-xl border border-white/10 px-3 disabled:opacity-30"
                          aria-label={`Remove option ${index + 1}`}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={options.length >= 10}
                      onClick={() =>
                        setOptions((previous) => [...previous, ""])
                      }
                      className="rounded-xl border border-white/20 px-4 py-3 text-sm disabled:opacity-50"
                    >
                      <Plus size={16} className="mr-2 inline" />
                      Add Option
                    </button>

                    <button
                      type="submit"
                      disabled={busy}
                      className={button}
                    >
                      {busy ? "Creating..." : "Create Poll"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            <section className={panel}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Event Polls
                </h2>
                <span className="text-sm text-slate-400">
                  {polls.length} polls
                </span>
              </div>

              {polls.length === 0 ? (
                <p className="text-slate-400">
                  No polls yet. Create your first poll above.
                </p>
              ) : (
                <div className="space-y-5">
                  {polls.map((poll) => {
                    const pollResults = results[poll.id];

                    return (
                      <article
                        key={poll.id}
                        className="rounded-2xl border border-white/10 bg-[#0D1020] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-violet-300">
                              Poll #{poll.id}
                            </p>
                            <h3 className="mt-2 text-lg font-semibold">
                              {poll.question}
                            </h3>
                          </div>

                          <span className="rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-300">
                            {poll.status}
                          </span>
                        </div>

                        {event.status === "LIVE" && (
                          <div className="mt-4 flex gap-3">
                            {poll.status === "DRAFT" && (
                              <button
                                type="button"
                                disabled={busyPoll === poll.id}
                                onClick={() =>
                                  void updatePollStatus(
                                    poll.id,
                                    "start"
                                  )
                                }
                                className={button}
                              >
                                <Play
                                  size={15}
                                  className="mr-2 inline"
                                />
                                Start Poll
                              </button>
                            )}

                            {poll.status === "LIVE" && (
                              <button
                                type="button"
                                disabled={busyPoll === poll.id}
                                onClick={() =>
                                  void updatePollStatus(
                                    poll.id,
                                    "close"
                                  )
                                }
                                className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold disabled:opacity-50"
                              >
                                <Square
                                  size={15}
                                  className="mr-2 inline"
                                />
                                Close Poll
                              </button>
                            )}
                          </div>
                        )}

                        <div className="mt-5 space-y-4">
                          {poll.options.map((option) => {
                            const optionResult =
                              pollResults?.options.find(
                                (item) =>
                                  item.optionId === option.id
                              );

                            const votes =
                              optionResult?.votes ?? 0;
                            const percentage =
                              optionResult?.percentage ?? 0;

                            return (
                              <div key={option.id}>
                                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                  <span>{option.text}</span>
                                  <span className="text-slate-400">
                                    {votes} votes ·{" "}
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>

                                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        Math.max(0, percentage)
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <p className="mt-5 text-xs text-slate-400">
                          {pollResults?.totalVotes ?? 0} total votes
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
