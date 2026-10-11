import { useMemo } from 'react';

export interface PasswordStrengthMeterProps {
    password?: string;
    showRequirements?: boolean;
}

export default function PasswordStrengthMeter({
    password = '',
    showRequirements = true,
}: PasswordStrengthMeterProps) {
    const analysis = useMemo(() => {
        const hasMinLength = password.length >= 8;
        const hasUpperAndLower =
            /[a-z]/.test(password) && /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);

        let score = 0;
        if (hasMinLength) score += 1;
        if (hasUpperAndLower) score += 1;
        if (hasNumber) score += 1;
        if (hasSpecial) score += 1;

        if (password.length === 0) score = 0;

        return {
            score,
            hasMinLength,
            hasUpperAndLower,
            hasNumber,
            hasSpecial,
        };
    }, [password]);

    if (!password) {
        return null;
    }

    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const activeLabel = labels[Math.max(0, analysis.score - 1)] || 'Weak';

    const getSegmentColor = (index: number) => {
        if (index >= analysis.score) return 'bg-stone-200';
        if (analysis.score === 1) return 'bg-red-500';
        if (analysis.score === 2) return 'bg-amber-500';
        if (analysis.score === 3) return 'bg-emerald-500';
        return 'bg-emerald-700';
    };

    const getLabelColor = () => {
        if (analysis.score === 1) return 'text-red-600';
        if (analysis.score === 2) return 'text-amber-600';
        if (analysis.score === 3) return 'text-emerald-600';
        return 'text-emerald-700 font-semibold';
    };

    return (
        <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
                <span className="text-stone-500">Password strength</span>
                <span className={getLabelColor()}>{activeLabel}</span>
            </div>

            {/* 4 segments */}
            <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                <div
                    className={`rounded-full transition-all duration-200 ${getSegmentColor(
                        0,
                    )}`}
                />
                <div
                    className={`rounded-full transition-all duration-200 ${getSegmentColor(
                        1,
                    )}`}
                />
                <div
                    className={`rounded-full transition-all duration-200 ${getSegmentColor(
                        2,
                    )}`}
                />
                <div
                    className={`rounded-full transition-all duration-200 ${getSegmentColor(
                        3,
                    )}`}
                />
            </div>

            {showRequirements && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px] text-stone-500">
                    <div
                        className={`flex items-center gap-1.5 ${
                            analysis.hasMinLength ? 'text-emerald-700' : ''
                        }`}
                    >
                        <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                                analysis.hasMinLength
                                    ? 'bg-emerald-600'
                                    : 'bg-stone-300'
                            }`}
                        />
                        At least 8 characters
                    </div>
                    <div
                        className={`flex items-center gap-1.5 ${
                            analysis.hasUpperAndLower ? 'text-emerald-700' : ''
                        }`}
                    >
                        <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                                analysis.hasUpperAndLower
                                    ? 'bg-emerald-600'
                                    : 'bg-stone-300'
                            }`}
                        />
                        Upper & lowercase
                    </div>
                    <div
                        className={`flex items-center gap-1.5 ${
                            analysis.hasNumber ? 'text-emerald-700' : ''
                        }`}
                    >
                        <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                                analysis.hasNumber
                                    ? 'bg-emerald-600'
                                    : 'bg-stone-300'
                            }`}
                        />
                        At least 1 number
                    </div>
                    <div
                        className={`flex items-center gap-1.5 ${
                            analysis.hasSpecial ? 'text-emerald-700' : ''
                        }`}
                    >
                        <span
                            className={`inline-block w-1.5 h-1.5 rounded-full ${
                                analysis.hasSpecial
                                    ? 'bg-emerald-600'
                                    : 'bg-stone-300'
                            }`}
                        />
                        Special character
                    </div>
                </div>
            )}
        </div>
    );
}
