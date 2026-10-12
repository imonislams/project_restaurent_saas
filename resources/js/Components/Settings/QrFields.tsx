import { CheckboxField, FormSection, SelectField, TextField } from '@/Components/ui';
import type { FieldProps } from './types';

export default function QrFields({ data, setData, errors }: FieldProps) {
    return (
        <>
            <FormSection title="QR Dining" description="Let customers scan a table QR code to browse the menu and order from their phone — no app required.">
                <CheckboxField label="Enable QR dining" checked={Boolean(data.qr_enabled)} onChange={(v) => setData('qr_enabled', v)} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CheckboxField label="Allow guest ordering (no account)" checked={Boolean(data.qr_guest_checkout)} onChange={(v) => setData('qr_guest_checkout', v)} />
                    <TextField
                        label="Session timeout (minutes)"
                        type="number"
                        value={String(data.qr_session_timeout_minutes ?? 180)}
                        error={errors.qr_session_timeout_minutes}
                        onChange={(v) => setData('qr_session_timeout_minutes', v)}
                    />
                </div>
            </FormSection>

            <FormSection title="Customer access" description="Optionally require contact details before ordering.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CheckboxField label="Require a phone number" checked={Boolean(data.qr_require_phone)} onChange={(v) => setData('qr_require_phone', v)} />
                    <CheckboxField label="Require an email address" checked={Boolean(data.qr_require_email)} onChange={(v) => setData('qr_require_email', v)} />
                </div>
            </FormSection>

            <FormSection title="Ordering" description="How QR orders are handled once submitted.">
                <CheckboxField
                    label="Accept orders automatically"
                    checked={Boolean(data.qr_auto_accept)}
                    onChange={(v) => setData('qr_auto_accept', v)}
                    hint="When off, staff must confirm each QR order before it reaches the kitchen."
                />
                <CheckboxField label="Allow additional orders during a visit" checked={Boolean(data.qr_allow_additional_orders)} onChange={(v) => setData('qr_allow_additional_orders', v)} />
                <CheckboxField label="Allow special instructions on items" checked={Boolean(data.qr_allow_notes)} onChange={(v) => setData('qr_allow_notes', v)} />
            </FormSection>

            <FormSection title="Kitchen & tracking" description="What customers see while their food is being prepared.">
                <CheckboxField label="Show live order tracking" checked={Boolean(data.qr_live_tracking)} onChange={(v) => setData('qr_live_tracking', v)} />
            </FormSection>

            <FormSection title="Billing" description="How customers settle the bill.">
                <CheckboxField label="Allow customers to request the bill" checked={Boolean(data.qr_allow_bill_request)} onChange={(v) => setData('qr_allow_bill_request', v)} />
                <SelectField
                    label="Billing mode"
                    value={String(data.qr_billing_mode ?? 'consolidated')}
                    options={[
                        { value: 'consolidated', label: 'Consolidated table bill' },
                        { value: 'individual', label: 'Individual order billing' },
                    ]}
                    error={errors.qr_billing_mode}
                    onChange={(v) => setData('qr_billing_mode', v)}
                />
            </FormSection>

            <FormSection title="Post-order" description="After the bill is settled.">
                <CheckboxField label="Provide a digital receipt" checked={Boolean(data.qr_digital_receipt)} onChange={(v) => setData('qr_digital_receipt', v)} />
                <CheckboxField label="Ask for feedback" checked={Boolean(data.qr_feedback)} onChange={(v) => setData('qr_feedback', v)} />
                <CheckboxField label="Offer loyalty enrolment" checked={Boolean(data.qr_loyalty)} onChange={(v) => setData('qr_loyalty', v)} />
            </FormSection>
        </>
    );
}
