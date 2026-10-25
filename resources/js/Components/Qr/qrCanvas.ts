/**
 * The card editor's element model. Positions are kept in millimetres so the
 * editor, the on-screen preview and the PDF export all agree — the browser
 * converts mm→px exactly as DomPDF converts mm→pt.
 */

export type QrElementType = 'text' | 'rect' | 'ellipse' | 'line' | 'image' | 'qr';

export interface QrElement {
    id: string;
    type: QrElementType;
    x: number;
    y: number;
    w: number;
    h: number;
    props: Record<string, any>;
}

export interface QrCanvas {
    width_mm: number;
    height_mm: number;
    background: string;
    elements: QrElement[];
}

/** CSS reference pixel per millimetre (96dpi). */
export const PX_PER_MM = 96 / 25.4;

/** CSS converted point → pixel (96dpi). */
export const PT_TO_PX = 96 / 72;

export const MAX_ELEMENTS = 60;

/** PDF-safe stacks: DejaVu is the only family DomPDF ships with. */
export const FONT_STACKS: Record<string, string> = {
    sans: '"DejaVu Sans", ui-sans-serif, system-ui, sans-serif',
    serif: '"DejaVu Serif", ui-serif, Georgia, serif',
    mono: '"DejaVu Sans Mono", ui-monospace, monospace',
};

export const TOKEN_KEYS = ['{{restaurant}}', '{{branch}}', '{{table}}', '{{area}}'];

export function mmToPx(mm: number, zoom = 1): number {
    return mm * PX_PER_MM * zoom;
}

/** px → mm at a given zoom, the inverse used while dragging. */
export function pxToMm(px: number, zoom = 1): number {
    const scale = PX_PER_MM * zoom;

    return scale === 0 ? 0 : px / scale;
}

/** Replace the card's placeholders with real values (browser side). */
export function substitute(text: string, replace: Record<string, string>): string {
    return text.replace(/\{\{(restaurant|branch|table|area)\}\}/g, (match) => replace[match] ?? '');
}

export function round(value: number): number {
    return Math.round(value * 100) / 100;
}

export function cloneCanvas(canvas: QrCanvas): QrCanvas {
    return JSON.parse(JSON.stringify(canvas)) as QrCanvas;
}

/** Keep an element inside the card, with a sane minimum size. */
export function clampElement(element: QrElement, canvas: QrCanvas): QrElement {
    const minW = element.type === 'line' ? 0.2 : 2;
    const minH = element.type === 'line' ? 0.2 : 2;

    const w = Math.min(canvas.width_mm, Math.max(minW, round(element.w)));
    const h = Math.min(canvas.height_mm, Math.max(minH, round(element.h)));

    return {
        ...element,
        w,
        h,
        x: round(Math.min(Math.max(0, element.x), Math.max(0, canvas.width_mm - w))),
        y: round(Math.min(Math.max(0, element.y), Math.max(0, canvas.height_mm - h))),
    };
}

/**
 * A new element of the given type, dropped near the middle of the card.
 */
export function newElement(type: QrElementType, canvas: QrCanvas, index: number): QrElement {
    const id = `${type}-${Date.now().toString(36)}-${index}`;

    const sizes: Record<QrElementType, [number, number]> = {
        text: [50, 10],
        rect: [30, 20],
        ellipse: [24, 24],
        line: [40, 0.4],
        image: [24, 24],
        qr: [40, 40],
    };

    const [w, h] = sizes[type];

    const props: Record<string, any> = {
        text: {
            content: 'Your text',
            font: 'sans',
            size_pt: 11,
            weight: 'normal',
            italic: false,
            underline: false,
            letter_spacing: 0,
            line_height: 1.2,
            color: '#0f172a',
            align: 'center',
        },
        rect: { fill: '#ffffff', border_color: '#cbd5e1', border_width: 0.3, radius: 2 },
        ellipse: { fill: '#ffffff', border_color: '#cbd5e1', border_width: 0.3, radius: 0 },
        line: { color: '#0f172a' },
        image: { source: 'logo', path: null },
        qr: { margin: 1, caption: '' },
    }[type];

    return clampElement(
        {
            id,
            type,
            x: (canvas.width_mm - w) / 2,
            y: (canvas.height_mm - h) / 2,
            w,
            h,
            props: props ?? {},
        },
        canvas,
    );
}
