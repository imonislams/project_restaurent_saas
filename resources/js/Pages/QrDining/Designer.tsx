import Icon from '@/Components/Icon';
import BrandingFields from '@/Components/Qr/BrandingFields';
import QrCardCanvas from '@/Components/Qr/QrCardCanvas';
import {
    MAX_ELEMENTS,
    QrCanvas,
    QrElement,
    QrElementType,
    TOKEN_KEYS,
    clampElement,
    cloneCanvas,
    newElement,
} from '@/Components/Qr/qrCanvas';
import { QrBranding } from '@/Components/Qr/qrBranding';
import { Button, Card, CardBody, ConfirmDialog, EmptyState, PageHeader, SelectField, Tabs, TextField } from '@/Components/ui';
import { CheckboxField } from '@/Components/ui/Field';
import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface DesignPayload {
    id: number;
    name: string;
    branch_id: number | null;
    branch_name: string | null;
    is_active: boolean;
    canvas: QrCanvas;
    updated_at: string | null;
}

interface SampleTable {
    id: number;
    name: string;
    area_name: string | null;
}

const ADD_TYPES: QrElementType[] = ['text', 'rect', 'ellipse', 'line', 'image', 'qr'];

export default function QrDesigner({
    branches,
    filters,
    designs,
    activeId,
    defaultCanvas,
    tokens,
    fonts,
    branding,
    branding_styles,
    sampleTables,
    restaurant_name,
    branch_name,
    logo_url,
    asset_urls,
}: {
    branches: { id: number; name: string }[];
    filters: { branch_id: number | null };
    designs: DesignPayload[];
    activeId: number | null;
    defaultCanvas: QrCanvas;
    tokens: Record<string, string>;
    fonts: { value: string; label: string }[];
    branding: QrBranding;
    branding_styles: { value: string; label: string }[];
    sampleTables: SampleTable[];
    restaurant_name: string;
    branch_name: string | null;
    logo_url: string | null;
    asset_urls: Record<string, string>;
}) {
    const t = useT();
    const { auth, flash } = usePage().props as Record<string, any>;
    const canManage = auth?.permissions?.includes('qr.manage') ?? false;
    const canBrand = auth?.permissions?.includes('qr.settings') ?? false;

    const [tab, setTab] = useState('card');

    const [currentId, setCurrentId] = useState<number | null>(activeId);
    const [canvas, setCanvas] = useState<QrCanvas>(() => cloneCanvas(defaultCanvas));
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1.1);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [previewVersion, setPreviewVersion] = useState(0);
    const [sampleTableId, setSampleTableId] = useState<number | null>(sampleTables[0]?.id ?? null);
    const [pendingDelete, setPendingDelete] = useState<DesignPayload | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [brandForm, setBrandForm] = useState<QrBranding>(branding);
    const [assetUrls, setAssetUrls] = useState<Record<string, string>>(asset_urls);

    const history = useRef<{ past: QrCanvas[]; future: QrCanvas[] }>({ past: [], future: [] });
    const uploadRef = useRef<HTMLInputElement>(null);

    const current = useMemo(() => designs.find((d) => d.id === currentId) ?? null, [designs, currentId]);
    const element = useMemo(
        () => canvas.elements.find((e) => e.id === selected) ?? null,
        [canvas, selected],
    );
    const sampleTable = sampleTables.find((s) => s.id === sampleTableId) ?? null;

    // Load the selected design (and recover when the list changes underneath us).
    useEffect(() => {
        if (designs.length === 0) {
            setCanvas(cloneCanvas(defaultCanvas));
            return;
        }

        const target = designs.find((d) => d.id === currentId)
            ?? designs.find((d) => d.id === activeId)
            ?? designs[0];

        if (target.id !== currentId) setCurrentId(target.id);

        setCanvas(cloneCanvas(target.canvas));
        setName(target.name);
        setSelected(null);
        setDirty(false);
        history.current = { past: [], future: [] };
    }, [currentId, designs, activeId, defaultCanvas]);

    useEffect(() => {
        setBrandForm(branding);
    }, [branding]);

    const replace = useMemo(
        () => ({
            '{{restaurant}}': restaurant_name,
            '{{branch}}': branch_name ?? '',
            '{{table}}': sampleTable?.name ?? 'Table 1',
            '{{area}}': sampleTable?.area_name ?? '',
        }),
        [restaurant_name, branch_name, sampleTable],
    );

    const qrSrc = sampleTableId
        ? route('qr-dining.tables.qr', { table: sampleTableId, size: 320 })
        : null;

    /** Mutate the canvas, recording an undo step unless told otherwise. */
    const mutate = (mutator: (draft: QrCanvas) => QrCanvas, record = true) => {
        if (record) {
            history.current.past = [...history.current.past.slice(-49), cloneCanvas(canvas)];
            history.current.future = [];
        }

        setCanvas(mutator(cloneCanvas(canvas)));
        setDirty(true);
    };

    const undo = () => {
        const previous = history.current.past.pop();
        if (!previous) return;

        history.current.future = [...history.current.future, cloneCanvas(canvas)];
        setCanvas(previous);
        setDirty(true);
    };

    const redo = () => {
        const next = history.current.future.pop();
        if (!next) return;

        history.current.past = [...history.current.past, cloneCanvas(canvas)];
        setCanvas(next);
        setDirty(true);
    };

    const addElement = (type: QrElementType) => {
        if (canvas.elements.length >= MAX_ELEMENTS) return;

        const created = newElement(type, canvas, canvas.elements.length);

        mutate((draft) => ({ ...draft, elements: [...draft.elements, created] }));
        setSelected(created.id);
    };

    const updateElement = (id: string, patch: Partial<QrElement>) => {
        mutate((draft) => ({
            ...draft,
            elements: draft.elements.map((item) => (
                item.id === id ? clampElement({ ...item, ...patch }, draft) : item
            )),
        }));
    };

    const updateProp = (id: string, key: string, value: unknown) => {
        mutate((draft) => ({
            ...draft,
            elements: draft.elements.map((item) => (
                item.id === id ? { ...item, props: { ...item.props, [key]: value } } : item
            )),
        }));
    };

    const removeElement = (id: string) => {
        mutate((draft) => ({ ...draft, elements: draft.elements.filter((item) => item.id !== id) }));
        setSelected(null);
    };

    const reorder = (id: string, direction: -1 | 1) => {
        mutate((draft) => {
            const index = draft.elements.findIndex((item) => item.id === id);
            const next = index + direction;

            if (index < 0 || next < 0 || next >= draft.elements.length) return draft;

            const elements = [...draft.elements];
            [elements[index], elements[next]] = [elements[next], elements[index]];

            return { ...draft, elements };
        });
    };

    // Delete the selected element with the keyboard, ignoring typing contexts.
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return;

            if ((event.key === 'Delete' || event.key === 'Backspace') && selected) {
                event.preventDefault();
                removeElement(selected);
            }
        };

        window.addEventListener('keydown', handler);

        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, canvas]);

    const save = () => {
        if (!current) return;

        setSaving(true);
        router.patch(
            route('qr-dining.designs.update', current.id),
            { name, canvas: canvas as unknown as Record<string, any> },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setDirty(false);
                    setPreviewVersion((v) => v + 1);
                },
                onFinish: () => setSaving(false),
            },
        );
    };

    const createDesign = () => {
        router.post(
            route('qr-dining.designs.store'),
            { name: `${restaurant_name} card`, branch_id: filters.branch_id ?? null },
            { preserveScroll: true, preserveState: false },
        );
    };

    const duplicate = (design: DesignPayload) => {
        router.post(route('qr-dining.designs.duplicate', design.id), {}, { preserveScroll: true });
    };

    const activate = (design: DesignPayload) => {
        router.post(route('qr-dining.designs.activate', design.id), {}, { preserveScroll: true });
    };

    const uploadImage = async (file: File | null) => {
        if (!file || !element) return;

        const data = new FormData();
        data.append('image', file);

        try {
            const response = await window.axios.post(route('qr-dining.designs.assets'), data);
            const uploaded = response.data as { path: string; url: string };

            setAssetUrls((previous) => ({ ...previous, [uploaded.path]: uploaded.url }));
            mutate((draft) => ({
                ...draft,
                elements: draft.elements.map((item) => (
                    item.id === element.id
                        ? { ...item, props: { ...item.props, source: 'path', path: uploaded.path } }
                        : item
                )),
            }));
        } catch {
            setError(t('qr_designer.upload_failed'));
        } finally {
            if (uploadRef.current) uploadRef.current.value = '';
        }
    };

    const saveBranding = () => {
        router.post(
            route('qr-dining.branding.save'),
            { ...brandForm, branch_id: filters.branch_id ?? null },
            { preserveScroll: true, preserveState: true },
        );
    };

    const switchBranch = (branchId: string) => {
        router.get(route('qr-dining.designs.index'), { branch_id: branchId || null }, { preserveScroll: true });
    };

    // Cache-bust the authoritative preview after a save.
    const previewBase = current
        ? route('qr-dining.designs.preview', {
            design: current.id,
            ...(sampleTableId ? { table_id: sampleTableId } : {}),
        })
        : '';
    const previewUrl = previewBase === ''
        ? ''
        : `${previewBase}${previewBase.includes('?') ? '&' : '?'}v=${previewVersion}`;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title={t('qr_designer.title')}
                    description={t('qr_designer.subtitle')}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                icon={<Icon name="search" className="h-3.5 w-3.5" />}
                                onClick={() => setShowPreview((v) => !v)}
                                disabled={!current}
                            >
                                {showPreview ? t('qr_designer.hide_preview') : t('qr_designer.preview')}
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                external
                                disabled={!current}
                                icon={<Icon name="download" className="h-3.5 w-3.5" />}
                                href={current ? route('qr-dining.designs.export', { design: current.id }) : undefined}
                            >
                                {t('qr_designer.download_pdf')}
                            </Button>
                        </div>
                    }
                />
            }
        >
            <Head title={t('qr_designer.title')} />

            <div className="py-6">
                <div className="mx-auto max-w-[1500px] space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>
                    )}
                    {error && (
                        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
                    )}

                    <Tabs
                        tabs={[
                            { key: 'card', label: t('qr_designer.tab.card') },
                            { key: 'menu', label: t('qr_designer.tab.menu') },
                        ]}
                        value={tab}
                        onChange={setTab}
                    />

                    {tab === 'card' ? (
                        <>
                            <div className="flex flex-wrap items-end gap-3">
                                <SelectField
                                    label={t('qr_designer.branch')}
                                    value={String(filters.branch_id ?? '')}
                                    options={[
                                        { value: '', label: t('qr_designer.all_branches') },
                                        ...branches.map((b) => ({ value: String(b.id), label: b.name })),
                                    ]}
                                    onChange={switchBranch}
                                    className="w-56"
                                />
                                <SelectField
                                    label={t('qr_designer.sample_table')}
                                    value={String(sampleTableId ?? '')}
                                    options={sampleTables.map((s) => ({
                                        value: String(s.id),
                                        label: s.area_name ? `${s.name} · ${s.area_name}` : s.name,
                                    }))}
                                    onChange={(v) => setSampleTableId(v ? Number(v) : null)}
                                    className="w-56"
                                />
                                <div className="ml-auto flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={undo} disabled={!dirty}>
                                        {t('qr_designer.undo')}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={redo} disabled={!dirty}>
                                        {t('qr_designer.redo')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={save}
                                        loading={saving}
                                        disabled={!canManage || !current || !dirty}
                                    >
                                        {t('qr_designer.save')}
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_18rem]">
                                {/* Designs */}
                                <Card className="h-fit">
                                    <CardBody className="space-y-2 p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {t('qr_designer.designs')}
                                            </span>
                                            {canManage && (
                                                <Button variant="ghost" size="xs" onClick={createDesign} icon={<Icon name="plus" className="h-3.5 w-3.5" />}>
                                                    {t('qr_designer.new')}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            {designs.map((design) => (
                                                <button
                                                    key={design.id}
                                                    type="button"
                                                    onClick={() => setCurrentId(design.id)}
                                                    className={`w-full rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                                                        design.id === currentId
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'hover:bg-muted text-foreground'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="truncate font-semibold">{design.name}</span>
                                                        {design.is_active && (
                                                            <span className={`shrink-0 rounded px-1 text-[10px] font-bold ${
                                                                design.id === currentId ? 'bg-primary-foreground/20' : 'bg-emerald-100 text-emerald-700'
                                                            }`}>
                                                                {t('qr_designer.active')}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={`mt-0.5 block truncate ${design.id === currentId ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                                                        {design.branch_name ?? t('qr_designer.all_branches')}
                                                        {design.updated_at ? ` · ${design.updated_at}` : ''}
                                                    </span>
                                                </button>
                                            ))}

                                            {designs.length === 0 && (
                                                <p className="px-1 py-4 text-center text-xs text-muted-foreground">
                                                    {t('qr_designer.no_designs')}
                                                </p>
                                            )}
                                        </div>

                                        {current && canManage && (
                                            <div className="flex flex-wrap gap-1 border-t border-border pt-2">
                                                {!current.is_active && (
                                                    <Button variant="ghost" size="xs" onClick={() => activate(current)}>
                                                        {t('qr_designer.make_active')}
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="xs" onClick={() => duplicate(current)}>
                                                    {t('qr_designer.duplicate')}
                                                </Button>
                                                {designs.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="xs"
                                                        className="text-destructive hover:bg-destructive/10"
                                                        onClick={() => setPendingDelete(current)}
                                                    >
                                                        {t('qr_designer.delete')}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>

                                {/* Canvas */}
                                <Card>
                                    <CardBody className="space-y-3 p-3">
                                        {canManage && (
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {ADD_TYPES.map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => addElement(type)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                                                    >
                                                        <Icon name="plus" className="h-3 w-3" />
                                                        {t(`qr_designer.element.${type}`)}
                                                    </button>
                                                ))}
                                                <span className="ml-auto flex items-center gap-1">
                                                    <Button variant="ghost" size="xs" onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}>
                                                        −
                                                    </Button>
                                                    <span className="w-10 text-center font-mono text-xs text-muted-foreground">
                                                        {Math.round(zoom * 100)}%
                                                    </span>
                                                    <Button variant="ghost" size="xs" onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.1).toFixed(2))))}>
                                                        +
                                                    </Button>
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex justify-center overflow-auto rounded-xl border border-dashed border-border bg-muted/40 p-6">
                                            {canvas.elements.length === 0 && !canManage ? (
                                                <EmptyState title={t('qr_designer.empty_card')} description={t('qr_designer.empty_card_hint')} />
                                            ) : (
                                                <QrCardCanvas
                                                    canvas={canvas}
                                                    zoom={zoom}
                                                    replace={replace}
                                                    logoUrl={logo_url}
                                                    assetUrls={assetUrls}
                                                    qrSrc={qrSrc}
                                                    selectedId={selected}
                                                    interactive={canManage}
                                                    onSelect={setSelected}
                                                    onChange={updateElement}
                                                />
                                            )}
                                        </div>

                                        <p className="text-xs text-muted-foreground">{t('qr_designer.pdf_safe_note')}</p>
                                    </CardBody>
                                </Card>

                                {/* Inspector */}
                                <Card className="h-fit">
                                    <CardBody className="space-y-3 p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {t('qr_designer.inspector')}
                                            </span>
                                            {element && canManage && (
                                                <span className="flex gap-0.5">
                                                    <Button variant="ghost" size="xs" onClick={() => reorder(element.id, 1)} title={t('qr_designer.bring_forward')}>↑</Button>
                                                    <Button variant="ghost" size="xs" onClick={() => reorder(element.id, -1)} title={t('qr_designer.send_back')}>↓</Button>
                                                    <Button variant="ghost" size="xs" className="text-destructive" onClick={() => removeElement(element.id)}>
                                                        <Icon name="trash" className="h-3.5 w-3.5" />
                                                    </Button>
                                                </span>
                                            )}
                                        </div>

                                        {!element ? (
                                            <div className="space-y-2 py-2">
                                                <p className="text-xs text-muted-foreground">{t('qr_designer.select_element')}</p>
                                                <div className="rounded-md border border-border bg-muted/40 p-2">
                                                    <p className="text-[11px] font-semibold text-foreground">{t('qr_designer.tokens')}</p>
                                                    <ul className="mt-1 space-y-0.5">
                                                        {Object.entries(tokens).map(([token, label]) => (
                                                            <li key={token} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                                <code className="font-mono">{token}</code>
                                                                <span>{label}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-xs font-semibold text-foreground">
                                                    {t(`qr_designer.element.${element.type}`)}
                                                </p>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <TextField label={t('qr_designer.x')} type="number" value={String(element.x)} onChange={(v) => updateElement(element.id, { x: Number(v) })} />
                                                    <TextField label={t('qr_designer.y')} type="number" value={String(element.y)} onChange={(v) => updateElement(element.id, { y: Number(v) })} />
                                                    <TextField label={t('qr_designer.w')} type="number" value={String(element.w)} onChange={(v) => updateElement(element.id, { w: Number(v) })} />
                                                    <TextField label={t('qr_designer.h')} type="number" value={String(element.h)} onChange={(v) => updateElement(element.id, { h: Number(v) })} />
                                                </div>

                                                {element.type === 'text' && (
                                                    <>
                                                        <TextField label={t('qr_designer.content')} value={String(element.props.content ?? '')} onChange={(v) => updateProp(element.id, 'content', v)} />
                                                        <div className="flex flex-wrap gap-1">
                                                            {TOKEN_KEYS.map((token) => (
                                                                <button
                                                                    key={token}
                                                                    type="button"
                                                                    onClick={() => updateProp(element.id, 'content', `${element.props.content ?? ''}${token}`)}
                                                                    className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted"
                                                                >
                                                                    {token}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <SelectField label={t('qr_designer.font')} value={String(element.props.font)} options={fonts} onChange={(v) => updateProp(element.id, 'font', v)} />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <TextField label={t('qr_designer.size')} type="number" value={String(element.props.size_pt)} onChange={(v) => updateProp(element.id, 'size_pt', Number(v))} />
                                                            <SelectField
                                                                label={t('qr_designer.align')}
                                                                value={String(element.props.align)}
                                                                options={[
                                                                    { value: 'left', label: t('qr_designer.left') },
                                                                    { value: 'center', label: t('qr_designer.center') },
                                                                    { value: 'right', label: t('qr_designer.right') },
                                                                ]}
                                                                onChange={(v) => updateProp(element.id, 'align', v)}
                                                            />
                                                            <TextField label={t('qr_designer.line_height')} type="number" value={String(element.props.line_height)} onChange={(v) => updateProp(element.id, 'line_height', Number(v))} />
                                                            <TextField label={t('qr_designer.letter_spacing')} type="number" value={String(element.props.letter_spacing)} onChange={(v) => updateProp(element.id, 'letter_spacing', Number(v))} />
                                                        </div>
                                                        <CheckboxField label={t('qr_designer.bold')} checked={element.props.weight === 'bold'} onChange={(v) => updateProp(element.id, 'weight', v ? 'bold' : 'normal')} />
                                                        <CheckboxField label={t('qr_designer.italic')} checked={Boolean(element.props.italic)} onChange={(v) => updateProp(element.id, 'italic', v)} />
                                                        <CheckboxField label={t('qr_designer.underline')} checked={Boolean(element.props.underline)} onChange={(v) => updateProp(element.id, 'underline', v)} />
                                                        <ColorRow label={t('qr_designer.text_color')} value={String(element.props.color)} onChange={(v) => updateProp(element.id, 'color', v)} />
                                                    </>
                                                )}

                                                {(element.type === 'rect' || element.type === 'ellipse') && (
                                                    <>
                                                        <ColorRow label={t('qr_designer.fill')} value={String(element.props.fill)} onChange={(v) => updateProp(element.id, 'fill', v)} />
                                                        <ColorRow label={t('qr_designer.border_color')} value={String(element.props.border_color)} onChange={(v) => updateProp(element.id, 'border_color', v)} />
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <TextField label={t('qr_designer.border_width')} type="number" value={String(element.props.border_width)} onChange={(v) => updateProp(element.id, 'border_width', Number(v))} />
                                                            {element.type === 'rect' && (
                                                                <TextField label={t('qr_designer.radius')} type="number" value={String(element.props.radius)} onChange={(v) => updateProp(element.id, 'radius', Number(v))} />
                                                            )}
                                                        </div>
                                                    </>
                                                )}

                                                {element.type === 'line' && (
                                                    <ColorRow label={t('qr_designer.text_color')} value={String(element.props.color)} onChange={(v) => updateProp(element.id, 'color', v)} />
                                                )}

                                                {element.type === 'image' && canManage && (
                                                    <div className="space-y-2">
                                                        <SelectField
                                                            label={t('qr_designer.image_source')}
                                                            value={String(element.props.source ?? 'logo')}
                                                            options={[
                                                                { value: 'logo', label: t('qr_designer.use_logo') },
                                                                { value: 'path', label: t('qr_designer.use_upload') },
                                                            ]}
                                                            onChange={(v) => updateProp(element.id, 'source', v)}
                                                        />
                                                        <input
                                                            ref={uploadRef}
                                                            type="file"
                                                            accept="image/png,image/jpeg,image/webp"
                                                            className="hidden"
                                                            onChange={(event) => uploadImage(event.target.files?.[0] ?? null)}
                                                        />
                                                        <Button variant="outline" size="sm" onClick={() => uploadRef.current?.click()}>
                                                            {t('qr_designer.upload_image')}
                                                        </Button>
                                                    </div>
                                                )}

                                                {element.type === 'qr' && (
                                                    <TextField label={t('qr_designer.qr_margin')} type="number" value={String(element.props.margin)} onChange={(v) => updateProp(element.id, 'margin', Number(v))} />
                                                )}
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            </div>

                            {showPreview && current && (
                                <Card>
                                    <CardBody className="space-y-2 p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {t('qr_designer.preview')}
                                            </span>
                                            <span className="flex items-center gap-2">
                                                {dirty && <span className="text-xs text-amber-700">{t('qr_designer.unsaved')}</span>}
                                                <Button variant="ghost" size="xs" onClick={save} disabled={!canManage || !dirty}>
                                                    {t('qr_designer.save_and_refresh')}
                                                </Button>
                                                <Button variant="ghost" size="xs" onClick={() => setPreviewVersion((v) => v + 1)}>
                                                    {t('qr_designer.refresh')}
                                                </Button>
                                            </span>
                                        </div>
                                        <iframe
                                            key={previewVersion}
                                            src={previewUrl}
                                            title={t('qr_designer.preview')}
                                            className="h-[420px] w-full rounded-lg border border-border bg-white"
                                        />
                                        <p className="text-xs text-muted-foreground">{t('qr_designer.preview_hint')}</p>
                                    </CardBody>
                                </Card>
                            )}
                        </>
                    ) : (
                        <Card>
                            <CardBody className="p-4">
                                <BrandingFields
                                    data={brandForm as unknown as Record<string, any>}
                                    setData={(key, value) => setBrandForm((previous) => ({ ...previous, [key]: value }) as QrBranding)}
                                    styles={branding_styles}
                                    restaurantName={restaurant_name}
                                    logoUrl={logo_url}
                                    tableName={sampleTable?.name ?? 'Table 1'}
                                    disabled={!canBrand}
                                />
                                <div className="mt-4 flex justify-end">
                                    <Button onClick={saveBranding} disabled={!canBrand}>
                                        {t('qr_designer.save')}
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmDialog
                show={pendingDelete !== null}
                title={t('qr_designer.delete')}
                description={t('qr_designer.delete_confirm')}
                confirmLabel={t('qr_designer.delete')}
                onConfirm={() => {
                    if (pendingDelete) {
                        router.delete(route('qr-dining.designs.destroy', pendingDelete.id), {
                            preserveScroll: true,
                            onFinish: () => setPendingDelete(null),
                        });
                    }
                }}
                onClose={() => setPendingDelete(null)}
            />
        </AuthenticatedLayout>
    );
}

/** Colour swatch + hex entry for an element property. */
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <label className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">{label}</span>
            <span className="flex items-center gap-1.5">
                <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                    onChange={(event) => onChange(event.target.value.toLowerCase())}
                    className="h-7 w-9 cursor-pointer rounded border border-input bg-background p-0.5"
                    aria-label={label}
                />
                <input
                    type="text"
                    value={value}
                    maxLength={7}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-7 w-20 rounded border border-input bg-background px-1.5 font-mono text-[11px] text-foreground"
                />
            </span>
        </label>
    );
}
