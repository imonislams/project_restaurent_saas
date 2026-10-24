import { SVGAttributes } from 'react';

/**
 * Touch Dine brand mark: a 2x2 grid of squares with the top-right square in
 * brand red. `tone="ink"` is for light backgrounds, `tone="paper"` for dark ones.
 */
export default function ApplicationLogo({
    className = 'w-9 h-9',
    tone = 'ink',
    ...props
}: SVGAttributes<SVGSVGElement> & { tone?: 'ink' | 'paper' }) {
    const base = tone === 'paper' ? '#F3F2F2' : '#201E1D';

    return (
        <svg
            viewBox="0 0 54 54"
            xmlns="http://www.w3.org/2000/svg"
            className={`td-mark ${className}`}
            role="img"
            aria-label="Touch Dine"
            {...props}
        >
            <rect className="td-sq" x="0" y="0" width="24" height="24" fill={base} />
            <rect className="td-sq td-sq-accent" x="30" y="0" width="24" height="24" fill="#EC3013" />
            <rect className="td-sq" x="0" y="30" width="24" height="24" fill={base} />
            <rect className="td-sq" x="30" y="30" width="24" height="24" fill={base} />
        </svg>
    );
}
