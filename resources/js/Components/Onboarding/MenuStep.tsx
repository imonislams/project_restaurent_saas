import StepFooter from '@/Components/Onboarding/StepFooter';
import { FormSection, TextField } from '@/Components/ui';
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function MenuStep({ form }: { form: Record<string, any> }) {
    const { data, setData, post, processing, errors } = useForm({
        category_name: form.category_name ?? '',
        product_name: form.product_name ?? '',
        price: String(form.price ?? ''),
        cost_price: String(form.cost_price ?? ''),
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.menu'));
    };

    return (
        <form onSubmit={submit} className="space-y-5">
            <FormSection title="Add your first item" description="Create one product now so you can ring up a test sale. Add the rest later.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField
                        label="Category (optional)"
                        value={data.category_name}
                        placeholder="e.g. Starters"
                        error={errors.category_name}
                        onChange={(v) => setData('category_name', v)}
                    />
                    <TextField
                        label="Product name"
                        value={data.product_name}
                        placeholder="e.g. Chicken Biryani"
                        required
                        error={errors.product_name}
                        onChange={(v) => setData('product_name', v)}
                    />
                    <TextField
                        label="Selling price"
                        type="number"
                        value={data.price}
                        placeholder="0.00"
                        required
                        error={errors.price}
                        onChange={(v) => setData('price', v)}
                    />
                    <TextField
                        label="Cost price (optional)"
                        type="number"
                        value={data.cost_price}
                        placeholder="0.00"
                        error={errors.cost_price}
                        onChange={(v) => setData('cost_price', v)}
                    />
                </div>
            </FormSection>
            <StepFooter processing={processing} onSkip={() => post(route('onboarding.skip', 'menu'))} />
        </form>
    );
}
