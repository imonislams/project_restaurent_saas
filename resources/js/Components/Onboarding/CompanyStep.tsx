import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { OnboardingOptions } from '@/types/onboarding';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function CompanyStep({
    form,
    options,
}: {
    form: Record<string, any>;
    options: OnboardingOptions;
}) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.company'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <InputLabel htmlFor="legal_name" value="Legal / business name" />
                    <TextInput
                        id="legal_name"
                        className="mt-1 block w-full"
                        value={data.legal_name}
                        onChange={(e) => setData('legal_name', e.target.value)}
                        required
                    />
                    <InputError message={errors.legal_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="phone" value="Phone" />
                    <TextInput
                        id="phone"
                        className="mt-1 block w-full"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                    />
                    <InputError message={errors.phone} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Business email" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="tax_id" value="Tax / VAT ID" />
                    <TextInput
                        id="tax_id"
                        className="mt-1 block w-full"
                        value={data.tax_id}
                        onChange={(e) => setData('tax_id', e.target.value)}
                    />
                    <InputError message={errors.tax_id} className="mt-2" />
                </div>

                <div className="sm:col-span-2">
                    <InputLabel htmlFor="address" value="Business address" />
                    <TextInput
                        id="address"
                        className="mt-1 block w-full"
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                    />
                    <InputError message={errors.address} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="country" value="Country" />
                    <SelectInput
                        id="country"
                        className="mt-1"
                        value={data.country}
                        onChange={(e) => setData('country', e.target.value)}
                    >
                        {options.countries.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </SelectInput>
                    <InputError message={errors.country} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="currency" value="Currency" />
                    <SelectInput
                        id="currency"
                        className="mt-1"
                        value={data.currency}
                        onChange={(e) => setData('currency', e.target.value)}
                    >
                        {options.currencies.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.label}
                            </option>
                        ))}
                    </SelectInput>
                    <InputError message={errors.currency} className="mt-2" />
                </div>

                <div className="sm:col-span-2">
                    <InputLabel htmlFor="timezone" value="Timezone" />
                    <SelectInput
                        id="timezone"
                        className="mt-1"
                        value={data.timezone}
                        onChange={(e) => setData('timezone', e.target.value)}
                    >
                        {options.timezones.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </SelectInput>
                    <InputError message={errors.timezone} className="mt-2" />
                    <p className="mt-2 text-xs text-gray-500">
                        Used for reports and business-day boundaries. Choose the
                        timezone where the restaurant operates.
                    </p>
                </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-4">
                <PrimaryButton disabled={processing}>
                    Save &amp; continue
                </PrimaryButton>
            </div>
        </form>
    );
}
