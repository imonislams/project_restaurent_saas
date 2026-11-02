<?php

namespace App\Console\Commands;

use App\Domain\Marketing\Seo\SitemapService;
use Illuminate\Console\Command;

class GenerateMarketingSitemap extends Command
{
    protected $signature = 'marketing:generate-sitemap';

    protected $description = 'Rebuild the generated sitemap from the routes the site serves';

    public function handle(SitemapService $sitemap): int
    {
        if (! $sitemap->enabled()) {
            $this->warn('Sitemap generation is switched off; the static file is being served.');

            return self::SUCCESS;
        }

        $sitemap->regenerate();

        $this->info(count($sitemap->paths()).' URL(s) written.');

        return self::SUCCESS;
    }
}
