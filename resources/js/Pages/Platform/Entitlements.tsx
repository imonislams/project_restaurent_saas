import { Badge, Card, CardBody, CardHeader, formatNumber } from '@/Components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/Table';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { Check, Minus } from 'lucide-react';

interface PlanRow {
    id: number;
    name: string;
    is_active: boolean;
    archived: boolean;
    version: number;
    features: string[];
    limits: Record<string, number | null>;
    subscriptions_count: number;
}

export default function Entitlements({
    features,
    plans,
    limit_keys,
}: {
    features: string[];
    plans: PlanRow[];
    limit_keys: string[];
}) {
    return (
        <PlatformLayout title="Entitlements" description="Which modules and limits each plan grants. Feature access is enforced on the backend by the plan entitlement gate.">
            <Card className="mb-5">
                <CardHeader title="Feature Matrix" description="Module entitlements granted per tier" />
                <CardBody className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-56 sticky left-0 bg-background/95 backdrop-blur-xs font-semibold">Feature</TableHead>
                                    {plans.map((plan) => (
                                        <TableHead key={plan.id} className="text-center font-semibold">
                                            {plan.name}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {features.map((feature) => (
                                    <TableRow key={feature}>
                                        <TableCell className="sticky left-0 bg-background/95 backdrop-blur-xs font-medium capitalize text-foreground">
                                            {feature.replace(/_/g, ' ')}
                                        </TableCell>
                                        {plans.map((plan) => (
                                            <TableCell key={plan.id} className="text-center">
                                                {plan.features.includes(feature) ? (
                                                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                                        <Check className="h-3.5 w-3.5" />
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground/40">
                                                        <Minus className="h-3.5 w-3.5 inline" />
                                                    </span>
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Plan Limits" description="Blank or ∞ denotes uncapped capacity" />
                    <CardBody className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Plan</TableHead>
                                        {limit_keys.map((key) => (
                                            <TableHead key={key} className="text-right capitalize">{key.replace(/_/g, ' ')}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plans.map((plan) => (
                                        <TableRow key={plan.id}>
                                            <TableCell className="font-medium text-foreground">
                                                {plan.name} <span className="ml-1 text-xs text-muted-foreground">v{plan.version}</span>
                                            </TableCell>
                                            {limit_keys.map((key) => (
                                                <TableCell key={key} className="text-right tabular-nums text-muted-foreground font-medium">
                                                    {plan.limits[key] === null || plan.limits[key] === undefined ? '∞' : formatNumber(plan.limits[key] as number)}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Plans Adoption" description="Status and tenant allocation summary" />
                    <CardBody className="space-y-3">
                        {plans.map((plan) => (
                            <div key={plan.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2.5 last:border-b-0 last:pb-0">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">{plan.name}</div>
                                    <div className="text-xs text-muted-foreground">{plan.subscriptions_count} active subscription(s)</div>
                                </div>
                                <Badge tone={plan.archived ? 'neutral' : plan.is_active ? 'success' : 'warning'}>{plan.archived ? 'Archived' : plan.is_active ? 'Active' : 'Inactive'}</Badge>
                            </div>
                        ))}
                    </CardBody>
                </Card>
            </div>
        </PlatformLayout>
    );
}
