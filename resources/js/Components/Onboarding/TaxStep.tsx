import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function TaxStep({ form }: { form: Record<string, any> }) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.tax'));
    };

    const skip = () => post(route('onboarding.skip', 'tax'));

    return (
        <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                    <InputLabel htmlFor="tax_name" value="Tax label" />
                    <TextInput
                        id="tax_name"
                        className="mt-1 block w-full"
                        placeholder="VAT / GST / Sales Tax"
                        value={data.tax_name}
                        onChange={(e) => setData('tax_name', e.target.value)}
                        required
                    />
                    <InputError message={errors.tax_name} className="mt-2" />
                </div>

                <div>
                    <InputLabel htmlFor="tax_rate" value="Rate (%)" />
                    <TextInput
                        id="tax_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        className="mt-1 block w-full"
                        value={data.tax_rate}
                        onChange={(e) =>
                            setData('tax_rate', e.target.value as any)
                        }
                        required
                    />
                    <InputError message={errors.tax_rate} className="mt-2" />
                </div>
            </div>

            <label className="flex items-start gap-3 rounded-md border border-gray-200 px-4 py-3">
                <Checkbox
                    className="mt-0.5"
                    checked={data.tax_inclusive}
                    onChange={(e) =>
                        setData('tax_inclusive', e.target.checked as any)
                    }
                />
                <span className="text-sm text-gray-700">
                    Prices already include tax
                    <span className="mt-0.5 block text-xs text-gray-500">
                        If checked, listed product prices are tax-inclusive.
                        Otherwise tax is added at checkout.
                    </span>
                </span>
            </label>

            <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <SecondaryButton type="button" onClick={skip}>
                    Skip for now
                </SecondaryButton>
                <PrimaryButton disabled={processing}>
                    Save &amp; continue
                </PrimaryButton>
            </div>
        </form>
    );
}
