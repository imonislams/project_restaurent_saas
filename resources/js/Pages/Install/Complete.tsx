import { Button, Card, CardBody } from '@/Components/ui';
import { useT } from '@/i18n';
import { Head, Link } from '@inertiajs/react';

export default function InstallComplete({ installed }: { installed: boolean }) {
    const t = useT();

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
            <Head title={t('install.complete.title')} />

            <Card className="w-full max-w-lg text-center">
                <CardBody className="space-y-4 py-8">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
                            <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>

                    <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
                        {installed ? t('install.complete.title') : t('install.complete.pending')}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t('install.complete.body')}</p>

                    {installed && (
                        <div className="pt-2">
                            <Button href={route('login')} variant="primary" size="lg">
                                {t('install.complete.login')}
                            </Button>
                        </div>
                    )}

                    {!installed && (
                        <div className="pt-2">
                            <Link href={route('install.index')} className="text-sm font-medium text-primary hover:underline">
                                {t('install.back')}
                            </Link>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
