/**
 * Real-time helpers.
 *
 * The websocket client is optional: when real-time is off (or the browser has no
 * socket support) every helper here is a no-op and the pages keep their slow
 * fallback refresh.
 */

type Payload = Record<string, any>;

/**
 * Subscribe to one event on a private channel.
 * Returns an unsubscribe function; safe to call when the client is not booted.
 */
export function onPrivate<T = Payload>(channel: string, event: string, handler: (payload: T) => void): () => void {
    const echo = typeof window !== 'undefined' ? window.Echo : undefined;

    if (!echo) {
        return () => {};
    }

    const name = event.startsWith('.') ? event : `.${event}`;
    const listener = echo.private(channel);
    const callback = handler as (payload: Payload) => void;

    listener.listen(name, callback);

    return () => {
        listener.stopListening(name, callback);
    };
}

/** Subscribe to one event on a public channel (e.g. the diner's QR page). */
export function onPublic<T = Payload>(channel: string, event: string, handler: (payload: T) => void): () => void {
    const echo = typeof window !== 'undefined' ? window.Echo : undefined;

    if (!echo) {
        return () => {};
    }

    const name = event.startsWith('.') ? event : `.${event}`;
    const listener = echo.channel(channel);
    const callback = handler as (payload: Payload) => void;

    listener.listen(name, callback);

    return () => {
        listener.stopListening(name, callback);
    };
}

/** Whether a websocket client is active (the driver is configured and booted). */
export function realtimeConnected(): boolean {
    return typeof window !== 'undefined' && Boolean(window.Echo);
}
