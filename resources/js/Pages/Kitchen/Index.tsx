import Icon from '@/Components/Icon';
import Badge from '@/Components/ui/Badge';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

// --- Interfaces ---

interface TicketItem {
    id: number;
    name: string;
    quantity: number;
    status: string; // 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'
    station: string | null;
    notes: string | null;
    modifiers: { name: string; group_name: string | null; quantity: number }[] | null;
}

interface Ticket {
    id: number;
    status: string; // 'new' | 'accepted' | 'preparing' | 'ready' | 'served'
    priority: string; // 'normal' | 'urgent'
    notes: string | null;
    elapsed_minutes: number;
    created_at: string | null;
    order_number: string | null;
    order_type: string | null;
    order_source: string | null;
    table_name: string | null;
    customer_name: string | null;
    items: TicketItem[];
}

interface Station {
    id: number;
    name: string;
}

interface Branch {
    id: number;
    name: string;
}

// Web Audio API zero-dependency sound generator for kitchen alerts
function playKitchenChime(type: 'new_order' | 'bump' | 'urgent') {
    try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (type === 'new_order') {
            // Pleasant double kitchen bell chime
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(659.25, now); // E5
            gain1.gain.setValueAtTime(0.12, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(987.77, now + 0.12); // B5
            gain2.gain.setValueAtTime(0.15, now + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.55);
        } else if (type === 'bump') {
            // Snappy confirmation pop
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(520, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.08);
        } else if (type === 'urgent') {
            // Urgent attention tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.setValueAtTime(880, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch {
        // AudioContext blocked or not supported
    }
}

export default function KitchenIndex({
    branches,
    branchId,
    stations,
    selectedStation,
    tickets,
}: {
    branches: Branch[];
    branchId: number | null;
    stations: Station[];
    selectedStation: number | null;
    tickets: Ticket[];
    ticketStatuses: { value: string; label: string }[];
    itemStatuses: { value: string; label: string }[];
}) {
    const { auth } = usePage().props as Record<string, any>;
    const permissions: string[] = auth?.permissions ?? [];
    const canManage = permissions.includes('kitchen.manage');

    // UI Configuration & Display Preferences
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [refreshCountdown, setRefreshCountdown] = useState(12);

    // Live clock for second-by-second elapsed timers
    const [now, setNow] = useState(Date.now());
    const prevTicketCountRef = useRef<number>(tickets.length);

    // Timer tick every second
    useEffect(() => {
        const timer = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Sound chime on new incoming tickets
    useEffect(() => {
        if (soundEnabled && tickets.length > prevTicketCountRef.current) {
            playKitchenChime('new_order');
        }
        prevTicketCountRef.current = tickets.length;
    }, [tickets.length, soundEnabled]);

    // Auto-polling refresh every 12 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const countdownTimer = setInterval(() => {
            setRefreshCountdown((prev) => {
                if (prev <= 1) {
                    // Trigger silent Inertia reload
                    router.reload({
                        only: ['tickets'],
                    });
                    return 12;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdownTimer);
    }, [autoRefresh]);

    const playSound = (kind: 'new_order' | 'bump' | 'urgent') => {
        if (soundEnabled) playKitchenChime(kind);
    };

    // Filter tickets by selected station if not already filtered
    const filteredTickets = useMemo(() => {
        return tickets;
    }, [tickets]);

    // Ticket metrics
    const counts = useMemo(() => {
        const newCount = filteredTickets.filter((t) => t.status === 'new' || t.status === 'accepted').length;
        const prepCount = filteredTickets.filter((t) => t.status === 'preparing').length;
        const readyCount = filteredTickets.filter((t) => t.status === 'ready').length;
        const urgentCount = filteredTickets.filter((t) => t.priority === 'urgent').length;
        return { newCount, prepCount, readyCount, urgentCount, total: filteredTickets.length };
    }, [filteredTickets]);

    // Status action handlers
    const applyFilters = (params: Record<string, unknown>) => {
        router.get(
            route('kitchen.index'),
            { branch_id: branchId, station_id: selectedStation, ...params },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleTicketStatus = (ticket: Ticket, status: string) => {
        playSound('bump');
        router.patch(
            route('kitchen.tickets.status', ticket.id),
            { status },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleItemStatus = (item: TicketItem, status: string) => {
        playSound('bump');
        router.patch(
            route('kitchen.items.status', item.id),
            { status },
            { preserveScroll: true, preserveState: true },
        );
    };

    const handleTogglePriority = (ticket: Ticket) => {
        playSound(ticket.priority === 'urgent' ? 'bump' : 'urgent');
        router.patch(
            route('kitchen.tickets.priority', ticket.id),
            { priority: ticket.priority === 'urgent' ? 'normal' : 'urgent' },
            { preserveScroll: true, preserveState: true },
        );
    };

    // Calculate exact elapsed minutes and seconds
    const getElapsedData = (ticket: Ticket) => {
        const createdAtTime = ticket.created_at ? new Date(ticket.created_at).getTime() : 0;
        const totalSeconds = createdAtTime > 0 ? Math.max(0, Math.floor((now - createdAtTime) / 1000)) : ticket.elapsed_minutes * 60;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        let tone: 'normal' | 'warning' | 'critical' = 'normal';
        if (minutes >= 15) {
            tone = 'critical';
        } else if (minutes >= 8) {
            tone = 'warning';
        }

        const formatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        return { minutes, seconds, formatted, tone };
    };

    // Fullscreen toggle helper
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // Theme helper classes
    const themeBg = isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-100 text-gray-900';
    const headerBg = isDarkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/95 border-gray-200';
    const cardBg = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
    const colHeaderBg = isDarkMode ? 'bg-gray-900/80 border-gray-800' : 'bg-white border-gray-200';

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 select-none ${themeBg}`}>
            <Head title="Kitchen Display System · Live KDS" />

            {/* --- TOP CONTROL BAR --- */}
            <header className={`sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b px-3 sm:px-5 py-2.5 backdrop-blur-md shadow-subtle ${headerBg}`}>
                {/* Left: Branding + Branch Selector + Station Pills */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-sm shadow-subtle">
                            <Icon name="fire" className="h-5 w-5" />
                        </div>
                        <span className="font-extrabold tracking-tight text-sm sm:text-base hidden sm:inline">
                            Live KDS
                        </span>
                    </div>

                    {/* Branch Dropdown */}
                    <select
                        aria-label="Select Branch"
                        value={branchId ?? ''}
                        onChange={(e) => applyFilters({ branch_id: e.target.value })}
                        className={`h-8 rounded-lg border py-1 pl-2.5 pr-8 text-xs font-semibold cursor-pointer shadow-subtle ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-amber-500'
                                : 'bg-gray-50 border-gray-300 text-gray-800 focus:border-restrly-500'
                        }`}
                    >
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>

                    {/* Station Filter Tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => applyFilters({ station_id: null })}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-subtle ${
                                selectedStation === null
                                    ? 'bg-amber-500 text-white'
                                    : isDarkMode
                                      ? 'bg-gray-800 text-gray-400 hover:text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            All Stations
                        </button>
                        {stations.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => applyFilters({ station_id: s.id })}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-subtle whitespace-nowrap ${
                                    selectedStation === s.id
                                        ? 'bg-amber-500 text-white'
                                        : isDarkMode
                                          ? 'bg-gray-800 text-gray-400 hover:text-white'
                                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center / Right: Live Counters & System Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Live Ticket Status Metrics */}
                    <div className="hidden lg:flex items-center gap-1.5 mr-2">
                        <span className="flex items-center gap-1 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500 border border-amber-500/30">
                            New: {counts.newCount}
                        </span>
                        <span className="flex items-center gap-1 rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400 border border-sky-500/30">
                            Cooking: {counts.prepCount}
                        </span>
                        <span className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                            Ready: {counts.readyCount}
                        </span>
                        {counts.urgentCount > 0 && (
                            <span className="flex items-center gap-1 rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
                                ★ Urgent: {counts.urgentCount}
                            </span>
                        )}
                    </div>

                    {/* Auto-Refresh Toggle + Pulsing indicator */}
                    <button
                        type="button"
                        onClick={() => setAutoRefresh((prev) => !prev)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold transition shadow-subtle ${
                            autoRefresh
                                ? isDarkMode
                                    ? 'bg-gray-800 border-gray-700 text-emerald-400'
                                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : 'bg-gray-200 text-gray-500'
                        }`}
                        title={autoRefresh ? `Auto-sync active (${refreshCountdown}s)` : 'Auto-sync paused'}
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                        <span className="hidden sm:inline">Sync</span>
                        <span className="font-mono text-[10px]">{refreshCountdown}s</span>
                    </button>

                    {/* Sound Alert Toggle */}
                    <button
                        type="button"
                        onClick={() => setSoundEnabled((prev) => !prev)}
                        className={`rounded-lg border p-1.5 text-xs transition shadow-subtle ${
                            soundEnabled
                                ? isDarkMode
                                    ? 'bg-gray-800 border-gray-700 text-amber-400'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-gray-200 text-gray-400'
                        }`}
                        title={soundEnabled ? 'Chime sound active' : 'Sound muted'}
                    >
                        {soundEnabled ? '🔔' : '🔕'}
                    </button>

                    {/* Dark / Light Theme Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsDarkMode((prev) => !prev)}
                        className={`rounded-lg border p-1.5 text-xs transition shadow-subtle ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-yellow-400 hover:bg-gray-700'
                                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to High-Contrast Dark Mode'}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>

                    {/* Fullscreen Button */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={`rounded-lg border p-1.5 text-xs transition shadow-subtle ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                        }`}
                        title="Toggle Fullscreen (F11)"
                    >
                        ⛶
                    </button>

                    {/* Back to POS Link */}
                    <Link
                        href={route('pos.index')}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-subtle border ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        POS →
                    </Link>
                </div>
            </header>

            {/* --- KDS BOARD: 3-COLUMN WORKFLOW --- */}
            <main className="flex-1 p-3 sm:p-4 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 items-start">
                    {/* COLUMN 1: NEW & PENDING */}
                    <KdsColumn
                        title="New Tickets"
                        dotColor="bg-amber-500"
                        badgeColor="bg-amber-500/20 text-amber-500 border border-amber-500/30"
                        tickets={filteredTickets.filter((t) => t.status === 'new' || t.status === 'accepted')}
                        isDarkMode={isDarkMode}
                        canManage={canManage}
                        getElapsedData={getElapsedData}
                        onTicketStatus={handleTicketStatus}
                        onItemStatus={handleItemStatus}
                        onTogglePriority={handleTogglePriority}
                        primaryAction={{
                            label: 'Start Preparing',
                            targetStatus: 'preparing',
                            btnClass: 'bg-amber-600 hover:bg-amber-500 text-white',
                        }}
                    />

                    {/* COLUMN 2: PREPARING / COOKING */}
                    <KdsColumn
                        title="In Preparation"
                        dotColor="bg-sky-500"
                        badgeColor="bg-sky-500/20 text-sky-400 border border-sky-500/30"
                        tickets={filteredTickets.filter((t) => t.status === 'preparing')}
                        isDarkMode={isDarkMode}
                        canManage={canManage}
                        getElapsedData={getElapsedData}
                        onTicketStatus={handleTicketStatus}
                        onItemStatus={handleItemStatus}
                        onTogglePriority={handleTogglePriority}
                        primaryAction={{
                            label: 'Mark Ready',
                            targetStatus: 'ready',
                            btnClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
                        }}
                        secondaryAction={{
                            label: '← New',
                            targetStatus: 'new',
                        }}
                    />

                    {/* COLUMN 3: READY / EXPEDITE */}
                    <KdsColumn
                        title="Ready for Pickup"
                        dotColor="bg-emerald-500"
                        badgeColor="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        tickets={filteredTickets.filter((t) => t.status === 'ready')}
                        isDarkMode={isDarkMode}
                        canManage={canManage}
                        getElapsedData={getElapsedData}
                        onTicketStatus={handleTicketStatus}
                        onItemStatus={handleItemStatus}
                        onTogglePriority={handleTogglePriority}
                        primaryAction={{
                            label: 'Serve & Bump',
                            targetStatus: 'served',
                            btnClass: 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600',
                        }}
                        secondaryAction={{
                            label: '← Prep',
                            targetStatus: 'preparing',
                        }}
                    />
                </div>
            </main>
        </div>
    );
}

// --- COLUMN COMPONENT ---

function KdsColumn({
    title,
    dotColor,
    badgeColor,
    tickets,
    isDarkMode,
    canManage,
    getElapsedData,
    onTicketStatus,
    onItemStatus,
    onTogglePriority,
    primaryAction,
    secondaryAction,
}: {
    title: string;
    dotColor: string;
    badgeColor: string;
    tickets: Ticket[];
    isDarkMode: boolean;
    canManage: boolean;
    getElapsedData: (ticket: Ticket) => { minutes: number; seconds: number; formatted: string; tone: 'normal' | 'warning' | 'critical' };
    onTicketStatus: (ticket: Ticket, status: string) => void;
    onItemStatus: (item: TicketItem, status: string) => void;
    onTogglePriority: (ticket: Ticket) => void;
    primaryAction: { label: string; targetStatus: string; btnClass: string };
    secondaryAction?: { label: string; targetStatus: string };
}) {
    const colContainerBg = isDarkMode ? 'bg-gray-900/60 border-gray-800/80' : 'bg-gray-200/50 border-gray-300/70';

    return (
        <div className={`flex flex-col rounded-2xl border p-2 sm:p-2.5 shadow-subtle ${colContainerBg}`}>
            {/* Column Header */}
            <div className="flex items-center justify-between px-2 py-2 mb-1.5">
                <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                    <span className="font-extrabold text-xs sm:text-sm tracking-tight">{title}</span>
                </div>
                <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-bold ${badgeColor}`}>
                    {tickets.length}
                </span>
            </div>

            {/* Tickets Stack */}
            <div className="space-y-3 min-h-[150px]">
                {tickets.map((ticket) => (
                    <KdsTicketCard
                        key={ticket.id}
                        ticket={ticket}
                        isDarkMode={isDarkMode}
                        canManage={canManage}
                        getElapsedData={getElapsedData}
                        onTicketStatus={onTicketStatus}
                        onItemStatus={onItemStatus}
                        onTogglePriority={onTogglePriority}
                        primaryAction={primaryAction}
                        secondaryAction={secondaryAction}
                    />
                ))}

                {tickets.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                        <svg className="h-6 w-6 text-gray-500 mb-1 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-semibold opacity-60">All clear</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- TICKET CARD COMPONENT ---

function KdsTicketCard({
    ticket,
    isDarkMode,
    canManage,
    getElapsedData,
    onTicketStatus,
    onItemStatus,
    onTogglePriority,
    primaryAction,
    secondaryAction,
}: {
    ticket: Ticket;
    isDarkMode: boolean;
    canManage: boolean;
    getElapsedData: (ticket: Ticket) => { minutes: number; seconds: number; formatted: string; tone: 'normal' | 'warning' | 'critical' };
    onTicketStatus: (ticket: Ticket, status: string) => void;
    onItemStatus: (item: TicketItem, status: string) => void;
    onTogglePriority: (ticket: Ticket) => void;
    primaryAction: { label: string; targetStatus: string; btnClass: string };
    secondaryAction?: { label: string; targetStatus: string };
}) {
    const elapsed = getElapsedData(ticket);
    const isUrgent = ticket.priority === 'urgent' || elapsed.tone === 'critical';

    // Timer pill color
    const timerToneClass =
        elapsed.tone === 'critical'
            ? 'bg-red-500 text-white animate-pulse'
            : elapsed.tone === 'warning'
              ? 'bg-amber-500 text-white'
              : isDarkMode
                ? 'bg-gray-800 text-emerald-400 border border-emerald-500/30'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300';

    // Card border / surface styling
    const cardBorderClass =
        isUrgent
            ? 'border-red-500 ring-2 ring-red-500/40 shadow-elevated'
            : isDarkMode
              ? 'border-gray-800 bg-gray-900 shadow-card hover:border-gray-700'
              : 'border-gray-200 bg-white shadow-card hover:border-gray-300';

    return (
        <div className={`rounded-xl border p-3 flex flex-col transition-all duration-150 ${cardBorderClass}`}>
            {/* Ticket Header */}
            <div className="flex items-start justify-between gap-2 border-b border-gray-100/10 pb-2.5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-sm sm:text-base font-extrabold tracking-tight">
                            {ticket.order_number}
                        </span>
                        {/* Order Destination / Table Identifier */}
                        {ticket.table_name ? (
                            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-extrabold uppercase text-amber-400 border border-amber-500/30">
                                {ticket.table_name}
                            </span>
                        ) : (
                            <span className="rounded-md bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-200">
                                {ticket.order_type}
                            </span>
                        )}
                        {ticket.order_source === 'qr' && (
                            <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                                QR
                            </span>
                        )}
                    </div>

                    {ticket.customer_name && (
                        <div className="mt-0.5 text-xs font-medium text-gray-400 truncate">
                            Guest: {ticket.customer_name}
                        </div>
                    )}
                </div>

                {/* Live Timer & Urgent Star */}
                <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold tracking-tight shadow-subtle ${timerToneClass}`}>
                        ⏱ {elapsed.formatted}
                    </span>

                    {canManage && (
                        <button
                            type="button"
                            onClick={() => onTogglePriority(ticket)}
                            className={`text-xs font-bold transition ${
                                ticket.priority === 'urgent'
                                    ? 'text-red-500 animate-pulse'
                                    : 'text-gray-500 hover:text-amber-400'
                            }`}
                            title="Toggle urgent priority"
                        >
                            {ticket.priority === 'urgent' ? '★ URGENT' : '☆ Urgent'}
                        </button>
                    )}
                </div>
            </div>

            {/* Ticket Items List */}
            <ul className="mt-2.5 space-y-1.5 flex-1 divide-y divide-gray-100/10">
                {ticket.items.map((item) => {
                    const isItemDone = item.status === 'ready' || item.status === 'served';

                    return (
                        <li
                            key={item.id}
                            className={`pt-1.5 first:pt-0 flex items-start justify-between gap-2 transition-opacity ${
                                isItemDone ? 'opacity-40' : 'opacity-100'
                            }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    {/* Large readable quantity */}
                                    <span className="font-mono text-sm sm:text-base font-extrabold text-amber-500">
                                        {item.quantity}×
                                    </span>
                                    {/* Item name */}
                                    <span
                                        className={`text-xs sm:text-sm font-bold ${
                                            isItemDone ? 'line-through' : ''
                                        }`}
                                    >
                                        {item.name}
                                    </span>
                                    {item.station && (
                                        <span className="text-[10px] text-gray-400">
                                            [{item.station}]
                                        </span>
                                    )}
                                </div>

                                {/* Modifiers / add-ons chosen by the customer or cashier */}
                                {item.modifiers && item.modifiers.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {item.modifiers.map((modifier, index) => (
                                            <span
                                                key={index}
                                                className="rounded-md bg-gray-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-gray-200"
                                            >
                                                {modifier.name}
                                                {modifier.quantity > 1 ? ` ×${modifier.quantity}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Custom Kitchen Modifiers / Preparation Notes */}
                                {item.notes && (
                                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 rounded-md px-2 py-0.5 border border-amber-500/20">
                                        <span>⚠️</span>
                                        <span className="italic">{item.notes}</span>
                                    </div>
                                )}
                            </div>

                            {/* 1-Tap Item Done / Strike Toggle */}
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onItemStatus(
                                            item,
                                            isItemDone ? 'preparing' : 'ready',
                                        )
                                    }
                                    className={`shrink-0 rounded-lg p-1 text-xs font-bold transition shadow-subtle ${
                                        isItemDone
                                            ? 'bg-emerald-600 text-white'
                                            : isDarkMode
                                              ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                    title={isItemDone ? 'Item marked ready (tap to undo)' : 'Tap to mark item ready'}
                                >
                                    {isItemDone ? '✓' : '○'}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Ticket Level Notes */}
            {ticket.notes && (
                <div className="mt-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-xs text-amber-300">
                    <span className="font-bold">Order Note: </span>
                    <span>{ticket.notes}</span>
                </div>
            )}

            {/* Ticket Footer Action Bar */}
            <div className="mt-3.5 pt-2 border-t border-gray-100/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    {/* Secondary Move Back Action */}
                    {canManage && secondaryAction && (
                        <button
                            type="button"
                            onClick={() => onTicketStatus(ticket, secondaryAction.targetStatus)}
                            className="rounded-lg border border-gray-700 bg-gray-800/80 px-2 py-1.5 text-[11px] font-bold text-gray-300 hover:bg-gray-700 hover:text-white transition shadow-subtle"
                            title="Move back to previous status"
                        >
                            {secondaryAction.label}
                        </button>
                    )}

                    {/* Print Ticket Link */}
                    <Link
                        href={route('kitchen.tickets.print', ticket.id)}
                        target="_blank"
                        className="rounded-lg border border-gray-700 bg-gray-800/80 px-2 py-1.5 text-[11px] font-semibold text-gray-300 hover:bg-gray-700 hover:text-white transition shadow-subtle"
                        title="Print paper kitchen ticket"
                    >
                        🖨 Print
                    </Link>
                </div>

                {/* Primary Move Forward Action */}
                {canManage && (
                    <button
                        type="button"
                        onClick={() => onTicketStatus(ticket, primaryAction.targetStatus)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold shadow-card active:scale-[0.98] transition ${primaryAction.btnClass}`}
                    >
                        {primaryAction.label} →
                    </button>
                )}
            </div>
        </div>
    );
}
