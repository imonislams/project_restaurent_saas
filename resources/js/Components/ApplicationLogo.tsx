import { SVGAttributes } from 'react';

/**
 * Touch Dine Application Brand Mark (SVG).
 * Bold 'TD' monogram on a squircle — used throughout app shells, headers,
 * and guest authentication layouts.
 */
export default function ApplicationLogo({
    className = 'w-9 h-9',
    ...props
}: SVGAttributes<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            {/* Rounded Squircle Brand Container */}
            <rect width="64" height="64" rx="16" fill="#B53014" />
            <rect
                x="1"
                y="1"
                width="62"
                height="62"
                rx="15"
                stroke="#9E2A11"
                strokeWidth="1.5"
                strokeOpacity="0.75"
            />

            {/* Ambient culinary glow */}
            <circle cx="32" cy="30" r="24" fill="#FFFFFF" fillOpacity="0.1" />

            {/* T — crossbar */}
            <rect x="10" y="17" width="20" height="7" rx="3.5" fill="#FFFFFF" />

            {/* T — stem */}
            <rect x="16.5" y="17" width="7" height="30" rx="3.5" fill="#FFFFFF" />

            {/* D — stem */}
            <rect x="35" y="17" width="7" height="30" rx="3.5" fill="#FFFFFF" />

            {/* D — bowl */}
            <path
                d="M42 17C49 17 55 22 55 32C55 42 49 47 42 47V40C46 40 48 36.5 48 32C48 27.5 46 24 42 24V17Z"
                fill="#FFFFFF"
            />

            {/* Digital service pulse dot */}
            <circle cx="45" cy="32" r="2" fill="#FFFFFF" fillOpacity="0.9" />
        </svg>
    );
}
