import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-primary text-primary font-semibold focus:border-primary'
                    : 'border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900 focus:border-stone-300 focus:text-stone-800') +
                ' ' +
                className
            }
        >
            {children}
        </Link>
    );
}
