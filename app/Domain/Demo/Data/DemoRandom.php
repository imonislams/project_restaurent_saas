<?php

namespace App\Domain\Demo\Data;

/**
 * Small deterministic PRNG (Park–Miller) for demo generation.
 *
 * Seeded per batch and step, so re-running a failed step reproduces the same
 * orders — which, together with the deterministic idempotency keys, is what
 * makes a retry safe. Deliberately self-contained: it never touches the global
 * `mt_rand` state used elsewhere in the process.
 */
class DemoRandom
{
    protected const MODULUS = 2147483647;

    protected int $state;

    public function __construct(int $seed)
    {
        $this->state = $seed % self::MODULUS;

        if ($this->state <= 0) {
            $this->state += self::MODULUS - 1;
        }
    }

    public function next(): int
    {
        return $this->state = ($this->state * 16807) % self::MODULUS;
    }

    /** Uniform integer in [$min, $max]. */
    public function int(int $min, int $max): int
    {
        if ($max <= $min) {
            return $min;
        }

        $span = $max - $min + 1;

        return $min + (int) floor($this->next() / self::MODULUS * $span);
    }

    public function float(float $min, float $max, int $decimals = 2): float
    {
        $value = $min + ($this->next() / self::MODULUS) * ($max - $min);

        return round($value, $decimals);
    }

    public function bool(float $chance = 0.5): bool
    {
        return ($this->next() / self::MODULUS) < $chance;
    }

    /**
     * Pick one item from a list.
     *
     * @template T
     *
     * @param  list<T>  $items
     * @return T
     */
    public function pick(array $items): mixed
    {
        return $items[$this->int(0, count($items) - 1)];
    }

    /**
     * Pick using weights, e.g. [['value' => 'cash', 'weight' => 60], …].
     *
     * @param  list<array{value: mixed, weight: int|float}>  $weighted
     */
    public function weighted(array $weighted): mixed
    {
        $total = 0.0;

        foreach ($weighted as $row) {
            $total += (float) $row['weight'];
        }

        $roll = ($this->next() / self::MODULUS) * $total;

        foreach ($weighted as $row) {
            $roll -= (float) $row['weight'];

            if ($roll <= 0) {
                return $row['value'];
            }
        }

        return $weighted[count($weighted) - 1]['value'];
    }

    /**
     * @param  list<mixed>  $items
     * @return list<mixed>
     */
    public function shuffle(array $items): array
    {
        for ($i = count($items) - 1; $i > 0; $i--) {
            $j = $this->int(0, $i);

            [$items[$i], $items[$j]] = [$items[$j], $items[$i]];
        }

        return $items;
    }
}
