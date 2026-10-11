import BranchStep from '@/Components/Onboarding/BranchStep';
import CompanyStep from '@/Components/Onboarding/CompanyStep';
import HoursStep from '@/Components/Onboarding/HoursStep';
import ReceiptStep from '@/Components/Onboarding/ReceiptStep';
import ReviewStep from '@/Components/Onboarding/ReviewStep';
import TaxStep from '@/Components/Onboarding/TaxStep';
import OnboardingLayout from '@/Layouts/OnboardingLayout';
import { OnboardingOptions, OnboardingProgress } from '@/types/onboarding';

export default function OnboardingShow({
    step,
    progress,
    form,
    options,
}: {
    step: string;
    progress: OnboardingProgress;
    form: Record<string, any>;
    options: OnboardingOptions;
}) {
    const current = progress.steps.find((s) => s.value === step);

    const renderStep = () => {
        switch (step) {
            case 'company':
                return <CompanyStep form={form} options={options} />;
            case 'branch':
                return <BranchStep form={form} options={options} />;
            case 'hours':
                return <HoursStep form={form} options={options} />;
            case 'tax':
                return <TaxStep form={form} options={options} />;
            case 'receipt':
                return <ReceiptStep form={form} options={options} />;
            case 'review':
                return <ReviewStep progress={progress} />;
            default:
                return null;
        }
    };

    return (
        <OnboardingLayout
            step={step}
            progress={progress}
            title={current?.label ?? 'Setup'}
            description={current?.description}
        >
            {renderStep()}
        </OnboardingLayout>
    );
}
