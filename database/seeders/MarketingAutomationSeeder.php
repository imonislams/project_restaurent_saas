<?php

namespace Database\Seeders;

use App\Domain\Marketing\Automation\AutomationService;
use Illuminate\Database\Seeder;

/**
 * Creates the built-in automation sequences.
 *
 * Idempotent: re-running adds only what is missing, so it is safe from a deploy script
 * or the "restore presets" action on the automation screen. They are created as drafts —
 * a seeded workflow must never start mailing people because a deploy ran.
 */
class MarketingAutomationSeeder extends Seeder
{
    public function run(): void
    {
        $created = app(AutomationService::class)->seedPresets();

        $this->command?->info($created.' automation preset(s) created as drafts.');
    }
}
