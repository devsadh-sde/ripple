
import {
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  MailCheck,
  RefreshCw,
} from "lucide-react";

type VerificationState = {
  email?: string;
  emailSent?: boolean;
};

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  if (response.status === 429) {
    return "Too many requests. Please wait before trying again.";
  }

  try {
    const data = await response.json();

    if (
      typeof data.message === "string" &&
      data.message.length > 0
    ) {
      return data.message;
    }

    if (
      typeof data.detail === "string" &&
      data.detail.length > 0
    ) {
      return data.detail;
    }
  } catch {
    // Use fallback.
  }

  return fallback;
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationState =
    (location.state as VerificationState | null) ?? {};

  const [email, setEmail] = useState(
    navigationState.email ||
      sessionStorage.getItem(
        "ripple:pending-verification-email"
      ) ||
      ""
  );

  const [digits, setDigits] = useState<string[]>(
    Array(6).fill("")
  );

  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  const [message, setMessage] = useState(
    navigationState.emailSent
      ? "We sent a verification code to your email."
      : "Enter your email to request a verification code."
  );

  const code = digits.join("");

  function updateDigit(index: number, value: string) {
    const numbers = value.replace(/\D/g, "");

    if (numbers.length > 1) {
      const updated = [...digits];

      numbers
        .slice(0, 6 - index)
        .split("")
        .forEach((digit, offset) => {
          updated[index + offset] = digit;
        });

      setDigits(updated);

      const target = Math.min(
        index + numbers.length,
        5
      );

      inputs.current[target]?.focus();
      return;
    }

    const updated = [...digits];
    updated[index] = numbers.slice(-1);
    setDigits(updated);

    if (numbers && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputs.current[index - 1]?.focus();
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputs.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      inputs.current[index + 1]?.focus();
    }
  }

  function handlePaste(
    event: ClipboardEvent<HTMLInputElement>
  ) {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) return;

    event.preventDefault();

    const updated = Array(6).fill("");

    pasted.split("").forEach((digit, index) => {
      updated[index] = digit;
    });

    setDigits(updated);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function verifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the complete six-digit code.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/verify-email",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            code,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Invalid or expired code. Please try again."
          )
        );
      }

      sessionStorage.removeItem(
        "ripple:pending-verification-email"
      );

      navigate("/login", {
        replace: true,
        state: {
          verified: true,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify email."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/auth/send-verification",
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Unable to send a new code."
          )
        );
      }

      sessionStorage.setItem(
        "ripple:pending-verification-email",
        normalizedEmail
      );

      setDigits(Array(6).fill(""));
      setMessage("A new verification code has been sent.");
      inputs.current[0]?.focus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resend the code."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#090B16] px-5 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between py-7">
        <Link
          to="/"
          className="cursor-pointer text-2xl font-bold"
        >
          ripple<span className="text-violet-400">.</span>
        </Link>

        <Link
          to="/login"
          className="cursor-pointer text-sm text-violet-300 hover:text-violet-200"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto flex max-w-md flex-col justify-center py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15">
            <MailCheck
              size={28}
              className="text-violet-300"
            />
          </div>

          <h1 className="text-4xl font-bold">
            Verify your email.
          </h1>

          <p className="mt-3 text-slate-400">
            Enter the six-digit code sent to your email.
          </p>
        </div>

        <form
          onSubmit={verifyCode}
          className="space-y-6 rounded-3xl border border-white/10 bg-[#15182A] p-8"
        >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300"
            >
              <CheckCircle2
                size={18}
                className="shrink-0"
              />
              {message}
            </div>
          )}

          <div>
            <label
              htmlFor="verify-email-address"
              className="mb-2 block text-sm text-slate-300"
            >
              Email address
            </label>

            <input
              id="verify-email-address"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setDigits(Array(6).fill(""));
              }}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-[#0D1020] p-4 text-white outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label
              htmlFor="otp-digit-0"
              className="mb-3 block text-sm text-slate-300"
            >
              Verification code
            </label>

            <div className="grid grid-cols-6 gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-digit-${index}`}
                  ref={(element) => {
                    inputs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete={
                    index === 0 ? "one-time-code" : "off"
                  }
                  maxLength={6}
                  value={digit}
                  onChange={(event) =>
                    updateDigit(index, event.target.value)
                  }
                  onKeyDown={(event) =>
                    handleKeyDown(index, event)
                  }
                  onPaste={handlePaste}
                  aria-label={`Code digit ${index + 1}`}
                  className="h-14 w-full min-w-0 rounded-xl border border-white/10 bg-[#0D1020] text-center text-xl font-semibold text-white outline-none focus:border-violet-400"
                />
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-400">
              The code expires after 10 minutes.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 py-4 font-semibold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
              />
            ) : (
              <ArrowRight size={18} />
            )}

            {loading ? "Verifying..." : "Verify Email"}
          </button>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              Didn't receive the code?
            </p>

            <button
              type="button"
              onClick={() => void resendCode()}
              disabled={resending}
              className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  resending ? "animate-spin" : ""
                }
              />
              {resending ? "Sending..." : "Resend Code"}
            </button>

            <p className="mt-2 text-xs text-slate-500">
              Resend requests are limited to once per minute.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
