import Icon from '@/Components/Icon';
import Modal from '@/Components/Modal';

export default function KeyboardShortcutsModal({
    show,
    onClose,
}: {
    show: boolean;
    onClose: () => void;
}) {
    const shortcuts = [
        {
            category: 'Global Navigation',
            items: [
                { keys: ['⌘', 'K'], desc: 'Global Quick Search / Command' },
                { keys: ['?'], desc: 'Toggle Keyboard Shortcuts' },
                { keys: ['Esc'], desc: 'Close dialog, drawer or overlay' },
            ],
        },
        {
            category: 'POS Terminal',
            items: [
                { keys: ['F2'], desc: 'Focus product search bar' },
                { keys: ['F4'], desc: 'Open checkout payment modal' },
                { keys: ['Esc'], desc: 'Cancel payment / dismiss modal' },
            ],
        },
        {
            category: 'Kitchen Display (KDS)',
            items: [
                { keys: ['F'], desc: 'Toggle full-screen display mode' },
                { keys: ['R'], desc: 'Refresh / synchronize live tickets' },
            ],
        },
    ];

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon name="terminal" className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Keyboard Shortcuts</h3>
                            <p className="text-xs text-gray-500">Speed up your daily restaurant workflow</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
                    >
                        <span className="sr-only">Close</span>
                        ✕
                    </button>
                </div>

                <div className="mt-5 space-y-6">
                    {shortcuts.map((section) => (
                        <div key={section.category}>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2.5">
                                {section.category}
                            </h4>
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-gray-50/50">
                                {section.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                        <span className="font-medium text-gray-700">{item.desc}</span>
                                        <div className="flex items-center gap-1">
                                            {item.keys.map((k, kidx) => (
                                                <kbd
                                                    key={kidx}
                                                    className="inline-flex min-w-[20px] items-center justify-center rounded border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] font-semibold text-gray-800 shadow-subtle"
                                                >
                                                    {k}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
