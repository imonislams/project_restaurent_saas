export interface OnboardingStepInfo {
    value: string;
    label: string;
    description: string;
    required: boolean;
    optional: boolean;
    complete: boolean;
}

export interface OnboardingProgress {
    percent: number;
    completed: number;
    total: number;
    steps: OnboardingStepInfo[];
}

export interface OnboardingOptions {
    countries: { value: string; label: string }[];
    currencies: { value: string; label: string; symbol?: string }[];
    timezones: { value: string; label: string }[];
    service_types: { value: string; label: string }[];
}
