<?php

namespace App\Console\Commands;

use App\Support\HealthChecker;
use Illuminate\Console\Command;

class HealthCheck extends Command
{
    protected $signature = 'app:health';

    protected $description = 'Probe database, cache, storage and queue health';

    public function handle(HealthChecker $health): int
    {
        $checks = $health->run();

        foreach ($checks as $name => $check) {
            if (array_key_exists('queued', $check)) {
                $this->line(sprintf('%-10s queued=%d failed=%d', $name, $check['queued'], $check['failed']));

                continue;
            }

            $this->line(sprintf('%-10s %s', $name, $check['ok'] ? 'OK' : 'FAIL — '.$check['detail']));
        }

        return $health->healthy() ? self::SUCCESS : self::FAILURE;
    }
}
