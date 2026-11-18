/**
 * Shared types for the per-domain tool modules under src/server/tools/.
 *
 * Part of the file-split work tracked in #104. Each domain file exports a
 * `tools` array of MCP tool definitions and an `execute(name, args, ctx)`
 * dispatcher. The server keeps the MCP protocol layer thin and delegates
 * to these modules.
 */
import { AiAuthError, AiRateLimitError } from '../../services/ai/AiTransport.js';
import { BusinessError, TransientError, ValidationError } from '../../utils/CategorisedError.js';
/** Type guard for tools and dispatchers. */
export function isEnvelope(v) {
    return (typeof v === 'object' &&
        v !== null &&
        'ok' in v &&
        typeof v.ok === 'boolean');
}
/** Construct a success envelope. */
export function ok(data) {
    return { ok: true, data };
}
/**
 * Construct a success envelope that represents a valid-empty result —
 * the call worked but produced nothing (no patterns found, empty
 * history, etc.). Distinct from `err` so agents can choose between
 * "report nothing" and "retry/setup".
 */
export function empty(data) {
    return { ok: true, data, empty: true };
}
/** Construct an error envelope. */
export function err(category, message, opts) {
    return {
        ok: false,
        errorCategory: category,
        // Default retryability follows category: transient retries, others don't.
        isRetryable: opts?.isRetryable ?? category === 'transient',
        message,
        ...(opts?.partialResult !== undefined ? { partialResult: opts.partialResult } : {}),
    };
}
/**
 * Best-effort error categorization for raw thrown errors. Used by the
 * dispatcher when a tool throws without wrapping. Tools that know better
 * should construct `err(category, message)` directly.
 */
/**
 * Whether a tool returned a self-declared failure.
 *
 * Several modules report problems as `{ success: false, message }`
 * rather than throwing or building an envelope. Wrapped with `ok()`
 * those reach MCP clients as successes, with the real outcome hidden in
 * a field the envelope contract says nothing about (#274).
 *
 * @param value - A tool's raw return value
 * @returns True when it declares failure
 */
export function isFailureShaped(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const record = value;
    // An explicit success:false is unambiguous.
    if ('success' in record && record.success === false)
        return true;
    // A bare `{ error: '...' }` with no success flag is equally a failure,
    // and several modules return exactly that — ai.ts and analysis.ts both
    // do. Requiring a `success` key let those through as ok:true, which is
    // the same bug one shape over (#274).
    //
    // Guarded by `success !== true` so a result that genuinely succeeded
    // while carrying a non-fatal `error` field is left alone.
    return (record.success !== true &&
        typeof record.error === 'string' &&
        record.error.length > 0);
}
/**
 * Prefix of the message `writePatternSafe` returns when it did *not*
 * write — no browser session is up, so the pattern is stashed for the
 * next init instead.
 *
 * Exported so `server.ts` builds the message from it and the helpers
 * below test for it. One constant, so the producer and the consumers
 * cannot drift apart.
 */
export const PATTERN_STASHED_PREFIX = 'Pattern generated (initialize Strudel to use it):';
/** Whether a `writePatternSafe` result means "stashed, not written". */
export function wasStashed(writeResult) {
    return typeof writeResult === 'string' && writeResult.startsWith(PATTERN_STASHED_PREFIX);
}
/**
 * Appends the "not in the editor yet" caveat to a tool's success
 * message when the write was only a stash.
 *
 * Nineteen call sites across five modules used to `await
 * ctx.writePatternSafe(...)` and throw the result away, then return
 * their own message. Two modules could actually reach the stash path:
 * `generate.ts` (all seven `generate_part` / `music_theory` /
 * `generate_rhythm` tools) and `storage.ts` (`action=load`). Neither
 * gates on `isInitialized`, so both reported the pattern as applied
 * while it sat in `pendingPattern` waiting for an init the caller had
 * no reason to run (#285).
 *
 * `transform.ts`, `editor.ts` and `ai.ts` refuse outright when the
 * default session is down, so they never mis-reported. They thread the
 * result anyway, so the rule holds uniformly and a relaxed gate cannot
 * silently reintroduce the bug.
 *
 * @param message - What the tool would say on a normal write
 * @param writeResult - Exactly what `writePatternSafe` returned
 * @returns The message, with the caveat appended if it applies
 */
export function withStashNotice(message, writeResult) {
    if (!wasStashed(writeResult))
        return message;
    // Trim a trailing period first: appending an em dash straight after
    // one produced "…boom_bap. — but it is not in the editor yet" (#297).
    return `${message.replace(/\.\s*$/, '')}${STASH_SUFFIX}`;
}
/** The caveat, as a suffix for prose results. */
const STASH_SUFFIX = ' — but it is not in the editor yet: no browser session is ' +
    'running. Run `init` to open one and load it.';
/** The same caveat as a standalone sentence, for structured results. */
export const STASH_WARNING = 'The pattern is not in the editor yet: no browser ' +
    'session is running. Run `init` to open one and load it.';
/**
 * Structured-result counterpart to `withStashNotice`: adds a `warning`
 * field when the write was only a stash, and leaves the result
 * untouched otherwise.
 *
 * @param result - What the tool would return on a normal write
 * @param writeResult - Exactly what `writePatternSafe` returned
 */
