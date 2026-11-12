import { Badge, Button, Card, CardBody, CardHeader, Checkbox, ConfirmDialog, EmptyState, formatDateTime } from '@/Components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/Table';
import { useT } from '@/i18n';
import { useForm } from '@inertiajs/react';
import { Play, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface MigrationRow {
    name: string;
    status: 'pending' | 'executed';
    batch: number | null;
}

export interface MigrationRun {
    id: number;
    command: string;
    status: string;
    exit_code: number | null;
    duration_ms: number | null;
    output: string | null;
    created_at: string | null;
}

export interface MigrationState {
    readable: boolean;
    error: string | null;
    pending: MigrationRow[];
    executed: MigrationRow[];
    last_backup: { taken_at: string | null; verified: boolean } | null;
    last_run: MigrationRun | null;
}

/**
 * Pending-migration manager for the Command Center. Only pending migrations are
 * selectable; execution goes through one endpoint that re-validates the
 * selection against the live pending set on the server.
 */
export default function PendingMigrations({ migrations }: { migrations: MigrationState }) {
    const t = useT();
    const [filter, setFilter] = useState<'pending' | 'executed'>('pending');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirm, setConfirm] = useState<string[] | null>(null);
    const form = useForm({ migrations: [] as string[], backup: true });

    const pendingNames = useMemo(() => migrations.pending.map((migration) => migration.name), [migrations.pending]);
    const rows = filter === 'pending' ? migrations.pending : migrations.executed;

    const allSelected = pendingNames.length > 0 && selected.size === pendingNames.length;
    const someSelected = selected.size > 0 && !allSelected;

    const toggle = (name: string) =>
        setSelected((previous) => {
            const next = new Set(previous);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });

    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(pendingNames));

    // Pending order is the execution order; the server re-orders regardless.
    const ordered = (names: string[]) => pendingNames.filter((name) => names.includes(name));

    const confirmNames = confirm ?? [];
    const confirmOrdered = ordered(confirmNames);
    const skipsEarlier =
        confirm !== null && confirmOrdered.join('|') !== pendingNames.slice(0, confirmOrdered.length).join('|');
    const skippedCount = confirmOrdered.length > 0 ? pendingNames.indexOf(confirmOrdered[0]) : 0;

    const submit = (names: string[]) => {
        form.transform(() => ({ migrations: names, backup: form.data.backup }));

        form.post(route('platform.commands.migrations.run'), {
            preserveScroll: true,
            onSuccess: () => setSelected(new Set()),
            onFinish: () => setConfirm(null),
        });
    };

    return (
        <Card className="mt-5">
            <CardHeader title={t('migrations.title')} description={t('migrations.description')} />
            <CardBody className="p-0">
                {!migrations.readable ? (
                    <div className="p-6">
                        <EmptyState title={t('migrations.unreadable')} description={migrations.error ?? undefined} />
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
                            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                                <Button
                                    variant={filter === 'pending' ? 'secondary' : 'ghost'}
                                    size="xs"
                                    onClick={() => setFilter('pending')}
                                >
                                    {t('migrations.filter.pending')} ({migrations.pending.length})
                                </Button>
                                <Button
                                    variant={filter === 'executed' ? 'secondary' : 'ghost'}
                                    size="xs"
                                    onClick={() => setFilter('executed')}
                                >
                                    {t('migrations.filter.executed')} ({migrations.executed.length})
                                </Button>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {migrations.last_backup
                                    ? `${t('migrations.last_backup')}: ${
                                          migrations.last_backup.taken_at
                                              ? formatDateTime(migrations.last_backup.taken_at)
                                              : '—'
                                      } · ${migrations.last_backup.verified ? t('migrations.verified') : t('migrations.not_verified')}`
                                    : t('migrations.no_backup')}
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/20 px-4 py-2.5">
                            <label className="flex items-center gap-2 text-xs font-medium text-foreground">
                                <Checkbox
                                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                    onCheckedChange={toggleAll}
                                    disabled={filter !== 'pending' || pendingNames.length === 0}
                                    aria-label={t('migrations.select_all')}
                                />
                                {t('migrations.select_all')}
                            </label>
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => setSelected(new Set())}
                                disabled={selected.size === 0}
                            >
                                {t('migrations.deselect_all')}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                                {t('migrations.selected_count', { count: selected.size, total: pendingNames.length })}
                            </span>

                            <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                                <label className="flex items-center gap-2 text-xs text-foreground" title={t('migrations.backup_hint')}>
                                    <Checkbox
                                        checked={form.data.backup}
                                        onCheckedChange={(checked) => form.setData('backup', checked === true)}
                                        aria-label={t('migrations.backup')}
                                    />
                                    {t('migrations.backup')}
                                </label>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={selected.size === 0 || form.processing}
                                    onClick={() => setConfirm([...selected])}
                                >
                                    <Play className="mr-1.5 h-3.5 w-3.5" />
                                    {t('migrations.run_selected')}
                                </Button>
                            </div>
                        </div>

                        {form.errors.migrations && (
                            <p className="border-b border-border px-4 py-2 text-xs font-medium text-rose-600">
                                {form.errors.migrations}
                            </p>
                        )}

                        {migrations.last_run && (
                            <div className="border-b border-border px-4 py-2.5">
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <Badge tone={migrations.last_run.status === 'completed' ? 'success' : 'danger'}>
                                        {t('migrations.last_run')}: exit {migrations.last_run.exit_code ?? 0}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                        {migrations.last_run.created_at ? formatDateTime(migrations.last_run.created_at) : '—'}
                                    </span>
                                    <span className="text-muted-foreground">{migrations.last_run.duration_ms ?? 0}ms</span>
                                </div>
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-muted-foreground">
                                        {t('migrations.view_output')}
                                    </summary>
                                    <pre className="mt-1 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-background p-3 font-mono text-[11px] leading-relaxed text-foreground">
                                        {migrations.last_run.output || t('migrations.no_output')}
                                    </pre>
                                </details>
                            </div>
                        )}

                        {rows.length === 0 ? (
                            <div className="p-6">
                                <EmptyState
                                    title={filter === 'pending' ? t('migrations.empty.pending') : t('migrations.empty.executed')}
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10" />
                                            <TableHead>{t('migrations.column.migration')}</TableHead>
                                            <TableHead className="w-24">{t('migrations.column.status')}</TableHead>
                                            <TableHead className="w-20">{t('migrations.column.batch')}</TableHead>
                                            <TableHead className="w-24 text-right">{t('migrations.column.action')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => (
                                            <TableRow key={row.name}>
                                                <TableCell className="w-10">
                                                    {row.status === 'pending' && (
                                                        <Checkbox
                                                            checked={selected.has(row.name)}
                                                            onCheckedChange={() => toggle(row.name)}
                                                            aria-label={row.name}
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="min-w-0">
                                                    <span className="break-words font-mono text-xs text-foreground">
                                                        {row.name}.php
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge tone={row.status === 'pending' ? 'warning' : 'success'}>
                                                        {t(`migrations.status.${row.status}`)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {row.batch ?? '—'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {row.status === 'pending' && (
                                                        <Button
                                                            variant="secondary"
                                                            size="xs"
                                                            disabled={form.processing}
                                                            onClick={() => setConfirm([row.name])}
                                                        >
                                                            <Play className="mr-1 h-3 w-3" />
                                                            {t('migrations.run')}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </>
                )}
            </CardBody>

            <ConfirmDialog
                show={confirm !== null}
                title={t('migrations.confirm_title', { count: confirmNames.length })}
                description={form.data.backup ? t('migrations.confirm_backup_on') : t('migrations.confirm_backup_off')}
                confirmLabel={t('migrations.confirm')}
                tone="danger"
                processing={form.processing}
                requireText={confirm !== null && (confirmNames.length > 1 || skipsEarlier) ? 'MIGRATE' : undefined}
                onConfirm={() => confirm && submit(confirm)}
                onClose={() => setConfirm(null)}
            >
                <ul className="max-h-40 space-y-1 overflow-auto font-mono text-[11px] text-foreground">
                    {confirmOrdered.map((name) => (
                        <li key={name}>{name}.php</li>
                    ))}
                </ul>
                {skipsEarlier && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-600">
                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {t('migrations.skip_warning', { count: skippedCount })}
                    </p>
                )}
            </ConfirmDialog>
        </Card>
    );
}
