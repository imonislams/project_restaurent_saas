import BillingFields from '@/Components/Settings/BillingFields';
import BranchFields from '@/Components/Settings/BranchFields';
import CompanyFields from '@/Components/Settings/CompanyFields';
import HoursFields from '@/Components/Settings/HoursFields';
import NotificationFields from '@/Components/Settings/NotificationFields';
import OrdersFields from '@/Components/Settings/OrdersFields';
import PosFields from '@/Components/Settings/PosFields';
import QrFields from '@/Components/Settings/QrFields';
import ReceiptFields from '@/Components/Settings/ReceiptFields';
import TaxFields from '@/Components/Settings/TaxFields';
import type { SettingsOptions } from '@/Components/Settings/types';
import { Button, PageHeader, Tabs } from '@/Components/ui';
import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';

const GROUPS = ['company', 'branches', 'hours', 'tax', 'receipt', 'billing', 'pos', 'orders', 'notifications', 'qr', 'payments'] as const;

export default function SettingsShow({
    group,
    form,
    options,
}: {
    group: string;
    form: Record<string, any>;
    options: SettingsOptions;
}) {
    const t = useT();
    const { flash } = usePage().props as Record<string, any>;
    const { data, setData, post, processing, errors } = useForm(form);

    // Re-seed the form when switching tabs (same component instance is reused).
    useEffect(() => {
        setData(form);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [group]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('settings.update', { group }), { preserveScroll: true });
    };

    const renderFields = () => {
        switch (group) {
            case 'company':
                return <CompanyFields data={data} setData={setData} errors={errors} options={options} />;
            case 'branches':
                return <BranchFields data={data} setData={setData} errors={errors} options={options} />;
            case 'hours':
                return <HoursFields data={data} setData={setData} errors={errors} options={options} />;
            case 'tax':
                return <TaxFields data={data} setData={setData} errors={errors} options={options} />;
            case 'receipt':
                return <ReceiptFields data={data} setData={setData} errors={errors} options={options} />;
            case 'billing':
                return <BillingFields data={data} setData={setData} errors={errors} options={options} />;
            case 'pos':
                return <PosFields data={data} setData={setData} errors={errors} options={options} />;
            case 'orders':
                return <OrdersFields data={data} setData={setData} errors={errors} options={options} />;
            case 'notifications':
                return <NotificationFields data={data} setData={setData} errors={errors} options={options} />;
            case 'qr':
                return <QrFields data={data} setData={setData} errors={errors} options={options} />;
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout header={<PageHeader title={t('settings.title')} description={t('settings.subtitle')} />}>
            <div className="py-6">
                <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    <Tabs
                        tabs={GROUPS.map((key) => ({ key, label: t(`settings.tab.${key}`) }))}
                        value={group}
                        onChange={(key) => router.get(key === 'payments' ? route('settings.payments.index') : route('settings.show', { group: key }), {}, { preserveScroll: true })}
                    />

                    <form onSubmit={submit} className="space-y-5">
                        {renderFields()}
                        <div className="flex justify-end">
                            <Button type="submit" loading={processing}>
                                {t('settings.save')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
