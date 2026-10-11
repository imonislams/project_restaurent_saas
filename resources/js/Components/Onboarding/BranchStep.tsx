import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SelectInput from '@/Components/SelectInput';
import TextInput from '@/Components/TextInput';
import { OnboardingOptions } from '@/types/onboarding';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function BranchStep({
    form,
    options,
}: {
    form: Record<string, any>;
    options: OnboardingOptions;
}) {
    const { data, setData, post, processing, errors } = useForm(form);

    const toggleService = (value: string) => {
        const current: string[] = data.service_types ?? [];
        const next = current.includes(value)
            ? current.filter((v) => v !== value)
            : [...current, value];

        setData('service_types', next);
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.branch'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor="name" value="Branch name" />
                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="code" value="Branch code" />
                    <TextInput
                        id="code"
                        className="mt-1 block w-full"
                        placeholder="MAIN"
                        value={data.code}
                        onChange={(e) => setData('code', e.target.value)}
                    />
                    <InputError message={errors.code} className="mt-2" />
                </div>

                <div className="sm:col-span-2">
                    <InputLabel htmlFor="address" value="Address" />
                    <TextInput
                        id="address"
                        className="mt-1 block w-full"
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                    />
                    <InputError message={errors.address} className="mt-2" />
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
                    <InputLabel htmlFor="timezone" value="Timezone (optional)" />
                    <SelectInput
                        id="timezone"
                        className="mt-1"
                        value={data.timezone ?? ''}
                        onChange={(e) => setData('timezone', e.target.value)}
                    >
                        <option value="">Use company default</option>
                        {options.timezones.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </SelectInput>
                    <InputError message={errors.timezone} className="mt-2" />
                </div>

                <div className="sm:col-span-2">
                    <InputLabel value="Service types offered" />
                    <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {options.service_types.map((s) => (
                            <label
                                key={s.value}
                                className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700"
                            >
                                <Checkbox
                                    checked={(data.service_types ?? []).includes(
                                        s.value,
                                    )}
                                    onChange={() => toggleService(s.value)}
                                />
                                {s.label}
                            </label>
                        ))}
                    </div>
                    <InputError
                        message={errors.service_types}
                        className="mt-2"
                    />
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
