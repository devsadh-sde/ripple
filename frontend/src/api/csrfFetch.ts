
type CsrfResponse = {
  token: string;
};

export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const tokenResponse = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    throw new Error(
      tokenResponse.status === 401
        ? "Your session has expired. Please sign in again."
        : "Unable to retrieve security token."
    );
  }

  const { token } = (await tokenResponse.json()) as CsrfResponse;

  const headers = new Headers(options.headers);
  headers.set("X-CSRF-Token", token);

  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
}
