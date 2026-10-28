import { SelectField } from '@/Components/ui';
import FormSection from '@/Components/ui/FormSection';
import { useT } from '@/i18n';
import type { FieldProps } from './types';

const POLICIES = ['invite_link', 'email_link', 'none'] as const;

/**
 * Team tab: how a new team member's email address is verified when their account
 * is created. Applied to every new account; existing staff keep their state.
 */
export default function TeamFields({ data, setData, errors }: FieldProps) {
    const t = useT();
    const selected = String(data.invitation_verification ?? 'invite_link');

    return (
        <FormSection title={t('settings.team_section')} description={t('settings.team_hint')}>
            <SelectField
                label={t('settings.invitation_verification')}
                value={selected}
                options={POLICIES.map((value) => ({
                    value,
                    label: t(`settings.invitation_policy.${value}`),
                }))}
                hint={t(`settings.invitation_policy.${selected}_hint`)}
                error={errors.invitation_verification}
                onChange={(value) => setData('invitation_verification', value)}
            />
        </FormSection>
    );
}