export function withStashField(result, writeResult) {
    if (!wasStashed(writeResult))
        return result;
    // Spreading an array produces {"0":"a","1":"b"} — a silent shape
    // change the `T & {...}` signature promised not to make. The type
    // now excludes arrays; this is the runtime half of the same
    // guarantee (#297).
    if (Array.isArray(result)) {
        throw new TypeError('withStashField expects an object result, not an array. ' +
            'Spreading an array would change its shape.');
    }
    // Append rather than overwrite: a result that already carries a
    // warning has something to say, and the stash notice is additional
    // information, not a replacement for it.
    const existing = result.warning;
    const warning = typeof existing === 'string' && existing.length > 0
        ? `${existing} ${STASH_WARNING}`
        : STASH_WARNING;
    return { ...result, warning };
}
export function categorizeError(error) {
    // A typed error first, so the categorisation does not depend on
    // wording. The rate limiter used to throw a plain Error whose message
    // happened to start "Rate limit exceeded", and everything downstream —
    // three re-throw sites and the string match below — recognised it by
    // that phrase. Rewording it would have quietly turned the single most
    // retryable failure there is into `internal`, which is not retryable
    // (#380).
    if (error instanceof AiRateLimitError)
        return 'transient';
    // Same reasoning as the rate limit: the class exists, it is thrown,
    // and recognising it by type means the categorisation does not depend
    // on the message still saying "not authenticated".
    if (error instanceof AiAuthError)
        return 'permission';
    // A thrower that knows what kind of failure it has beats a phrase
    // match every time. "Steps cannot exceed 256" contains none of the
    // words below, and fell through to `internal` — not retryable, and
    // reading to an agent as "the server is broken" when the fix is to
    // change an argument (#382).
    if (error instanceof ValidationError)
        return 'validation';
    if (error instanceof BusinessError)
        return 'business';
    if (error instanceof TransientError)
        return 'transient';
    const message = error instanceof Error ? error.message : String(error);
    const lower = message.toLowerCase();
    // Transient first. It used to be checked last, behind `validation`,
    // which meant a timeout mentioning an invalid state was filed as a
    // caller mistake — and everything not matched fell through to
    // `internal`, whose isRetryable is false.
    //
    // 'timed out' is the important entry: the codebase says that 13 times
    // and 'timeout' twice, and 'timed out'.includes('timeout') is false. So
    // essentially every real timeout was reported to agents as a permanent
    // internal failure not worth retrying. Rate limits had the same
    // problem across 14 throw sites, and a rate limit is the single most
    // retryable error there is.
    if (lower.includes('timed out') ||
        lower.includes('timeout') ||
        lower.includes('rate limit') ||
        lower.includes('econnrefused') ||
        lower.includes('econnreset') ||
        lower.includes('etimedout') ||
        lower.includes('network') ||
        lower.includes('fetch failed') ||
        lower.includes('did not become ready') ||
        // Chromium spells its network errors net::ERR_*, which shares no
        // substring with the POSIX names above — 'ERR_CONNECTION_REFUSED'
        // does not contain 'econnrefused', and 'ERR_TIMED_OUT' does not
        // contain 'timed out' (the underscore). So every navigation failure
        // Playwright surfaced was landing in `internal`: a server bug the
        // caller could do nothing about, when a refused connection is the
        // most retryable error there is (#315).
        lower.includes('net::err_')) {
        return 'transient';
    }
    // Auth before business: a CLI that is installed but not logged in is a
    // credential problem, and saying 'not found' about a login is not the
    // same as saying it about a session.
    //
    // `gemini` used to be in this list, which made EVERY error mentioning
    // the vendor a credentials problem — "Audio analysis failed: gemini
    // returned 500" included. A vendor name is not an error condition.
    // Auth failures from that path throw `AiAuthError`, which is matched
    // by type above, or say "api key"/"not authenticated" in the message.
    // Found because a test of mine passed with its fix removed: the
    // fixture said "gemini rejected the request" (#382).
    if (lower.includes('api key') ||
        lower.includes('unauthorized') ||
        lower.includes('unauthenticated') ||
        lower.includes('not authenticated') ||
        // 'authenticate' bare, as well as 'not authenticated': the
        // no-transport message says "Install and authenticate one of".
        // That is an auth word doing auth work, unlike the vendor name
        // removed above.
        lower.includes('authenticate') ||
        lower.includes('forbidden') ||
        lower.includes('permission denied') ||
        lower.includes('credential')) {
        return 'permission';
    }
    if (lower.includes('not initialized') ||
        lower.includes("run 'init' first") ||
        lower.includes('run init first') ||
        lower.includes('not found') ||
        lower.includes('not installed') ||
        lower.includes('no ai transport') ||
        lower.includes('already exists') ||
        lower.includes('already in progress') ||
        lower.includes('not connected') ||
        lower.includes('did not start') ||
        lower.includes('no pattern')) {
        return 'business';
    }
    if (lower.includes('invalid') ||
        lower.includes('must be') ||
        lower.includes('required') ||
        lower.includes('out of range') ||
        lower.includes('too many') ||
        lower.includes('too long') ||
        lower.includes('non-empty') ||
        lower.includes('cannot be empty') ||
        // The MIDI parse message reached `validation` only because it
        // happens to contain 'Invalid'. Reword it without that adjective
        // and it silently became a non-retryable server fault again — the
        // two halves of #280 were coupled by nothing but vocabulary (#297).
        lower.includes('could not be parsed') ||
        lower.includes('parse error') ||
        lower.includes('failed to parse') ||
        lower.includes('malformed') ||
        lower.includes('corrupt')) {
        return 'validation';
    }
    return 'internal';
}
