import React, { FC } from 'react';
import {
    Activity,
    AlertTriangle,
    ArrowLeftRight,
    BarChart3,
    Bell,
    BookOpen,
    Box,
    Building2,
    ChevronRight,
    ChevronLeft,
    Check,
    Clock,
    CreditCard,
    Crown,
    Database,
    Download,
    FileText,
    Filter,
    Flag,
    Flame,
    Key,
    LayoutGrid,
    LogOut,
    LucideProps,
    Mail,
    Megaphone,
    Menu,
    MoreHorizontal,
    Plus,
    QrCode,
    Receipt,
    RefreshCw,
    Server,
    Settings,
    Shield,
    ShoppingCart,
    SlidersHorizontal,
    Store,
    Terminal,
    Ticket,
    Tag,
    Trash2,
    Truck,
    User,
    Users,
    UtensilsCrossed,
    Wallet,
    X,
} from 'lucide-react';

export type IconName =
    | 'grid' | 'cart' | 'receipt' | 'fire' | 'table' | 'book' | 'cube' | 'truck'
    | 'trash' | 'transfer' | 'wallet' | 'chart' | 'users' | 'user' | 'cog'
    | 'crown' | 'bell' | 'search' | 'menu' | 'logout' | 'chevron' | 'store'
    | 'shield' | 'database' | 'envelope' | 'credit-card' | 'server' | 'clock'
    | 'alert' | 'download' | 'plus' | 'filter' | 'dots' | 'building' | 'key'
    | 'activity' | 'sliders' | 'ticket' | 'tag' | 'file' | 'refresh' | 'flag'
    | 'terminal' | 'megaphone' | 'qr' | 'check' | 'x' | 'chevron-left';

const ICON_MAP: Record<IconName, FC<LucideProps>> = {
    grid: LayoutGrid,
    cart: ShoppingCart,
    receipt: Receipt,
    fire: Flame,
    table: UtensilsCrossed,
    book: BookOpen,
    cube: Box,
    truck: Truck,
    trash: Trash2,
    transfer: ArrowLeftRight,
    wallet: Wallet,
    chart: BarChart3,
    users: Users,
    user: User,
    cog: Settings,
    crown: Crown,
    bell: Bell,
    search: (props) => <Activity {...props} />, // Will be dynamically mapped
    menu: Menu,
    logout: LogOut,
    chevron: ChevronRight,
    store: Store,
    shield: Shield,
    database: Database,
    envelope: Mail,
    'credit-card': CreditCard,
    server: Server,
    clock: Clock,
    alert: AlertTriangle,
    download: Download,
    plus: Plus,
    filter: Filter,
    dots: MoreHorizontal,
    building: Building2,
    key: Key,
    activity: Activity,
    sliders: SlidersHorizontal,
    ticket: Ticket,
    tag: Tag,
    file: FileText,
    refresh: RefreshCw,
    flag: Flag,
    terminal: Terminal,
    megaphone: Megaphone,
    qr: QrCode,
    check: Check,
    x: X,
    'chevron-left': ChevronLeft,
};

// Fix search icon mapping
import { Search } from 'lucide-react';
ICON_MAP.search = Search;

export interface IconProps extends LucideProps {
    name: IconName;
    className?: string;
}

export default function Icon({
    name,
    className = 'h-5 w-5',
    strokeWidth = 1.75,
    ...rest
}: IconProps) {
    const Component = ICON_MAP[name];
    if (!Component) {
        return null;
    }
    return <Component className={className} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}
