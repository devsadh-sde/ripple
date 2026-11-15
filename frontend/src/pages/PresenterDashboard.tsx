
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
  CalendarPlus,
  RefreshCw,
} from "lucide-react";

// -------------------------------------
// Types
// -------------------------------------

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
  options: OptionResult[];
};

type RawResults = {
  pollId: number;
  totalVotes: number;
  options?: OptionResult[];
  results?: OptionResult[];
  optionResults?: OptionResult[];
};

const STORAGE_KEY = "ripple:presenter:event";
const ORGANIZER_KEY = "ripple:demo-organizer-id";

// -------------------------------------
// Helpers
// -------------------------------------

function getOrganizerId(): string {
  // Persist across browser tabs and restarts for future demo events.
  // Previously created events may belong to a different organizer UUID.
  let id = localStorage.getItem(ORGANIZER_KEY);
  if (!id) {
    id = sessionStorage.getItem(ORGANIZER_KEY) ?? crypto.randomUUID();
    localStorage.setItem(ORGANIZER_KEY, id);
  }
  sessionStorage.setItem(ORGANIZER_KEY, id);
  return id;
}

function getSavedEvent(): EventDetails | null {
  const saved = sessionStorage.getItem(STORAGE_KEY);

  if (!saved) return null;

  try {
    const data: EventDetails = JSON.parse(saved);

    if (data.id && data.joinCode) {
      return data;
    }
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  return null;
}

async function readError(
  response: Response,
  fallback: string
): Promise<Error> {
  try {
    const body: { message?: string; detail?: string } =
      await response.json();

    return new Error(body.message || body.detail || fallback);
  } catch {
    return new Error(fallback);
  }
}

// -------------------------------------
// Presenter Dashboard
// -------------------------------------

export default function PresenterDashboard() {
  const [event, setEvent] = useState<EventDetails | null>(
    getSavedEvent
  );

  const [myEvents, setMyEvents] = useState<EventDetails[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [results, setResults] = useState<
    Record<number, PollResults>
  >({});

  // Event form
  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [eventsError, setEventsError] = useState("");

  // Poll form
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  // UI state
  const [busy, setBusy] = useState(false);
  const [busyPoll, setBusyPoll] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // -------------------------------------
  // Save selected event
  // -------------------------------------

  function saveEvent(data: EventDetails) {
    setEvent(data);

    sessionStorage.setItem(
      STORAGE_KEY,
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
    sessionStorage.removeItem(STORAGE_KEY);
    setEvent(null);
    setPolls([]);
    setResults({});
    setError("");
    setMessage("");
  }

  // -------------------------------------
  // Load organizer's previous events
  // -------------------------------------

  const loadMyEvents = useCallback(async () => {
    setEventsError("");
    try {
      const organizerId = getOrganizerId();

      const response = await fetch(
        `/api/events/organizer/${organizerId}`
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to load previous events."
        );
      }

      const data: EventDetails[] = await response.json();

      setMyEvents(data);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Unable to load event history.");
      console.error("Event history error:", err);
    }
  }, []);

  useEffect(() => {
    void loadMyEvents();
  }, [loadMyEvents]);

  // Look up older demo events by their six-character code. This is not
  // proof of ownership; do not expose management APIs without real auth.
  async function openEventByCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = lookupCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setError("Enter a valid six-character event code.");
      return;
    }
    setError("");
    try {
      const response = await fetch(`/api/events/code/${normalized}`);
      if (!response.ok) throw await readError(response, "Event not found.");
      const data: EventDetails = await response.json();
      selectEvent(data);
      setLookupCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to find event.");
    }
  }

  // -------------------------------------
  // Refresh event, polls and vote results
  // -------------------------------------

  const refreshDashboard = useCallback(
    async (
      eventId: number,
      signal?: AbortSignal
    ) => {
      try {
        const eventResponse = await fetch(
          `/api/events/${eventId}`,
          { signal }
        );

        if (!eventResponse.ok) {
          throw await readError(
            eventResponse,
            "Unable to refresh event."
          );
        }

        const updatedEvent: EventDetails =
          await eventResponse.json();

        const pollResponse = await fetch(
          `/api/polls/event/${eventId}`,
          { signal }
        );

        if (!pollResponse.ok) {
          throw await readError(
            pollResponse,
            "Unable to retrieve polls."
          );
        }

        const savedPolls: Poll[] =
          await pollResponse.json();

        // Load results for each saved poll.
        const resultEntries = await Promise.all(
          savedPolls.map(async (poll) => {
            try {
              const response = await fetch(
                `/api/polls/${poll.id}/results`,
                { signal }
              );

              if (!response.ok) {
                console.warn(`Results request failed for poll ${poll.id}: ${response.status}`);
                return null;
              }

              const data: RawResults =
                await response.json();

              const normalized: PollResults = {
                pollId: data.pollId,
                totalVotes: data.totalVotes,
                options:
                  data.options ??
                  data.results ??
                  data.optionResults ??
                  [],
              };

              return [poll.id, normalized] as const;
            } catch {
              return null;
            }
          })
        );

        if (signal?.aborted) return;

        setEvent(updatedEvent);

        sessionStorage.setItem(
          STORAGE_KEY,
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
        setError(err instanceof Error ? err.message : "Unable to refresh dashboard.");
        console.error("Dashboard refresh error:", err);
      }
    },
    []
  );

  // STEP 49: Receive vote notifications over WebSocket.
  // Keep the five-second HTTP refresh below as a fallback.
  useEffect(() => {
    if (!event) return;

    const eventId = event.id;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";

    const client = new Client({
      brokerURL: `${protocol}://${window.location.host}/ws`,
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("Ripple WebSocket connected");

        client.subscribe(`/topic/events/${eventId}`, (message) => {
          try {
            const update: { type?: string; eventId?: number } = JSON.parse(message.body);

            if (update.type === "VOTE_CAST" && update.eventId === eventId) {
              console.log("New vote received!", update);
              void refreshDashboard(eventId);
            }
          } catch (error) {
            console.error("Invalid Ripple WebSocket message:", error);
          }
        });
      },
      onStompError: (frame) => {
        console.error("Ripple WebSocket error:", frame);
      },
      onWebSocketError: (event) => {
        console.error("Ripple WebSocket connection failed:", event);
      },
    });

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [event?.id, refreshDashboard]);

  useEffect(() => {
    if (!event) return;

    const eventId = event.id;
    const controller = new AbortController();

    void refreshDashboard(
      eventId,
      controller.signal
    );

    const timer = window.setInterval(() => {
      void refreshDashboard(
        eventId,
        controller.signal
      );
    }, 5000);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [event?.id, refreshDashboard]);

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

  // -------------------------------------
  // Create event
  // -------------------------------------

  async function createEvent(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!eventTitle.trim()) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: eventTitle.trim(),
            description: description.trim(),
            organizerId: getOrganizerId(),
          }),
        }
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to create event."
        );
      }

      const data: EventDetails =
        await response.json();

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

  // -------------------------------------
  // Start event
  // -------------------------------------

  async function startEvent() {
    if (!event || event.status !== "DRAFT") return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/events/${event.id}/start`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to start event."
        );
      }

      const data: EventDetails =
        await response.json();

      saveEvent(data);
      setMessage("Your event is now LIVE!");

      await loadMyEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to start event."
      );
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------
  // End event
  // -------------------------------------

  async function endEvent() {
    if (!event || event.status !== "LIVE") return;

    const confirmed = window.confirm(
      "Are you sure you want to end this event? This action cannot be undone."
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/events/${event.id}/end`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to end event."
        );
      }

      const data: EventDetails =
        await response.json();

      saveEvent(data);
      setMessage("Event ended successfully.");

      await loadMyEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to end event."
      );
    } finally {
      setBusy(false);
    }
  }

  // -------------------------------------
  // Create poll
  // -------------------------------------

  async function createPoll(
    e: FormEvent<HTMLFormElement>
  ) {
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
      setError(
        "Enter a question and 2–10 answer options."
      );
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/polls",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: event.id,
            question: question.trim(),
            options: cleanOptions,
          }),
        }
      );

      if (!response.ok) {
        throw await readError(
          response,
          "Unable to create poll."
        );
      }

      const data: Poll = await response.json();

      setPolls((previous) => [
        data,
        ...previous.filter(
          (poll) => poll.id !== data.id
        ),
      ]);

      setQuestion("");
      setOptions(["", ""]);

      setMessage(
        "Poll created! You can start it when ready."
      );

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

  // -------------------------------------
  // Start / Close poll
  // -------------------------------------

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
        { method: "POST" }
      );

      if (!response.ok) {
        throw await readError(
          response,
          `Unable to ${action} poll.`
        );
      }

      const data: Poll = await response.json();

      setPolls((previous) =>
        previous.map((poll) =>
          poll.id === pollId ? data : poll
        )
      );

      setMessage(
        action === "start"
          ? "Poll is LIVE! Participants can vote."
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

  // -------------------------------------
  // Poll option management
  // -------------------------------------

  function updateOption(
    index: number,
    value: string
  ) {
    setOptions((previous) =>
      previous.map((option, i) =>
        i === index ? value : option
      )
    );
  }

  function addOption() {
    if (options.length >= 10) return;

    setOptions((previous) => [
      ...previous,
      "",
    ]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;

    setOptions((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  // -------------------------------------
  // Statistics
  // -------------------------------------

  const activePolls = polls.filter(
    (poll) => poll.status === "LIVE"
  ).length;

  const joinUrl = event
    ? `${window.location.origin}/join/${encodeURIComponent(event.joinCode)}`
    : "";

  const totalVotes = Object.values(results).reduce(
    (sum, result) => sum + result.totalVotes,
    0
  );

  // -------------------------------------
  // JSX
  // -------------------------------------

  return (
    <div className="min-h-screen bg-[#090B16] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            to="/"
            className="text-2xl font-bold"
          >
            ripple
            <span className="text-violet-400">.</span>
          </Link>

          <span className="rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-300">
            Presenter Workspace
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Feedback */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-300"
          >
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {/* No event selected */}
        {!event ? (
          <div className="space-y-10">
            <section className="mx-auto max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-violet-400">
                Welcome, Presenter
              </p>

              <h1 className="mb-4 text-4xl font-bold">
                Create your next event.
              </h1>

              <p className="mb-8 text-slate-400">
                Bring your audience together with
                interactive polls.
              </p>

              <form
                onSubmit={createEvent}
                className="space-y-6 rounded-3xl border border-white/10 bg-[#15182A] p-8"
              >
                <div>
                  <label
                    htmlFor="event-title"
                    className="mb-2 block text-sm"
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
                    placeholder="e.g. Ripple Tech Conference"
                    className="w-full rounded-xl border border-white/10 bg-[#0D1020] p-4 outline-none focus:border-violet-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="event-description"
                    className="mb-2 block text-sm"
                  >
                    Description
                  </label>

                  <textarea
                    id="event-description"
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    rows={4}
                    placeholder="What is your event about?"
                    className="w-full rounded-xl border border-white/10 bg-[#0D1020] p-4 outline-none focus:border-violet-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:opacity-50"
                >
                  <CalendarPlus size={18} />
                  {busy
                    ? "Creating..."
                    : "Create Event"}
                </button>
              </form>
            </section>

            {/* Previous Events */}
            <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-[#15182A] p-7">
              <h2 className="mb-5 text-2xl font-semibold">
                My Events
              </h2>

              {eventsError && (
                <p role="alert" className="mb-3 text-sm text-red-300">
                  {eventsError}
                </p>
              )}
              {myEvents.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No events found for this browser's demo organizer ID.
                  Older Swagger events may have a different organizer ID.
                </p>
              ) : (
                <div className="space-y-3">
                  {myEvents.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        selectEvent(item)
                      }
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0D1020] p-4 text-left hover:border-violet-400"
                    >
                      <div>
                        <p className="font-semibold">
                          {item.title}
                        </p>

                        <p className="mt-1 font-mono text-sm text-slate-400">
                          {item.joinCode}
                        </p>
                      </div>

                      <span className="text-xs text-violet-300">
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={openEventByCode} className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-6">
                <input
                  aria-label="Find existing event by join code"
                  value={lookupCode}
                  onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="Existing event code"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0D1020] px-4 py-3 uppercase outline-none focus:border-violet-400"
                />
                <button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 font-semibold hover:bg-violet-500">
                  Find Event
                </button>
              </form>
              <p className="mt-3 text-xs text-slate-500">Demo recovery only: the join code does not verify organizer ownership.</p>
            </section>
          </div>
        ) : (
          <>
            {/* Event Heading */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-sm text-violet-400">
                  EVENT DASHBOARD
                </p>

                <h1 className="text-3xl font-bold">
                  {event.title}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-violet-500/15 px-4 py-2 text-sm text-violet-300">
                  {event.status}
                </span>

                <button
                  type="button"
                  onClick={manualRefresh}
                  disabled={refreshing}
                  title="Refresh dashboard"
                  className="rounded-xl border border-white/10 p-3 hover:bg-white/10 disabled:opacity-50"
                >
                  <RefreshCw
                    size={18}
                    className={
                      refreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="mb-8 grid gap-5 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#15182A] p-6">
                <p className="mb-2 text-sm text-slate-400">
                  Total Polls
                </p>
                <p className="text-3xl font-bold">
                  {polls.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#15182A] p-6">
                <p className="mb-2 text-sm text-slate-400">
                  Active Polls
                </p>
                <p className="text-3xl font-bold">
                  {activePolls}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#15182A] p-6">
                <p className="mb-2 text-sm text-slate-400">
                  Total Votes
                </p>
                <p className="text-3xl font-bold">
                  {totalVotes}
                </p>
              </div>
            </div>

            {/* Event Controls */}
            <section className="mb-8 rounded-3xl border border-violet-500/20 bg-[#15182A] p-7">
              <p className="mb-3 text-sm text-slate-400">
                SHARE YOUR EVENT CODE
              </p>

              <div className="flex flex-wrap items-center justify-between gap-5">
                <p className="font-mono text-3xl font-bold tracking-widest">
                  {event.joinCode}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      event.joinCode
                    )
                  }
                  className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 hover:bg-white/15"
                >
                  <Copy size={17} />
                  Copy Code
                </button>
              </div>

              {/* Audience sharing — works on this browser's accessible origin. */}
              <div className="mt-6 grid gap-5 rounded-2xl border border-white/10 bg-[#0D1020] p-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="w-fit rounded-xl bg-white p-3">
                  <QRCodeSVG
                    value={joinUrl}
                    size={148}
                    marginSize={1}
                    title={`Join ${event.title}`}
                  />
                </div>
                <div className="min-w-0 space-y-3">
                  <p className="font-semibold">Invite your audience</p>
                  <p className="text-sm text-slate-400">
                    Scan this QR code or share the link to open the event's join page.
                  </p>
                  <p className="break-all rounded-lg bg-white/5 p-3 text-xs text-violet-300">
                    {joinUrl}
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(joinUrl);
                        setMessage("Join link copied!");
                      } catch {
                        setError("Could not copy the join link.");
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold hover:bg-violet-500"
                  >
                    <Copy size={16} /> Copy Join Link
                  </button>
                </div>
              </div>

              {event.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={startEvent}
                  disabled={busy}
                  className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Play size={17} />
                  Start Event
                </button>
              )}

              {event.status === "LIVE" && (
                <div className="mt-6 space-y-5">
                  <p className="flex items-center gap-2 text-sm text-emerald-400">
                    <Radio size={17} />
                    Your event is accepting participants.
                  </p>

                  <button
                    type="button"
                    onClick={endEvent}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-xl border border-red-500/40 px-5 py-3 font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Square size={16} />
                    End Event
                  </button>
                </div>
              )}

              {event.status === "ENDED" && (
                <p className="mt-6 text-sm text-slate-400">
                  This event has ended. You can still
                  review its saved polls and results.
                </p>
              )}
            </section>

            {/* Create Poll */}
            {event.status !== "ENDED" && (
              <section className="mb-8 rounded-3xl border border-white/10 bg-[#15182A] p-7">
                <div className="mb-6 flex items-center gap-3">
                  <Plus className="text-violet-400" />

                  <h2 className="text-2xl font-semibold">
                    Create a Poll
                  </h2>
                </div>

                <form onSubmit={createPoll}>
                  <label
                    htmlFor="poll-question"
                    className="mb-2 block text-sm text-slate-300"
                  >
                    Poll question
                  </label>

                  <input
                    id="poll-question"
                    value={question}
                    onChange={(e) =>
                      setQuestion(e.target.value)
                    }
                    required
                    placeholder="What would you like to ask?"
                    className="mb-6 w-full rounded-xl border border-white/10 bg-[#0D1020] p-4 outline-none focus:border-violet-400"
                  />

                  <p className="mb-3 text-sm text-slate-300">
                    Answer options
                  </p>

                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div
                        key={index}
                        className="flex gap-3"
                      >
                        <input
                          aria-label={`Answer option ${
                            index + 1
                          }`}
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              index,
                              e.target.value
                            )
                          }
                          required
                          placeholder={`Option ${
                            index + 1
                          }`}
                          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0D1020] p-4 outline-none focus:border-violet-400"
                        />

                        {options.length > 2 && (
                          <button
                            type="button"
                            aria-label={`Remove option ${
                              index + 1
                            }`}
                            onClick={() =>
                              removeOption(index)
                            }
                            className="rounded-xl border border-white/10 px-4 text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {options.length < 10 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="mt-4 flex items-center gap-2 text-sm text-violet-400"
                    >
                      <Plus size={17} />
                      Add Option
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="mt-7 w-full rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:opacity-50"
                  >
                    {busy
                      ? "Creating..."
                      : "Create Poll"}
                  </button>
                </form>
              </section>
            )}

            {/* Poll History */}
            <section>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">
                  Manage Polls
                </h2>

                <span className="text-sm text-slate-400">
                  Auto-refreshes every 5 seconds
                </span>
              </div>

              {polls.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#15182A] p-12 text-center">
                  <Radio
                    size={38}
                    className="mx-auto mb-4 text-violet-400"
                  />

                  <p className="text-lg font-semibold">
                    No polls yet
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Create a poll above to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {polls.map((poll) => {
                    const pollResults =
                      results[poll.id];

                    return (
                      <article
                        key={poll.id}
                        className="rounded-3xl border border-white/10 bg-[#15182A] p-7"
                      >
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-xs text-violet-400">
                            POLL #{poll.id}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              poll.status === "LIVE"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : poll.status === "CLOSED"
                                ? "bg-slate-500/15 text-slate-300"
                                : "bg-violet-500/15 text-violet-300"
                            }`}
                          >
                            {poll.status}
                          </span>
                        </div>

                        <h3 className="mb-5 text-xl font-semibold">
                          {poll.question}
                        </h3>

                        {/* Start Poll */}
                        {poll.status === "DRAFT" &&
                          event.status === "LIVE" && (
                            <button
                              type="button"
                              onClick={() =>
                                updatePollStatus(
                                  poll.id,
                                  "start"
                                )
                              }
                              disabled={
                                busyPoll !== null
                              }
                              className="mb-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold hover:bg-emerald-500 disabled:opacity-50"
                            >
                              <Play size={16} />
                              Start Poll
                            </button>
                          )}

                        {/* Close Poll */}
                        {poll.status === "LIVE" &&
                          event.status === "LIVE" && (
                            <button
                              type="button"
                              onClick={() =>
                                updatePollStatus(
                                  poll.id,
                                  "close"
                                )
                              }
                              disabled={
                                busyPoll !== null
                              }
                              className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/30 px-5 py-3 font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Square size={16} />
                              Close Poll
                            </button>
                          )}

                        {/* Poll Results */}
                        {pollResults &&
                        pollResults.options.length > 0 ? (
                          <div className="space-y-4">
                            {pollResults.options.map(
                              (result) => (
                                <div
                                  key={result.optionId}
                                >
                                  <div className="mb-2 flex justify-between gap-3 text-sm">
                                    <span>
                                      {result.optionText}
                                    </span>

                                    <span className="text-slate-400">
                                      {result.votes} votes ·{" "}
                                      {result.percentage}%
                                    </span>
                                  </div>

                                  <div className="h-3 overflow-hidden rounded-full bg-white/10">
                                    <div
                                      className="h-full rounded-full bg-violet-500 transition-all"
                                      style={{
                                        width: `${
                                          result.percentage
                                        }%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            )}

                            <p className="pt-2 text-sm text-slate-400">
                              {pollResults.totalVotes} total votes
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {poll.options.map(
                              (option) => (
                                <p
                                  key={option.id}
                                  className="rounded-lg bg-white/5 px-4 py-3 text-sm text-slate-300"
                                >
                                  {option.text}
                                </p>
                              )
                            )}

                            <p className="pt-3 text-sm text-slate-400">
                              {poll.status === "DRAFT"
                                ? "Start this poll to collect votes."
                                : "Waiting for results..."}
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Navigation */}
            <button
              type="button"
              onClick={clearSelectedEvent}
              className="mt-10 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft size={17} />
              Back to My Events
            </button>
          </>
        )}
      </main>
    </div>
  );
}
