<?php

namespace App\Domain\Tables;

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;
use Endroid\QrCode\Writer\SvgWriter;

/**
 * Thin wrapper over endroid/qr-code so QR rendering has a single, testable
 * entry point (used for downloads, previews and printable PDFs).
 */
class QrCodeRenderer
{
    public function png(string $data, int $size = 320, int $margin = 8): string
    {
        return $this->build($data, new PngWriter(), $size, $margin)->getString();
    }

    public function svg(string $data, int $size = 320, int $margin = 8): string
    {
        return $this->build($data, new SvgWriter(), $size, $margin)->getString();
    }

    /** Base64 PNG data URI, suitable for embedding in Blade/HTML. */
    public function dataUri(string $data, int $size = 320, int $margin = 8): string
    {
        return $this->build($data, new PngWriter(), $size, $margin)->getDataUri();
    }

    protected function build(string $data, \Endroid\QrCode\Writer\WriterInterface $writer, int $size, int $margin): \Endroid\QrCode\Writer\Result\ResultInterface
    {
        return (new Builder(
            writer: $writer,
            data: $data,
            errorCorrectionLevel: ErrorCorrectionLevel::Medium,
            size: $size,
            margin: $margin,
        ))->build();
    }
}
