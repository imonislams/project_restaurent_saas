import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ReceiptStep({ form }: { form: Record<string, any> }) {
    const { data, setData, post, processing, errors } = useForm(form);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.receipt'));
    };

    const skip = () => post(route('onboarding.skip', 'receipt'));

    return (
        <form onSubmit={submit} className="space-y-5">
            <div>
                <InputLabel htmlFor="receipt_header" value="Receipt header" />
                <TextInput
                    id="receipt_header"
                    className="mt-1 block w-full"
                    value={data.receipt_header}
                    onChange={(e) => setData('receipt_header', e.target.value)}
                />
                <InputError message={errors.receipt_header} className="mt-2" />
            </div>

            <div>
                <InputLabel htmlFor="receipt_footer" value="Receipt footer" />
                <TextInput
                    id="receipt_footer"
                    className="mt-1 block w-full"
                    value={data.receipt_footer}
                    onChange={(e) => setData('receipt_footer', e.target.value)}
                />
                <InputError message={errors.receipt_footer} className="mt-2" />
            </div>

            <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-700">
                    <Checkbox
                        checked={data.receipt_show_tax}
                        onChange={(e) =>
                            setData('receipt_show_tax', e.target.checked as any)
                        }
                    />
                    Show tax breakdown on receipts
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700">
                    <Checkbox
                        checked={data.receipt_show_logo}
                        onChange={(e) =>
                            setData('receipt_show_logo', e.target.checked as any)
                        }
                    />
                    Print logo on receipts
                </label>
            </div>

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
