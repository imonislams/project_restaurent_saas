import IntegrationCard, { ProviderRow } from '@/Components/Growth/IntegrationCard';
import { Alert, Card, CardBody, CardHeader, Tabs } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Summary {
    any_connected: boolean;
    connected: string[];
    configured: string[];
    not_configured: string[];
    drivers_installed: string[];
}

const GROUP_LABEL: Record<string, string> = {
    tracking: 'Tracking & pixels',
    analytics: 'Analytics',
    email: 'Email',
    other: 'Other',
};

export default function Integrations({
    providers,
    summary,
    grouped,
    redirectUri,
}: {
    providers: ProviderRow[];
    summary: Summary;
    grouped: Record<string, string[]>;
    redirectUri: string;
}) {
    const can = ((usePage().props as { auth?: { platform_permissions?: string[] } }).auth?.platform_permissions ?? []).includes(
        'platform.marketing.integrations.manage',
    );

    const [tab, setTab] = useState('providers');
    const [busy, setBusy] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);

    const byProvider = Object.fromEntries(providers.map((row) => [row.provider, row]));

    // "Still to configure" means it actually needs credentials it does not have —
    // platform_mail needs none, and a configured-but-unverified provider belongs in
    // its own group rather than being counted as missing.
    const needsCredentials = providers.filter(
        (row) => !row.is_configured && row.credentials.some((field) => field.required),
    );
    const configuredNotVerified = providers.filter(
        (row) => row.is_configured && row.status !== 'connected',
    );

    const credentialsTab = (
        <Card>
            <CardHeader
                title="Stored credentials"
                description="Which keys are stored for each provider. Values are encrypted at rest and are never sent to the browser — not even masked."
                action={
                    <button
                        type="button"
                        onClick={() => setRevealed((previous) => !previous)}
                        aria-expanded={revealed}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {revealed ? 'Hide key names' : 'Show key names'}
                    </button>
                }
            />
            <CardBody className="p-0">
                {revealed ? (
                    <ul className="divide-y divide-border">
                        {providers.map((row) => (
                            <li key={row.provider} className="px-4 py-3">
                                <p className="text-sm font-semibold text-foreground">{row.label}</p>
                                {row.credentials.length === 0 ? (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        No credentials of its own — it uses the platform mail provider.
                                    </p>
                                ) : (
                                    <ul className="mt-1 flex flex-wrap gap-2">
                                        {row.credentials.map((field) => (
                                            <li
                                                key={field.key}
                                                className="rounded border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                                            >
                                                {field.key}
                                                <span className="ml-1.5 text-foreground">{field.is_set ? 'set' : 'empty'}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="px-4 py-6 text-xs text-muted-foreground">
                        Key names are hidden by default. A credential value is never displayed, whatever you choose here.
                    </p>
                )}
            </CardBody>
        </Card>
    );

    return (
        <PlatformLayout
            title="Marketing integrations"
            description="Connect the platforms this workspace measures with. A connection is only reported as working once a test or a sync has proven it."
        >
            <Head title="Marketing integrations" />

            <Alert
                variant={summary.any_connected ? 'success' : 'info'}
                title={summary.any_connected ? 'Verified connections' : 'No provider is verified yet'}
            >
                {summary.any_connected ? (
                    <p>{summary.connected.length} provider(s) verified and sending: {summary.connected.join(', ')}.</p>
                ) : (
                    <ul className="space-y-1">
                        {needsCredentials.length > 0 && (
                            <li>
                                <strong>{needsCredentials.length}</strong> of {providers.length} still need credentials:{' '}
                                {needsCredentials.map((row) => row.label).join(', ')}.
                            </li>
                        )}
                        {configuredNotVerified.length > 0 && (
                            <li>
                                <strong>{configuredNotVerified.length}</strong> configured but not yet proven — run{' '}
                                <em>Test connection</em> on: {configuredNotVerified.map((row) => row.label).join(', ')}.
                            </li>
                        )}
                        <li>
                            A provider is only used once it has passed a connection test. Marketing email, campaigns,
                            leads and SEO do not depend on any of these.
                        </li>
                    </ul>
                )}
            </Alert>

            <Tabs
                tabs={[
                    { key: 'providers', label: 'Providers' },
                    { key: 'credentials', label: 'API credentials' },
                ]}
                value={tab}
                onChange={setTab}
            />

            {tab === 'providers' ? (
                <div className="space-y-6">
                    {!can && (
                        <Alert variant="info" title="Read-only">
                            You can see configuration and status, but changing credentials needs the
                            &ldquo;Manage marketing integrations&rdquo; permission.
                        </Alert>
                    )}

                    {Object.entries(grouped).map(([group, keys]) => (
                        <section key={group} className="space-y-3" aria-label={GROUP_LABEL[group] ?? group}>
                            <h2 className="text-sm font-semibold tracking-tight text-foreground">
                                {GROUP_LABEL[group] ?? group}
                            </h2>
                            {keys.map((key) => {
                                const row = byProvider[key];
                                if (!row) return null;

                                return can ? (
                                    <IntegrationCard key={key} row={row} busy={busy} onBusy={setBusy} />
                                ) : (
                                    <IntegrationCard key={key} row={{ ...row, credentials: [] }} busy={busy} onBusy={setBusy} />
                                );
                            })}
                        </section>
                    ))}

                    <Card>
                        <CardHeader
                            title="Google OAuth redirect URI"
                            description="If you use OAuth rather than a service-account key, paste this into the Google Cloud console as an authorised redirect URI."
                        />
                        <CardBody className="p-4">
                            <code className="block break-all rounded border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground">
                                {redirectUri}
                            </code>
                        </CardBody>
                    </Card>
                </div>
            ) : (
                credentialsTab
            )}
        </PlatformLayout>
    );
}
