import Icon from '@/Components/Icon';
import type { IconName } from '@/Components/Icon';
import Badge from './Badge';
import type { BadgeTone } from './Badge';

/**
 * Turns an audit action key (e.g. `subscription.plan_changed`) into a readable
 * label with a colour that reflects what happened, so activity/audit lists are
 * understandable at a glance.
 */

const EXPLICIT: Record<string, string> = {
    'platform.tenants_exported': 'Tenants exported',
    'subscription.cancel_scheduled': 'Cancellation scheduled',
    'subscription.grace_started': 'Grace period started',
    'subscription.past_due': 'Became past due',
    'platform.gateway_default': 'Default gateway changed',
    'platform.admin_session_revoked': 'Admin sessions revoked',
    'platform.failed_jobs_retried_all': 'All failed jobs retried',
    'platform.email_settings_updated': 'Email settings updated',
    'platform.maintenance_updated': 'Maintenance mode updated',
    'platform.email_template_updated': 'Email template updated',
    'platform.email_template_reset': 'Email template reset',
    'platform.command_ran': 'Command run',
    'user.manager_pin_set': 'Manager PIN set',
    'user.manager_pin_cleared': 'Manager PIN cleared',
    goods_received: 'Goods received',
};

const VERB_TONE: Record<string, BadgeTone> = {
    // Positive / completed
    created: 'success', verified: 'success', paid: 'success', activated: 'success', reactivated: 'success',
    approved: 'success', completed: 'success', settled: 'success', renewed: 'success', succeeded: 'success',
    accepted: 'success', received: 'success', restored: 'success', recorded: 'success',
    // Neutral / informational
    updated: 'info', changed: 'info', started: 'info', submitted: 'info', assigned: 'info', applied: 'info',
    sent: 'info', reprinted: 'info', initiated: 'info', dispatched: 'info', queued: 'info', toggled: 'info',
    // Caution
    suspended: 'warning', expired: 'warning', past_due: 'warning', cancelled: 'warning', deactivated: 'warning',
    archived: 'warning', revoked: 'warning', rejected: 'warning', voided: 'warning', requested: 'warning',
    // Negative
    failed: 'danger', deleted: 'danger', purged: 'danger', wiped: 'danger',
};

const DOMAIN_ICON: Record<string, IconName> = {
    subscription: 'crown', plan: 'tag', tenant: 'building', backup: 'database', restore: 'refresh',
    gateway: 'credit-card', payment: 'credit-card', refund: 'refresh', staff: 'users', admin: 'users',
    user: 'user', order: 'cart', invoice: 'file', coupon: 'tag', campaign: 'envelope',
    announcement: 'megaphone', support: 'ticket', email: 'envelope', command: 'terminal',
    expense: 'wallet', account: 'wallet', stock: 'cube', transfer: 'transfer', waste: 'trash',
    kitchen: 'fire', table: 'table', impersonation: 'shield', security: 'shield', role: 'key',
};

function humanize(action: string): string {
    const tokens = action.replace(/^platform\./, '').split(/[._]/).filter(Boolean);
    if (tokens.length === 0) return action;
    return tokens
        .map((token, index) => (index === 0 ? token.charAt(0).toUpperCase() + token.slice(1) : token))
        .join(' ');
}

export function describeAction(action: string): { label: string; tone: BadgeTone; icon?: IconName } {
    const parts = action.split(/[._]/).filter(Boolean);
    const verb = parts[parts.length - 1] ?? '';
    const domain = parts[0] ?? '';

    return {
        label: EXPLICIT[action] ?? humanize(action),
        tone: VERB_TONE[verb] ?? 'neutral',
        icon: DOMAIN_ICON[domain],
    };
}

export default function ActivityBadge({ action, showIcon = false, className }: { action: string; showIcon?: boolean; className?: string }) {
    const { label, tone, icon } = describeAction(action);

    return (
        <Badge tone={tone} className={className}>
            {showIcon && icon ? <Icon name={icon} className="h-3 w-3" /> : null}
            {label}
        </Badge>
    );
}
