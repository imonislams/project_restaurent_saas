import { CSSProperties, PointerEvent as ReactPointerEvent, useEffect, useRef } from 'react';
import {
    FONT_STACKS,
    PT_TO_PX,
    QrCanvas,
    QrElement,
    clampElement,
    mmToPx,
    pxToMm,
    substitute,
} from './qrCanvas';

type DragMode = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
    id: string;
    mode: DragMode;
    startX: number;
    startY: number;
    origin: QrElement;
}

const HANDLES: { mode: DragMode; className: string; cursor: string }[] = [
    { mode: 'nw', className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'nwse-resize' },
    { mode: 'n', className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2', cursor: 'ns-resize' },
    { mode: 'ne', className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2', cursor: 'nesw-resize' },
    { mode: 'e', className: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
    { mode: 'se', className: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2', cursor: 'nwse-resize' },
    { mode: 's', className: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'ns-resize' },
    { mode: 'sw', className: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2', cursor: 'nesw-resize' },
    { mode: 'w', className: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2', cursor: 'ew-resize' },
];

/**
 * Renders a card canvas. Without `interactive` it is a faithful, read-only
 * replica (used for thumbnails and the live designer surface); with it, elements
 * can be selected, dragged and resized. Only the PDF-safe vocabulary is drawn.
 */
export default function QrCardCanvas({
    canvas,
    zoom = 1,
    replace = {},
    logoUrl = null,
    assetUrls = {},
    qrSrc = null,
    selectedId = null,
    interactive = false,
    onSelect,
    onChange,
}: {
    canvas: QrCanvas;
    zoom?: number;
    replace?: Record<string, string>;
    logoUrl?: string | null;
    assetUrls?: Record<string, string>;
    qrSrc?: string | null;
    selectedId?: string | null;
    interactive?: boolean;
    onSelect?: (id: string | null) => void;
    onChange?: (id: string, patch: Partial<QrElement>) => void;
}) {
    const drag = useRef<DragState | null>(null);

    useEffect(() => {
        const move = (event: PointerEvent) => {
            const state = drag.current;
            if (!state) return;

            const dx = pxToMm(event.clientX - state.startX, zoom);
            const dy = pxToMm(event.clientY - state.startY, zoom);
            const origin = state.origin;
            const next: QrElement = { ...origin };

            switch (state.mode) {
                case 'move':
                    next.x = origin.x + dx;
                    next.y = origin.y + dy;
                    break;
                case 'e':
                    next.w = origin.w + dx;
                    break;
                case 'w':
                    next.w = origin.w - dx;
                    next.x = origin.x + dx;
                    break;
                case 's':
                    next.h = origin.h + dy;
                    break;
                case 'n':
                    next.h = origin.h - dy;
                    next.y = origin.y + dy;
                    break;
                case 'ne':
                    next.w = origin.w + dx;
                    next.h = origin.h - dy;
                    next.y = origin.y + dy;
                    break;
                case 'nw':
                    next.w = origin.w - dx;
                    next.x = origin.x + dx;
                    next.h = origin.h - dy;
                    next.y = origin.y + dy;
                    break;
                case 'se':
                    next.w = origin.w + dx;
                    next.h = origin.h + dy;
                    break;
                case 'sw':
                    next.w = origin.w - dx;
                    next.x = origin.x + dx;
                    next.h = origin.h + dy;
                    break;
            }

            const clamped = clampElement(next, canvas);

            onChange?.(state.id, { x: clamped.x, y: clamped.y, w: clamped.w, h: clamped.h });
        };

        const up = () => {
            drag.current = null;
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);

        return () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
    }, [onChange, zoom, canvas]);

    const begin = (event: ReactPointerEvent, element: QrElement, mode: DragMode) => {
        if (!interactive) return;

        event.stopPropagation();
        event.preventDefault();
        onSelect?.(element.id);
        drag.current = { id: element.id, mode, startX: event.clientX, startY: event.clientY, origin: { ...element } };
    };

    const imageSource = (element: QrElement): string | null => {
        if (element.props.source === 'path') {
            return element.props.path ? assetUrls[element.props.path] ?? null : null;
        }

        return logoUrl;
    };

    const renderVisual = (element: QrElement) => {
        const { props } = element;

        switch (element.type) {
            case 'rect':
            case 'ellipse':
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            background: props.fill,
                            borderRadius: element.type === 'ellipse' ? '50%' : mmToPx(props.radius ?? 0, zoom),
                            border: (props.border_width ?? 0) > 0
                                ? `${Math.max(1, mmToPx(props.border_width, zoom))}px solid ${props.border_color}`
                                : undefined,
                        }}
                    />
                );
            case 'line':
                return <div style={{ width: '100%', height: '100%', background: props.color }} />;
            case 'text':
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            overflow: 'hidden',
                            fontFamily: FONT_STACKS[props.font] ?? FONT_STACKS.sans,
                            fontSize: (props.size_pt ?? 11) * PT_TO_PX * zoom,
                            fontWeight: props.weight === 'bold' ? 700 : 400,
                            fontStyle: props.italic ? 'italic' : 'normal',
                            textDecoration: props.underline ? 'underline' : 'none',
                            letterSpacing: `${(props.letter_spacing ?? 0) * PT_TO_PX * zoom}px`,
                            lineHeight: props.line_height ?? 1.2,
                            color: props.color,
                            textAlign: props.align ?? 'left',
                            whiteSpace: 'pre-wrap',
                        }}
                    >
                        {substitute(String(props.content ?? ''), replace)}
                    </div>
                );
            case 'image': {
                const src = imageSource(element);

                return src
                    ? <img src={src} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
                    : <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">No image</div>;
            }
            case 'qr':
                return qrSrc
                    ? <img src={qrSrc} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
                    : <div className="h-full w-full bg-muted" />;
        }
    };

    const boxStyle = (element: QrElement): CSSProperties => ({
        position: 'absolute',
        left: mmToPx(element.x, zoom),
        top: mmToPx(element.y, zoom),
        width: mmToPx(element.w, zoom),
        height: mmToPx(element.h, zoom),
    });

    return (
        <div
            className="relative shadow-subtle"
            style={{
                width: mmToPx(canvas.width_mm, zoom),
                height: mmToPx(canvas.height_mm, zoom),
                background: canvas.background,
                overflow: 'hidden',
            }}
            onPointerDown={() => interactive && onSelect?.(null)}
        >
            {canvas.elements.map((element) => (
                <div
                    key={element.id}
                    style={boxStyle(element)}
                    className={interactive ? 'cursor-move' : undefined}
                    onPointerDown={(event) => begin(event, element, 'move')}
                >
                    {renderVisual(element)}

                    {interactive && selectedId === element.id && (
                        <div className="pointer-events-none absolute -inset-px border border-primary">
                            {HANDLES.map((handle) => (
                                <span
                                    key={handle.mode}
                                    className={`pointer-events-auto absolute h-2.5 w-2.5 rounded-full border border-primary bg-white ${handle.className}`}
                                    style={{ cursor: handle.cursor }}
                                    onPointerDown={(event) => begin(event, element, handle.mode)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
