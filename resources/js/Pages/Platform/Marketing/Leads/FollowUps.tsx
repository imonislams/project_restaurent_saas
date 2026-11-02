import { Alert, Card, CardBody, CardHeader, DataTable, EmptyState, Tabs } from '@/Components/ui';
import type { Column } from '@/Components/ui';
import { formatDateTime } from '@/Components/ui/Money';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface LeadRow {
    id: number;
    name: string;
    email: string;
    business_name: string | null;
    status_label: string;
    assignee: string | null;
    follow_up_at: string | null;
    created_at: string | null;
}

export default function FollowUps({ due, demos }: { due: LeadRow[]; demos: LeadRow[] }) {
    const [tab, setTab] = useState('reminders');

    const columns: Column<LeadRow>[] = [
        {
            key: 'name',
            label: 'Lead',
            render: (row) => (
                <Link href={route('platform.marketing.leads.show', row.id)} className="min-w-0 block hover:underline">
                    <span className="block truncate text-sm font-medium text-foreground">{row.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{row.business_name ?? row.email}</span>
                </Link>
            ),
        },
        { key: 'status_label', label: 'Status', render: (row) => <span className="text-xs">{row.status_label}</span> },
        { key: 'assignee', label: 'Owner', render: (row) => <span className="text-xs">{row.assignee ?? 'Unassigned'}</span> },
        {
            key: 'follow_up_at',
            label: 'Follow up',
            render: (row) => <span className="text-xs">{row.follow_up_at ? formatDateTime(row.follow_up_at) : '—'}</span>,
        },
    ];

    return (
        <PlatformLayout title="Follow-ups" description="What needs attention now, and who owns it.">
            <Head title="Follow-ups" />

            <Alert variant="info" title="Overdue first">
                Reminders are ordered by due date, so anything overdue sits at the top. A lead with no follow-up date never
                appears here — set one on the lead to schedule it.
            </Alert>

            <Tabs
                tabs={[
                    { key: 'reminders', label: 'Reminders', badge: due.length },
                    { key: 'demos', label: 'Demo requests', badge: demos.length },
                ]}
                value={tab}
                onChange={setTab}
            />

            <Card>
                <CardHeader title={tab === 'reminders' ? 'Due follow-ups' : 'Demo pipeline'} />
                <CardBody className="p-0">
                    <DataTable
                        columns={tab === 'reminders' ? columns : columns.filter((column) => column.key !== 'follow_up_at')}
                        rows={tab === 'reminders' ? due : demos}
                        rowKey={(row) => row.id}
                        empty={
                            <EmptyState
                                title={tab === 'reminders' ? 'Nothing due' : 'No demos scheduled'}
                                description={tab === 'reminders' ? 'Every open lead is either unscheduled or in the future.' : 'Leads move here once a demo is booked.'}
                            />
                        }
                    />
                </CardBody>
            </Card>
        </PlatformLayout>
    );
}
