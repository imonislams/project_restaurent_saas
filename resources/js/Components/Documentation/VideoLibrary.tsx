import { useState } from 'react';
import { cn } from '@/Components/ui/cn';
import Badge from '@/Components/ui/Badge';
import { VideoPlayer, VideoThumb } from './VideoPlayer';
import { VIDEOS, docHref } from './content';
import type { VideoTutorial } from './types';

export default function VideoLibrary({ limit }: { limit?: number }) {
    const [activeVideo, setActiveVideo] = useState<VideoTutorial | null>(null);
    const [category, setCategory] = useState<string>('All');

    const categories = ['All', ...Array.from(new Set(VIDEOS.map((video) => video.category)))];
    const filtered = category === 'All' ? VIDEOS : VIDEOS.filter((video) => video.category === category);
    const videos = typeof limit === 'number' ? filtered.slice(0, limit) : filtered;

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3.5 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-100">
                    <Badge tone="success" dot={false}>
                        Recorded walkthroughs
                    </Badge>
                    Captured from the live demo restaurant
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-emerald-900/80 dark:text-emerald-100/80">
                    Each clip shows the real screens, with play, pause, seek, chapters, replay and fullscreen.
                    Videos are served from this application, not an external host.
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {categories.map((item) => (
                    <button
                        key={item}
                        type="button"
                        onClick={() => setCategory(item)}
                        className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                            category === item
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {videos.map((video) => (
                    <div key={video.id} id={video.id} className="scroll-mt-24 space-y-1.5">
                        <VideoThumb video={video} onPlay={() => setActiveVideo(video)} />
                        <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                            <span>{video.chapters.length} chapters</span>
                            <a href={docHref(video.guideSlug)} className="font-medium text-primary hover:underline">
                                Read the guide →
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            <VideoPlayer video={activeVideo} onClose={() => setActiveVideo(null)} />
        </div>
    );
}
