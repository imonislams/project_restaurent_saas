import { ReactNode } from 'react';

/**
 * Documentation is standalone: no app sidebar, no marketing navigation, no
 * sign-in prompts. Only the documentation header and its own navigation render.
 */
export default function DocsShell({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur">
                <div className="mx-auto flex h-12 max-w-[1440px] items-center gap-2.5 px-4 sm:px-6">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                        TD
                    </span>
                    <span className="text-sm font-semibold tracking-tight text-foreground">Touch Dine</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-sm text-muted-foreground">Documentation</span>
                </div>
            </header>

            <main>{children}</main>
        </div>
    );
}
