export type DemoStatus = 'none' | 'pending' | 'running' | 'completed' | 'failed' | 'removed';

/**
 * Demo workspace state shared with every authenticated page (see
 * HandleInertiaRequests). `counts` accumulates while the workspace is built.
 */
export interface DemoState {
    status: DemoStatus;
    has_data: boolean;
    batch_id?: number;
    days: number;
    steps_total?: number;
    steps_done?: number;
    percent?: number;
    next_label?: string | null;
    counts?: Record<string, number | string | null>;
    error?: string | null;
    records?: number;
    currency?: string;
    profile?: string;
    started_at?: string | null;
    completed_at?: string | null;
    removed_at?: string | null;
}
