export function translateError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // Anchor's own built-in framework errors carry technically-accurate but
  // genuinely unhelpful text for a real customer — checked first, before
  // any generic extraction, and confirmed against a real error today:
  // AccountNotInitialized's own message ("The program expected this
  // account to be already initialized") means nothing to someone who just
  // scanned an already-used code.
  if (raw.includes("AccountNotInitialized")) {
    return "This code has already been used, or was never valid.";
  }
  if (raw.includes("AccountNotSigner") || raw.includes("AccountNotEnoughKeys")) {
    return "Something went wrong on our end — please try again in a moment.";
  }
  if (raw.includes("ConstraintSeeds") || raw.includes("ConstraintHasOne")) {
    return "This doesn't look right — please check and try again.";
  }

  // Below this point: either one of our own custom Rust errors, which
  // already carry a genuinely well-written sentence (see error.rs), or a
  // lower-level network/relayer problem.
  const anchorMatch = raw.match(/Error Message: ([^.]+\.)/);
  if (anchorMatch) {
    return anchorMatch[1];
  }

    if (raw.includes("no record of a prior credit")) {
    return "⚠ Our payment service is temporarily unavailable. This isn't something you did — please try again in a few minutes, or let the business know directly.";
  }

  if (raw.includes("Failed to fetch") || raw.includes("NetworkError")) {
    return "Couldn't reach the network — check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}