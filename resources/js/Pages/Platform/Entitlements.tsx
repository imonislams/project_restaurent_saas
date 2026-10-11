import { Badge, Card, CardBody, CardHeader, formatNumber } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';

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
                <CardHeader title="Feature matrix" description="A tick means the plan grants the module" />
                <CardBody>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-gray-200 bg-gray-50/60">
                                <tr>
                                    <th className="sticky left-0 bg-gray-50/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Feature</th>
                                    {plans.map((plan) => (
                                        <th key={plan.id} className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                            {plan.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {features.map((feature) => (
                                    <tr key={feature} className="hover:bg-gray-50/70">
                                        <td className="sticky left-0 bg-white px-4 py-3 font-medium capitalize text-gray-700">{feature}</td>
                                        {plans.map((plan) => (
                                            <td key={plan.id} className="px-4 py-3 text-center">
                                                {plan.features.includes(feature) ? (
                                                    <span className="font-semibold text-emerald-600">✓</span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Card>
                    <CardHeader title="Plan limits" description="Blank or ∞ means unlimited" />
                    <CardBody>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500">
                                        <th className="px-3 py-2">Plan</th>
                                        {limit_keys.map((key) => (
                                            <th key={key} className="px-3 py-2 text-right capitalize">{key.replace(/_/g, ' ')}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {plans.map((plan) => (
                                        <tr key={plan.id}>
                                            <td className="px-3 py-2.5 font-medium text-gray-800">
                                                {plan.name} <span className="ml-1 text-xs text-gray-400">v{plan.version}</span>
                                            </td>
                                            {limit_keys.map((key) => (
                                                <td key={key} className="px-3 py-2.5 text-right text-gray-600">
                                                    {plan.limits[key] === null || plan.limits[key] === undefined ? '∞' : formatNumber(plan.limits[key] as number)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title="Plans" description="Status and adoption" />
                    <CardBody className="space-y-3">
                        {plans.map((plan) => (
                            <div key={plan.id} className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-medium text-gray-800">{plan.name}</div>
                                    <div className="text-xs text-gray-400">{plan.subscriptions_count} subscription(s)</div>
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
