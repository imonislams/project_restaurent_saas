import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

/**
 * Public websocket values shared by the server (never the secret).
 */
export interface RealtimeConfig {
    driver: 'off' | 'reverb' | 'pusher';
    key?: string;
    cluster?: string;
    host?: string;
    port?: number;
    scheme?: string;
}

type EchoInstance = InstanceType<typeof Echo>;

declare global {
    interface Window {
        Echo?: EchoInstance;
        Pusher?: typeof Pusher;
    }
}

/**
 * Boots the websocket client from the server-provided config. Reverb speaks the
 * Pusher protocol, so one client (laravel-echo + pusher-js) serves either driver.
 * Nothing is created when real-time is off — every page keeps its slow refresh.
 */
export function initEcho(config?: RealtimeConfig): EchoInstance | undefined {
    if (typeof window === 'undefined' || !config || config.driver === 'off' || !config.key) {
        return undefined;
    }

    if (window.Echo) {
        return window.Echo;
    }

    window.Pusher = Pusher;

    const secure = (config.scheme ?? 'https') === 'https';

    // Reverb needs an explicit host/port; Pusher resolves its own cluster host.
    const options: Record<string, unknown> = config.driver === 'reverb'
        ? {
              broadcaster: 'pusher',
              key: config.key,
              wsHost: config.host || window.location.hostname,
              wsPort: Number(config.port ?? (secure ? 443 : 80)),
              wssPort: Number(config.port ?? 443),
              forceTLS: secure,
              enabledTransports: ['ws', 'wss'],
              disableStats: true,
          }
        : {
              broadcaster: 'pusher',
              key: config.key,
              cluster: config.cluster || 'mt1',
              forceTLS: true,
              disableStats: true,
          };

    window.Echo = new Echo(options as never);

    return window.Echo;
}
