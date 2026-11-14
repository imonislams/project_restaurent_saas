import { useEffect, useRef, useState } from 'react';
import { Maximize, Pause, Play, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/Dialog';
import { cn } from '@/Components/ui/cn';
import Badge from '@/Components/ui/Badge';
import { formatDuration } from './content/videos';
import type { VideoTutorial } from './types';

export function VideoThumb({ video, onPlay }: { video: VideoTutorial; onPlay: () => void }) {
    return (
        <button
            type="button"
            onClick={onPlay}
            className="group block w-full overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Play ${video.title}`}
        >
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                <img
                    src={video.poster}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/50 backdrop-blur-sm transition-transform group-hover:scale-110">
                        <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                    </span>
                </div>

                <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                    {video.module}
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">
                    {formatDuration(video.duration)}
                </span>
            </div>

            <div className="space-y-1 px-3 py-2.5">
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{video.title}</p>
                <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {video.description}
                </p>
            </div>
        </button>
    );
}

export function VideoPlayer({
    video,
    onClose,
}: {
    video: VideoTutorial | null;
    onClose: () => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [current, setCurrent] = useState(0);
    const [duration, setDuration] = useState(video?.duration ?? 0);

    useEffect(() => {
        setPlaying(false);
        setCurrent(0);
        setDuration(video?.duration ?? 0);
    }, [video?.id, video?.duration]);

    if (!video) {
        return null;
    }

    const toggle = () => {
        const element = videoRef.current;
        if (!element) {
            return;
        }
        if (element.paused) {
            void element.play();
        } else {
            element.pause();
        }
    };

    const seek = (seconds: number) => {
        const element = videoRef.current;
        if (!element) {
            return;
        }
        element.currentTime = seconds;
        setCurrent(seconds);
    };

    const replay = () => {
        seek(0);
        void videoRef.current?.play();
    };

    const toggleFullscreen = () => {
        const stage = stageRef.current;
        if (!stage) {
            return;
        }
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void stage.requestFullscreen?.();
        }
    };

    const activeChapterIndex = video.chapters.reduce(
        (found, chapter, index) => (current >= chapter.at ? index : found),
        0
    );
    const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

    return (
        <Dialog open={Boolean(video)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[92vh] max-w-4xl gap-3 overflow-y-auto p-4 sm:p-5">
                <DialogHeader>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="success" dot={false}>
                            Recorded walkthrough
                        </Badge>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                            {video.module}
                        </span>
                    </div>
                    <DialogTitle className="pr-8 text-base">{video.title}</DialogTitle>
                    <DialogDescription>{video.description}</DialogDescription>
                </DialogHeader>

                <div
                    ref={stageRef}
                    className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-black"
                >
                    <video
                        ref={videoRef}
                        src={video.src}
                        poster={video.poster}
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-contain"
                        onClick={toggle}
                        onPlay={() => setPlaying(true)}
                        onPause={() => setPlaying(false)}
                        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
                        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
                        onEnded={() => setPlaying(false)}
                    />

                    {!playing && (
                        <button
                            type="button"
                            onClick={toggle}
                            className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors hover:bg-black/35"
                            aria-label="Play video"
                        >
                            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white ring-1 ring-white/50 backdrop-blur-sm">
                                <Play className="ml-1 h-6 w-6" fill="currentColor" />
                            </span>
                        </button>
                    )}

                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-6">
                        <input
                            type="range"
                            min={0}
                            max={Math.max(duration, 1)}
                            step={0.1}
                            value={Math.min(current, duration || 0)}
                            onChange={(event) => seek(Number(event.target.value))}
                            className="h-1.5 w-full cursor-pointer accent-white"
                            aria-label="Seek timeline"
                        />
                        <div className="mt-1.5 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={toggle}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                                aria-label={playing ? 'Pause' : 'Play'}
                            >
                                {playing ? (
                                    <Pause className="h-3.5 w-3.5" />
                                ) : (
                                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={replay}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                                aria-label="Replay"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-[11px] font-medium tabular-nums text-white/90">
                                {formatDuration(current)} / {formatDuration(duration || video.duration)}
                            </span>
                            <div className="relative mx-1 hidden h-1 flex-1 overflow-hidden rounded-full bg-white/25 sm:block">
                                <div className="h-full bg-white" style={{ width: `${progress}%` }} />
                            </div>
                            <button
                                type="button"
                                onClick={toggleFullscreen}
                                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25"
                                aria-label="Fullscreen"
                            >
                                <Maximize className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Chapters
                        </p>
                        <ol className="mt-1.5 space-y-0.5">
                            {video.chapters.map((chapter, index) => (
                                <li key={chapter.at}>
                                    <button
                                        type="button"
                                        onClick={() => seek(chapter.at)}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded px-1.5 py-1 text-left text-[11px] transition-colors',
                                            index === activeChapterIndex
                                                ? 'bg-primary/10 font-semibold text-primary'
                                                : 'text-foreground/80 hover:bg-muted'
                                        )}
                                    >
                                        <span className="tabular-nums text-muted-foreground">
                                            {formatDuration(chapter.at)}
                                        </span>
                                        <span className="truncate">{chapter.label}</span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Related material
                        </p>
                        <div className="mt-2 space-y-2 text-[11px]">
                            <a
                                href={`/docs/${video.guideSlug}`}
                                className="block rounded border border-border bg-background px-2.5 py-2 font-medium text-foreground hover:border-primary/40 hover:text-primary"
                            >
                                Written guide: {video.module} →
                            </a>
                            <p className="rounded border border-border bg-background px-2.5 py-2 text-muted-foreground">
                                This walkthrough was captured from the live demo restaurant.
                            </p>
                            <p className="px-1 text-muted-foreground">
                                Category: <span className="font-medium text-foreground/80">{video.category}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
