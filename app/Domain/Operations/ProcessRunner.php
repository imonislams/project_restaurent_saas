<?php

namespace App\Domain\Operations;

use Symfony\Component\Process\Process;
use Throwable;

/**
 * Runs one external process from an argument array (never a shell string) and
 * returns its exit code with stdout and stderr combined. Kept behind this small
 * class so migration execution can be faked in tests.
 */
class ProcessRunner
{
    /**
     * @param  list<string>  $command
     * @return array{exit_code: int, output: string}
     */
    public function run(array $command, int $timeout = 600, ?string $cwd = null): array
    {
        $process = new Process($command, $cwd ?? base_path());
        $process->setTimeout($timeout > 0 ? $timeout : null);
        $process->setIdleTimeout($timeout > 0 ? $timeout : null);

        try {
            $process->run();

            $exitCode = $process->getExitCode() ?? 1;
            $output = trim($process->getOutput()."\n".$process->getErrorOutput());
        } catch (Throwable $e) {
            return ['exit_code' => 1, 'output' => $e->getMessage()];
        }

        return ['exit_code' => $exitCode, 'output' => $output];
    }
}
