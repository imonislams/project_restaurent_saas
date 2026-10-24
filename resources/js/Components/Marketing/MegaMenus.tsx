import { NavigationMenuContent, NavigationMenuItem, NavigationMenuTrigger } from '@/Components/ui/navigation-menu';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { PRODUCT_GROUPS, PRODUCTS, SOLUTION_WORKFLOWS } from './Catalog/catalog';
import { trackConversion } from './Telemetry';

const TRIGGER = 'text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 data-[state=open]:bg-stone-50';
const ITEM = 'group flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-stone-50 focus:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]';
const ICON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700 transition-colors group-hover:bg-[#EC3013]/10 group-hover:text-[#EC3013]';

const track = (kind: 'product' | 'solution', slug: string) => trackConversion('nav_cta_clicked', { location: `nav_${kind}`, [kind]: slug });

export function ProductsMenu({ isActive }: { isActive: boolean }) {
    return (
        <NavigationMenuItem>
            <NavigationMenuTrigger className={`${TRIGGER} ${isActive ? 'text-[#EC3013]' : ''}`} onPointerEnter={() => undefined}>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
                <div className="w-[820px] max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
                    <div className="grid grid-cols-3 gap-x-4">
                        {PRODUCT_GROUPS.map((g) => (
                            <div key={g}>
                                <div className="px-2.5 pb-2 text-[13px] font-extrabold uppercase tracking-wider text-stone-500">{g}</div>
                                {PRODUCTS.filter((p) => p.group === g).map((p) => (
                                    <Link key={p.slug} href={`/products/${p.slug}`} className={ITEM} onClick={() => track('product', p.slug)}>
                                        <span className={ICON}><p.icon className="h-4 w-4" /></span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">{p.name}</span>
                                            <span className="mt-0.5 block text-[13px] leading-snug text-stone-600">{p.short}</span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
                        <Link href="/features" className="px-2.5 text-[13px] font-semibold text-stone-600 hover:text-stone-900">POS, cash, expenses, purchasing &amp; customers →</Link>
                        <Link href="/products" onClick={() => trackConversion('nav_cta_clicked', { location: 'nav_products_all' })} className="flex items-center gap-1 text-[14px] font-bold text-[#EC3013] hover:underline">Explore all products <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                </div>
            </NavigationMenuContent>
        </NavigationMenuItem>
    );
}

const TYPES: [string, string, string][] = [
    ['restaurants', 'Full-service restaurants', 'Table service and floor pacing'],
    ['cafes', 'Cafés & bakeries', 'Fast counter checkout'],
    ['quick-service-restaurants', 'Quick service', 'High-throughput counters'],
    ['cloud-kitchens', 'Cloud kitchens', 'Delivery-first kitchens'],
    ['takeaway-delivery', 'Takeaway & delivery', 'Pickup and delivery zones'],
    ['multi-location-restaurants', 'Multi-location groups', 'Several branches, one account'],
];

export function SolutionsMenu({ isActive }: { isActive: boolean }) {
    return (
        <NavigationMenuItem>
            <NavigationMenuTrigger className={`${TRIGGER} ${isActive ? 'text-[#EC3013]' : ''}`}>Solutions</NavigationMenuTrigger>
            <NavigationMenuContent>
                <div className="w-[760px] max-w-[calc(100vw-2rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-lg">
                    <div className="grid grid-cols-[1.4fr_1fr] gap-x-5">
                        <div>
                            <div className="px-2.5 pb-2 text-[13px] font-extrabold uppercase tracking-wider text-stone-500">By problem or workflow</div>
                            {SOLUTION_WORKFLOWS.map((s) => (
                                <Link key={s.slug} href={`/solutions/${s.slug}`} className={ITEM} onClick={() => track('solution', s.slug)}>
                                    <span className={ICON}><s.icon className="h-4 w-4" /></span>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">{s.name}</span>
                                        <span className="mt-0.5 block text-[13px] leading-snug text-stone-600">{s.short}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                        <div className="border-l border-stone-100 pl-4">
                            <div className="px-2.5 pb-2 text-[13px] font-extrabold uppercase tracking-wider text-stone-500">By business type</div>
                            {TYPES.map(([slug, name, d]) => (
                                <Link key={slug} href={`/solutions/${slug}`} className={ITEM} onClick={() => track('solution', slug)}>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">{name}</span>
                                        <span className="mt-0.5 block text-[13px] leading-snug text-stone-600">{d}</span>
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="mt-3 flex justify-end border-t border-stone-100 pt-3">
                        <Link href="/solutions" onClick={() => trackConversion('nav_cta_clicked', { location: 'nav_solutions_all' })} className="flex items-center gap-1 text-[14px] font-bold text-[#EC3013] hover:underline">All solutions <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                </div>
            </NavigationMenuContent>
        </NavigationMenuItem>
    );
}

/** Mobile navigation: collapsible groups using native details/summary (keyboard and touch friendly). */
export function MobileGroups({ onNavigate }: { onNavigate: () => void }) {
    const link = 'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[15px] font-medium text-stone-700 hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]';
    return (
        <div className="space-y-1">
            <details className="group rounded-lg">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-semibold text-stone-900 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">Products<span className="text-stone-400 transition-transform group-open:rotate-90" aria-hidden>›</span></summary>
                <div className="pb-1 pl-2">
                    {PRODUCTS.map((p) => <Link key={p.slug} href={`/products/${p.slug}`} onClick={onNavigate} className={link}><p.icon className="h-4 w-4 text-stone-500" />{p.name}</Link>)}
                    <Link href="/products" onClick={onNavigate} className={`${link} font-bold text-[#EC3013]`}>Explore all products</Link>
                </div>
            </details>
            <details className="group rounded-lg">
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-semibold text-stone-900 hover:bg-stone-50 [&::-webkit-details-marker]:hidden">Solutions<span className="text-stone-400 transition-transform group-open:rotate-90" aria-hidden>›</span></summary>
                <div className="pb-1 pl-2">
                    {SOLUTION_WORKFLOWS.map((s) => <Link key={s.slug} href={`/solutions/${s.slug}`} onClick={onNavigate} className={link}><s.icon className="h-4 w-4 text-stone-500" />{s.name}</Link>)}
                    {TYPES.map(([slug, name]) => <Link key={slug} href={`/solutions/${slug}`} onClick={onNavigate} className={`${link} pl-9`}>{name}</Link>)}
                    <Link href="/solutions" onClick={onNavigate} className={`${link} font-bold text-[#EC3013]`}>All solutions</Link>
                </div>
            </details>
        </div>
    );
}
