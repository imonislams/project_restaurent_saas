import { CheckboxField, FormSection, SelectField, TextField } from '@/Components/ui';
import { useT } from '@/i18n';
import { contrastText } from './qrBranding';

/** Colour picker + hex entry, kept in one row so the value is always readable. */
function ColorField({
    label,
    value,
    onChange,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    return (
        <label className="block space-y-1.5">
            <span className="block text-xs font-semibold tracking-tight text-foreground">{label}</span>
            <span className="flex items-center gap-2">
                <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value.toLowerCase())}
                    className="h-8 w-10 shrink-0 cursor-pointer rounded-md border border-input bg-background p-0.5 disabled:opacity-50"
                    aria-label={label}
                />
                <input
                    type="text"
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                    maxLength={7}
                    className="h-8 w-24 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground shadow-xs focus:border-ring focus:ring-1 focus:ring-ring disabled:opacity-50"
                />
            </span>
        </label>
    );
}

/**
 * Branding for the page a diner sees after scanning. A live mini preview shows
 * the header exactly as the public QR pages will render it.
 */
export default function BrandingFields({
    data,
    setData,
    styles,
    restaurantName,
    logoUrl,
    tableName,
    disabled = false,
}: {
    data: Record<string, any>;
    setData: (key: string, value: any) => void;
    styles: { value: string; label: string }[];
    restaurantName: string;
    logoUrl?: string | null;
    tableName: string;
    disabled?: boolean;
}) {
    const t = useT();
    const primary = String(data.primary_color ?? '#ec3013');
    const accent = String(data.accent_color ?? '#0f172a');
    const background = String(data.background_color ?? '#f8fafc');
    const headerStyle = String(data.header_style ?? 'light');
    const showLogo = data.show_logo === undefined ? true : Boolean(data.show_logo);
    const showTableName = data.show_table_name === undefined ? true : Boolean(data.show_table_name);

    const headerBg = headerStyle === 'brand' ? primary : headerStyle === 'dark' ? accent : '#ffffff';
    const headerText = headerStyle === 'light' ? accent : contrastText(headerBg);

    return (
        <fieldset disabled={disabled} className="m-0 space-y-5 border-0 p-0">
            <FormSection
                title={t('qr_designer.branding.title')}
                description={t('qr_designer.branding.description')}
            >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <ColorField label={t('qr_designer.branding.primary')} value={primary} onChange={(v) => setData('primary_color', v)} />
                    <ColorField label={t('qr_designer.branding.accent')} value={accent} onChange={(v) => setData('accent_color', v)} />
                    <ColorField label={t('qr_designer.branding.background')} value={background} onChange={(v) => setData('background_color', v)} />
                </div>

                <SelectField
                    label={t('qr_designer.branding.header_style')}
                    value={headerStyle}
                    options={styles}
                    onChange={(v) => setData('header_style', v)}
                />

                <div className="flex flex-wrap gap-6">
                    <CheckboxField label={t('qr_designer.branding.show_logo')} checked={showLogo} onChange={(v) => setData('show_logo', v)} />
                    <CheckboxField label={t('qr_designer.branding.show_table')} checked={showTableName} onChange={(v) => setData('show_table_name', v)} />
                </div>
            </FormSection>

            <FormSection
                title={t('qr_designer.branding.welcome_title')}
                description={t('qr_designer.branding.welcome_hint')}
            >
                <TextField
                    label={t('qr_designer.branding.welcome_title')}
                    value={String(data.welcome_title ?? '')}
                    placeholder={t('qr_designer.branding.welcome_placeholder')}
                    onChange={(v) => setData('welcome_title', v)}
                />
                <TextField
                    label={t('qr_designer.branding.welcome_text')}
                    value={String(data.welcome_text ?? '')}
                    onChange={(v) => setData('welcome_text', v)}
                />
                <TextField
                    label={t('qr_designer.branding.footer')}
                    value={String(data.footer_text ?? '')}
                    onChange={(v) => setData('footer_text', v)}
                />
            </FormSection>

            <FormSection title={t('qr_designer.branding.preview')} description={t('qr_designer.branding.preview_hint')}>
                <div className="overflow-hidden rounded-xl border border-border" style={{ background }}>
                    <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: headerBg }}>
                        <div className="flex min-w-0 items-center gap-2.5">
                            {showLogo && logoUrl && (
                                <img src={logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold" style={{ color: headerText }}>{restaurantName}</p>
                                <p className="truncate text-xs" style={{ color: headerText, opacity: 0.75 }}>
                                    {t('qr_designer.branding.branch')}
                                    {showTableName ? ` · ${tableName}` : ''}
                                </p>
                            </div>
                        </div>
                        <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ background: primary, color: contrastText(primary) }}>
                            {t('qr_designer.branding.preview_action')}
                        </span>
                    </div>
                    <div className="space-y-2 p-4">
                        {data.welcome_title && <p className="text-sm font-semibold" style={{ color: accent }}>{data.welcome_title}</p>}
                        {data.welcome_text && <p className="text-xs" style={{ color: accent, opacity: 0.7 }}>{data.welcome_text}</p>}
                        <div className="grid grid-cols-2 gap-2">
                            {[0, 1].map((i) => (
                                <div key={i} className="rounded-lg bg-white p-2 shadow-xs">
                                    <div className="h-14 rounded-md" style={{ background: `${primary}1a` }} />
                                    <div className="mt-2 h-2 w-4/5 rounded" style={{ background: `${accent}22` }} />
                                    <div className="mt-1.5 h-2 w-1/3 rounded" style={{ background: `${accent}33` }} />
                                </div>
                            ))}
                        </div>
                        {data.footer_text && (
                            <p className="pt-1 text-center text-[11px]" style={{ color: accent, opacity: 0.6 }}>{data.footer_text}</p>
                        )}
                    </div>
                </div>
            </FormSection>
        </fieldset>
    );
}
