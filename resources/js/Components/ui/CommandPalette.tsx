import Icon, { IconName } from '@/Components/Icon';
import Modal from '@/Components/Modal';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface CommandItem {
    id: string;
    label: string;
    category: string;
    href: string;
    icon: IconName;
    keywords?: string;
}

export default function CommandPalette({
    show,
    onClose,
    items,
}: {
    show: boolean;
    onClose: () => void;
    items: CommandItem[];
}) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (show) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [show]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.label.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q) ||
                (item.keywords && item.keywords.toLowerCase().includes(q)),
        );
    }, [items, query]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [filtered.length]);

    const selectItem = (item: CommandItem) => {
        onClose();
        router.visit(item.href);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
        } else if (e.key === 'Enter' && filtered[selectedIndex]) {
            e.preventDefault();
            selectItem(filtered[selectedIndex]);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="overflow-hidden rounded-xl bg-white shadow-elevated" onKeyDown={handleKeyDown}>
                <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                    <Icon name="search" className="h-5 w-5 text-gray-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a command or jump to page..."
                        className="w-full border-0 bg-transparent p-0 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                    />
                    <kbd className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">
                        ESC
                    </kbd>
                </div>

                <div className="max-h-80 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500">
                            No matching actions or pages found for "{query}".
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {filtered.map((item, idx) => {
                                const isSelected = idx === selectedIndex;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => selectItem(item)}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs transition ${
                                            isSelected
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-foreground hover:bg-muted'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted text-muted-foreground'
                                                }`}
                                            >
                                                <Icon name={item.icon} className="h-4 w-4" />
                                            </div>
                                            <span className="truncate font-medium">{item.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[11px] text-muted-foreground">{item.category}</span>
                                            {isSelected && (
                                                <span className="text-[10px] font-semibold text-primary">↵ Jump</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-4 py-2 text-[11px] text-gray-500">
                    <div className="flex items-center gap-3">
                        <span>↑↓ to navigate</span>
                        <span>↵ to select</span>
                    </div>
                    <span>Touch Dine Command Palette</span>
                </div>
            </div>
        </Modal>
    );
}
