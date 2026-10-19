import { CheckboxField, FormSection, SelectField } from '@/Components/ui';
import type { FieldProps } from './types';

export default function OrdersFields({ data, setData, errors }: FieldProps) {
    return (
        <>
            <FormSection
                title="Table staff order confirmation"
                description="How orders taken by table staff are confirmed before they reach the kitchen."
            >
                <SelectField
                    label="Confirmation mode"
                    value={String(data.staff_confirmation_mode ?? 'direct')}
                    error={errors.staff_confirmation_mode}
                    onChange={(v) => setData('staff_confirmation_mode', v)}
                    options={[
                        { value: 'central', label: 'Central approval required' },
                        { value: 'direct', label: 'Direct confirmation' },
                    ]}
                />
                <CheckboxField
                    label="Allow branch staff to take orders directly"
                    hint="When off, orders taken by table staff always require central approval."
                    checked={Boolean(data.branch_direct_order_taking)}
                    onChange={(v) => setData('branch_direct_order_taking', v)}
                />
            </FormSection>

            <FormSection
                title="Kitchen dispatch"
                description="Confirmation gates the kitchen — only confirmed orders are ever dispatched."
            >
                <CheckboxField
                    label="Send confirmed orders to kitchen"
                    hint="When off, confirmed orders are not sent to the kitchen automatically."
                    checked={Boolean(data.send_confirmed_to_kitchen)}
                    onChange={(v) => setData('send_confirmed_to_kitchen', v)}
                />
            </FormSection>
        </>
    );
}
