// How the storefront's forms turn a failure into a sentence a customer can read.
//
// Neither the server's `error` string nor a Zod message can be shown as it is:
// both are English, and both also serve the API, so their wording belongs to the
// API. All a form needs from them is *which* failure it was — a name it can look
// up in the reader's language. These two functions are that lookup.

/** The failures a storefront route reports by status. Anything else is "failed". */
export type RequestFailure = "unauthorized" | "conflict" | "rateLimited" | "failed";

type NamedFailure = Exclude<RequestFailure, "failed">;

const FAILURE_BY_STATUS: Partial<Record<number, NamedFailure>> = {
  401: "unauthorized",
  409: "conflict",
  429: "rateLimited",
};

/**
 * Names a failed request, choosing only among the reasons this form has words
 * for. A status outside `handled` — and no response at all — is "failed": a form
 * has no message for a reason its route never gives, and must never tell someone
 * their email is taken about a request that simply didn't arrive.
 */
export function requestFailure<R extends NamedFailure>(
  status: number | undefined,
  handled: readonly R[],
): R | "failed" {
  const reason = status === undefined ? undefined : FAILURE_BY_STATUS[status];
  return handled.find((candidate) => candidate === reason) ?? "failed";
}

export type FieldErrorKey = "required" | "tooLong" | "email";

/**
 * The message for one field's validation error, from the Zod issue code that
 * @hookform/resolvers puts in `type`. The storefront's form schemas only fail
 * three ways — empty, too long, or a malformed email — so those are the three
 * messages. A field with a rule of its own (the signup password's minimum)
 * states that rule itself rather than going through here.
 */
export function fieldErrorKey(type: string): FieldErrorKey {
  if (type === "too_big") return "tooLong";
  if (type === "invalid_format") return "email";
  return "required";
}
