import { describe, expect, it } from 'vitest';
import { QrCanvas, clampElement, mmToPx, newElement, pxToMm, substitute } from './qrCanvas';

const canvas: QrCanvas = { width_mm: 100, height_mm: 150, background: '#ffffff', elements: [] };

describe('canvas geometry', () => {
    it('converts millimetres to CSS pixels at 96dpi', () => {
        expect(Math.round(mmToPx(25.4))).toBe(96);
        expect(mmToPx(10, 2)).toBeCloseTo(75.59, 2);
    });

    it('round-trips pixels back to millimetres', () => {
        expect(pxToMm(mmToPx(40, 1.5), 1.5)).toBeCloseTo(40, 5);
    });

    it('keeps an element inside the card and enforces a minimum size', () => {
        const clamped = clampElement(
            { id: 'a', type: 'text', x: -20, y: 145, w: 0.5, h: 40, props: {} },
            canvas,
        );

        expect(clamped.x).toBe(0);
        expect(clamped.w).toBe(2);
        expect(clamped.y + clamped.h).toBeLessThanOrEqual(canvas.height_mm);
    });

    it('places a new element fully inside the card', () => {
        (['text', 'rect', 'ellipse', 'line', 'image', 'qr'] as const).forEach((type) => {
            const element = newElement(type, canvas, 0);

            expect(element.x).toBeGreaterThanOrEqual(0);
            expect(element.y).toBeGreaterThanOrEqual(0);
            expect(element.x + element.w).toBeLessThanOrEqual(canvas.width_mm);
            expect(element.y + element.h).toBeLessThanOrEqual(canvas.height_mm);
        });
    });
});

describe('substitute', () => {
    it('replaces the card placeholders', () => {
        expect(substitute('{{table}} · {{area}}', { '{{table}}': 'T1', '{{area}}': 'Patio' })).toBe('T1 · Patio');
    });

    it('leaves ordinary text untouched', () => {
        expect(substitute('Scan to order', { '{{table}}': 'T1' })).toBe('Scan to order');
    });

    it('renders a missing value as empty rather than leaving the token', () => {
        expect(substitute('Table {{table}}', {})).toBe('Table ');
    });
});
