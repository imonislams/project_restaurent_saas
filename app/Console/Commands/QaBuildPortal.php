<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Builds a self-contained QA portal HTML file from the Markdown reports in
 * reports/qa/.
 *
 * Three layers:
 *   1. a dashboard parsed out of the issue register (never hand-typed numbers),
 *   2. a findings table with search and bucket filters,
 *   3. the full reports themselves.
 *
 * Output is one file with no external dependencies and no network calls.
 */
class QaBuildPortal extends Command
{
    protected $signature = 'qa:build-portal {--out=storage/app/qa-portal.html}';

    protected $description = 'Render reports/qa/*.md into a single-file HTML QA portal';

    /** Locked order so the portal reads consistently between builds. */
    private const ORDER = [
        'README.md' => 'Overview',
        'issue-register.md' => 'Issue Register',
        'vulnerability-test-report.md' => 'A — Vulnerability',
        'security-test-report.md' => 'B — Security',
        'load-performance-report.md' => 'C — Load & Performance',
        'stress-test-report.md' => 'D — Stress',
        'production-readiness-report.md' => 'E — Production Readiness',
        'dependency-audit-report.md' => 'Dependency Audit',
        'remaining-test-failures.md' => 'Test Failures Resolved',
    ];

    /** Severity ordering for the findings table. */
    private const SEVERITY_RANK = [
        'Critical' => 0,
        'High' => 1,
        'Medium' => 2,
        'Low–Medium' => 3,
        'Low' => 4,
        'Informational' => 5,
        'Withdrawn' => 6,
    ];

    /** Anchors must be unique across the whole document, not per section. */
    private int $headingCounter = 0;

    public function handle(): int
    {
        $dir = base_path('reports/qa');
        $out = base_path((string) $this->option('out'));

        if (! is_dir($dir)) {
            $this->error("Missing {$dir}");

            return self::FAILURE;
        }

        $registerPath = $dir.DIRECTORY_SEPARATOR.'issue-register.md';
        $findings = is_file($registerPath)
            ? $this->parseRegister((string) file_get_contents($registerPath))
            : [];

        $sections = [];
        $nav = [];
        $meta = [];

        foreach (self::ORDER as $file => $title) {
            $path = $dir.DIRECTORY_SEPARATOR.$file;

            if (! is_file($path)) {
                $this->warn("  skipped {$file} (missing)");

                continue;
            }

            $id = (string) str($file)->before('.md')->slug();
            $contents = (string) file_get_contents($path);

            // Drop the document's own H1: the section heading replaces it.
            $contents = preg_replace('/^#\s+.*$/m', '', $contents, 1) ?? $contents;

            [$html, $toc] = $this->render($contents, $id);

            $bytes = (int) filesize($path);
            $mtime = (int) filemtime($path);

            $sections[] = $this->section($id, $title, $toc, $html, $bytes, $mtime);
            $nav[] = ['id' => $id, 'title' => $title];
            $meta[] = ['bytes' => $bytes, 'mtime' => $mtime];

            $this->line(sprintf('  rendered %-36s %s', $file, number_format($bytes).' bytes'));
        }

        if ($sections === []) {
            $this->error('No reports rendered.');

            return self::FAILURE;
        }

        $summary = $this->summarise($findings);

        $html = $this->shell($nav, $findings, $summary, $sections, $this->gateStatus($dir), $meta);

        if (! is_dir(dirname($out))) {
            mkdir(dirname($out), 0777, true);
        }

        file_put_contents($out, $html);

        $this->newLine();
        $this->info('Wrote '.$out.' ('.number_format(strlen($html)).' bytes)');
        $this->line(sprintf(
            '  %d findings · %d fixed · %d open · %d reports',
            $summary['total'],
            $summary['fixed'],
            $summary['open'],
            count($sections),
        ));

        return self::SUCCESS;
    }

    // ---------------------------------------------------------------- parsing

    /**
     * Parse the Open Issues table into structured rows.
     *
     * Scoped to that one table on purpose: matching `| QA-` anywhere in the file
     * also catches the informational and withdrawn tables, which is how the
     * previous build reported 30 findings when the register holds 24.
     *
     * @return list<array{id:string,title:string,severity:string,area:string,status:string,bucket:string}>
     */
    protected function parseRegister(string $md): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $md) ?: [];

        $inOpen = false;
        $rows = [];

        foreach ($lines as $line) {
            if (preg_match('/^##\s+Open Issues/i', $line)) {
                $inOpen = true;

                continue;
            }

            // Any other H2 closes the section.
            if ($inOpen && preg_match('/^##\s+/', $line)) {
                break;
            }

            if (! $inOpen || ! preg_match('/^\|\s*(QA-[A-E]-\d+)\s*\|/', $line)) {
                continue;
            }

            $cells = array_map('trim', explode('|', trim($line, '|')));

            if (count($cells) < 5) {
                continue;
            }

            $rows[] = [
                'id' => $cells[0],
                'title' => $this->plain($cells[1]),
                'severity' => $this->severity($cells[2]),
                'area' => trim($cells[3]),
                'status' => $this->plain($cells[4]),
                'bucket' => $this->bucket($cells[4]),
            ];
        }

        return $rows;
    }

    /**
     * Resolve a severity cell.
     *
     * Strikethrough marks a revised value, so the struck text is discarded and the
     * replacement kept: `~~High~~ Informational` is Informational, not High.
     */
    protected function severity(string $cell): string
    {
        $revised = $this->plain(preg_replace('/~~[^~]+~~/', '', $cell) ?? '');

        return $revised !== '' ? $revised : $this->plain($cell);
    }

    /** Map a status cell onto one of six buckets. */
    protected function bucket(string $cell): string
    {
        $s = $this->plain($cell);

        return match (true) {
            (bool) preg_match('/^(Verified|Resolved)/i', $s) => 'fixed',
            (bool) preg_match('/^Reclassified/i', $s) => 'reclassified',
            (bool) preg_match('/^(Rejected|Withdrawn)/i', $s) => 'withdrawn',
            (bool) preg_match('/^Open/i', $s) => 'open',
            (bool) preg_match('/^Reported/i', $s) => 'no-action',
            default => 'other',
        };
    }

    /** Strip inline Markdown from a table cell. */
    protected function plain(string $s): string
    {
        $s = preg_replace('/\[([^\]]+)\]\([^)]*\)/', '$1', $s) ?? $s;
        $s = preg_replace('/[*_`~]/', '', $s) ?? $s;

        return trim(preg_replace('/\s+/', ' ', $s) ?? $s);
    }

    /**
     * @param  list<array{bucket:string}>  $findings
     * @return array{total:int,fixed:int,reclassified:int,withdrawn:int,open:int,noAction:int}
     */
    protected function summarise(array $findings): array
    {
        $buckets = array_count_values(array_column($findings, 'bucket'));

        return [
            'total' => count($findings),
            'fixed' => $buckets['fixed'] ?? 0,
            'reclassified' => $buckets['reclassified'] ?? 0,
            'withdrawn' => $buckets['withdrawn'] ?? 0,
            'open' => ($buckets['open'] ?? 0) + ($buckets['other'] ?? 0),
            'noAction' => $buckets['no-action'] ?? 0,
        ];
    }

    /**
     * Read the release-gate numbers out of the README rather than hard-coding
     * them, so the dashboard cannot disagree with the report justifying it.
     *
     * @return list<array{label:string,value:string}>
     */
    protected function gateStatus(string $dir): array
    {
        $readme = @file_get_contents($dir.DIRECTORY_SEPARATOR.'README.md') ?: '';

        $grab = function (string $pattern, string $fallback = '—') use ($readme): string {
            return preg_match($pattern, $readme, $m) ? $m[1] : $fallback;
        };

        return [
            ['label' => 'Tests passing', 'value' => $grab('/(\d+)\s+tests passed/i')],
            ['label' => 'Tests failing', 'value' => $grab('/(\d+)\s+failed/i', '0')],
            ['label' => 'Pint files', 'value' => $grab('/PASS\*{0,2}\s+on\s+(\d+)/i')],
            ['label' => 'Advisories', 'value' => $grab('/(\d+)\s+advisories/i', '0')],
        ];
    }

    // --------------------------------------------------------------- rendering

    /**
     * @return array{0:string,1:list<array{level:int,text:string,id:string}>}
     */
    protected function render(string $md, string $prefix): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $md) ?: [];
        $out = [];
        $toc = [];
        $inCode = false;
        $inTable = false;
        $listType = null;
        $header = [];
        $paragraph = [];

        $flushList = function () use (&$out, &$listType) {
            if ($listType !== null) {
                $out[] = "</{$listType}>";
                $listType = null;
            }
        };

        $flushTable = function () use (&$out, &$inTable) {
            if ($inTable) {
                $out[] = '</tbody></table>';
                $inTable = false;
            }
        };

        $flushParagraph = function () use (&$out, &$paragraph) {
            if ($paragraph !== []) {
                $out[] = '<p>'.$this->inline(implode(' ', $paragraph)).'</p>';
                $paragraph = [];
            }
        };

        foreach ($lines as $line) {
            $trim = trim($line);

            if (str_starts_with($trim, '```')) {
                if ($inCode) {
                    $out[] = '</code></pre>';
                    $inCode = false;
                } else {
                    $flushList();
                    $flushTable();
                    $flushParagraph();
                    $out[] = '<pre><code>';
                    $inCode = true;
                }

                continue;
            }

            if ($inCode) {
                $out[] = htmlspecialchars($line, ENT_QUOTES, 'UTF-8');

                continue;
            }

            // ---- tables
            if (str_starts_with($trim, '|') && str_ends_with($trim, '|')) {
                $cells = array_map('trim', explode('|', trim($trim, '|')));

                if (! $inTable) {
                    $flushList();
                    $flushParagraph();
                    $header = $cells;
                    $inTable = true;

                    continue;
                }

                if (preg_match('/^\|[\s:|-]+\|$/', $trim)) {
                    $out[] = '<table><thead><tr>'.implode('', array_map(
                        fn ($c) => '<th>'.$this->inline($c).'</th>',
                        $header,
                    )).'</tr></thead><tbody>';

                    continue;
                }

                $out[] = '<tr>'.implode('', array_map(
                    fn ($c) => '<td>'.$this->inline($c).'</td>',
                    $cells,
                )).'</tr>';

                continue;
            }
            $flushTable();

            if ($trim === '') {
                $flushList();
                $flushParagraph();

                continue;
            }

            if (preg_match('/^(-{3,}|\*{3,})$/', $trim)) {
                $flushList();
                $flushParagraph();
                $out[] = '<hr>';

                continue;
            }

            // ---- headings, with ids so the per-document TOC can link
            if (preg_match('/^(#{1,6})\s+(.*)$/', $trim, $m)) {
                $flushList();
                $flushParagraph();
                $level = min(strlen($m[1]) + 1, 6);
                $text = $m[2];

                if ($level >= 3) {
                    $anchor = $prefix.'-h'.(++$this->headingCounter);
                    $toc[] = ['level' => $level, 'text' => $this->plain($text), 'id' => $anchor];
                    $out[] = "<h{$level} id=\"{$anchor}\">".$this->inline($text)."</h{$level}>";
                } else {
                    $out[] = "<h{$level}>".$this->inline($text)."</h{$level}>";
                }

                continue;
            }

            if (preg_match('/^>\s?(.*)$/', $trim, $m)) {
                $flushList();
                $flushParagraph();
                $out[] = '<blockquote>'.$this->inline($m[1]).'</blockquote>';

                continue;
            }

            if (preg_match('/^[-*+]\s+(.*)$/', $trim, $m)) {
                if ($listType !== 'ul') {
                    $flushList();
                    $flushParagraph();
                    $out[] = '<ul>';
                    $listType = 'ul';
                }
                $out[] = '<li>'.$this->inline($m[1]).'</li>';

                continue;
            }

            if (preg_match('/^\d+\.\s+(.*)$/', $trim, $m)) {
                if ($listType !== 'ol') {
                    $flushList();
                    $flushParagraph();
                    $out[] = '<ol>';
                    $listType = 'ol';
                }
                $out[] = '<li>'.$this->inline($m[1]).'</li>';

                continue;
            }

            $flushList();
            // Consecutive plain lines are one paragraph in Markdown. Emitting a
            // <p> per source line double-spaces every hard-wrapped paragraph,
            // which is most of these reports.
            $paragraph[] = $trim;
        }

        if ($inCode) {
            $out[] = '</code></pre>';
        }
        $flushList();
        $flushTable();
        $flushParagraph();

        return [implode("\n", $out), $toc];
    }

    /** Inline Markdown for the subset the reports use. */
    protected function inline(string $s): string
    {
        $s = htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
        $s = preg_replace('/`([^`]+)`/', '<code>$1</code>', $s) ?? $s;
        $s = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $s) ?? $s;
        $s = preg_replace('/(?<!\*)\*([^*]+)\*(?!\*)/', '<em>$1</em>', $s) ?? $s;
        $s = preg_replace('/~~([^~]+)~~/', '<del>$1</del>', $s) ?? $s;

        // Cross-document links become in-page anchors; the section id is the slug
        // of the filename, which is exactly what the build emits.
        $s = preg_replace_callback(
            '/\[([^\]]+)\]\((?:\.\/)?([a-z0-9-]+)\.md(#[^)]*)?\)/i',
            fn ($m) => '<a href="#'.$m[2].'">'.$m[1].'</a>',
            $s,
        ) ?? $s;

        // Bare in-page anchors keep only their text: the heading ids those links
        // targeted in Markdown do not survive into the portal.
        return preg_replace('/\[([^\]]+)\]\(#[^)]*\)/', '$1', $s) ?? $s;
    }

    /** @param list<array{level:int,text:string,id:string}> $toc */
    protected function section(string $id, string $title, array $toc, string $html, int $bytes, int $mtime): string
    {
        $tocHtml = '';

        if (count($toc) >= 3) {
            $items = array_map(
                fn ($t) => sprintf(
                    '<a href="#%s" class="lvl-%d">%s</a>',
                    $t['id'],
                    $t['level'],
                    htmlspecialchars($t['text'], ENT_QUOTES, 'UTF-8'),
                ),
                $toc,
            );

            $tocHtml = '<nav class="toc"><span class="toc-title">On this page</span>'
                .implode('', $items).'</nav>';
        }

        return sprintf(
            '<section id="%s" class="doc"><div class="doc-head"><h2>%s</h2>'
            .'<span class="doc-meta">%s · edited %s</span></div>%s%s</section>',
            $id,
            htmlspecialchars($title, ENT_QUOTES, 'UTF-8'),
            number_format($bytes).' bytes',
            date('Y-m-d H:i', $mtime),
            $tocHtml,
            $html,
        );
    }

    // ------------------------------------------------------------------ shell

    /**
     * @param  list<array{id:string,title:string}>  $nav
     * @param  list<array{id:string,title:string,severity:string,area:string,status:string,bucket:string}>  $findings
     * @param  array{total:int,fixed:int,reclassified:int,withdrawn:int,open:int,noAction:int}  $summary
     * @param  list<string>  $sections
     * @param  list<array{label:string,value:string}>  $gate
     * @param  list<array{bytes:int,mtime:int}>  $meta
     */
    protected function shell(
        array $nav,
        array $findings,
        array $summary,
        array $sections,
        array $gate,
        array $meta,
    ): string {
        $navHtml = implode('', array_map(
            fn ($n) => sprintf(
                '<a href="#%s">%s</a>',
                $n['id'],
                htmlspecialchars($n['title'], ENT_QUOTES, 'UTF-8'),
            ),
            $nav,
        ));

        $gateHtml = implode('', array_map(
            fn ($g) => sprintf(
                '<div class="stat good"><b>%s</b><span>%s</span></div>',
                htmlspecialchars((string) $g['value'], ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($g['label'], ENT_QUOTES, 'UTF-8'),
            ),
            $gate,
        ));

        $bucketHtml = '';
        foreach ([
            ['fixed', 'Fixed', $summary['fixed']],
            ['reclassified', 'Reclassified', $summary['reclassified']],
            ['withdrawn', 'Withdrawn', $summary['withdrawn']],
            ['open', 'Open', $summary['open']],
            ['no-action', 'No action', $summary['noAction']],
        ] as [$key, $label, $count]) {
            $bucketHtml .= sprintf(
                '<button type="button" class="chip" data-filter="%s">%s <b>%d</b></button>',
                $key,
                $label,
                $count,
            );
        }

        $rows = $this->findingsRows($findings);
        $body = implode("\n", $sections);

        $built = date('Y-m-d H:i:s');
        $latestMtime = $meta === [] ? time() : max(array_column($meta, 'mtime'));
        $latestDate = date('Y-m-d H:i', $latestMtime);
        $sources = count($meta);
        $totalBytes = number_format((int) array_sum(array_column($meta, 'bytes')));

        return <<<HTML
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TouchDine — QA Audit Portal</title>
<style>
  :root{
    --bg:#0d1117; --panel:#161b22; --elev:#1c2330; --line:#30363d; --text:#e6edf3;
    --muted:#8b949e; --accent:#58a6ff; --ok:#3fb950; --warn:#d29922; --bad:#f85149;
    --purple:#bc8cff;
  }
  *{box-sizing:border-box}
  html{scroll-behavior:smooth;scroll-padding-top:64px}
  body{margin:0;background:var(--bg);color:var(--text);
    font:15px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
    -webkit-font-smoothing:antialiased}
  code{background:var(--elev);padding:1px 5px;border-radius:4px;font-size:12.5px;
    font-family:ui-monospace,"Cascadia Code",Consolas,monospace}

  header.top{padding:36px 24px 26px;border-bottom:1px solid var(--line);
    background:linear-gradient(160deg,#182031,#0d1117 70%)}
  header.top h1{margin:0 0 6px;font-size:26px;letter-spacing:-.02em}
  header.top .sub{color:var(--muted);font-size:14px;max-width:82ch}
  .stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
  .stat{background:var(--panel);border:1px solid var(--line);border-radius:8px;
    padding:11px 16px;min-width:104px}
  .stat b{display:block;font-size:20px;line-height:1.2}
  .stat span{color:var(--muted);font-size:11px;text-transform:uppercase;
    letter-spacing:.07em}
  .stat.good b{color:var(--ok)} .stat.blue b{color:var(--accent)}

  nav.bar{position:sticky;top:0;z-index:20;display:flex;gap:2px;flex-wrap:wrap;
    padding:9px 24px;background:rgba(13,17,23,.94);border-bottom:1px solid var(--line);
    backdrop-filter:blur(10px)}
  nav.bar a{color:var(--muted);text-decoration:none;padding:6px 11px;border-radius:6px;
    font-size:13px;white-space:nowrap}
  nav.bar a:hover{color:var(--text);background:var(--panel)}
  nav.bar a.active{color:var(--accent);background:rgba(88,166,255,.1)}

  main{padding:24px;max-width:1180px;margin:0 auto}

  .panel{background:var(--panel);border:1px solid var(--line);border-radius:10px;
    padding:22px 24px;margin-bottom:24px}
  .panel h2{margin:0 0 4px;font-size:17px}
  .panel .hint{color:var(--muted);font-size:13px;margin:0 0 16px}

  .chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
  .chip{background:var(--elev);border:1px solid var(--line);color:var(--muted);
    border-radius:999px;padding:5px 13px;font-size:12.5px;cursor:pointer;
    font-family:inherit;transition:.12s}
  .chip:hover{color:var(--text);border-color:#4a5460}
  .chip.on{background:rgba(88,166,255,.14);border-color:var(--accent);color:var(--accent)}
  .chip b{opacity:.75;font-weight:600}

  #q{width:100%;padding:9px 13px;border-radius:7px;border:1px solid var(--line);
    background:var(--bg);color:var(--text);font:inherit;font-size:14px;margin-bottom:14px}
  #q:focus{outline:none;border-color:var(--accent)}

  table.grid{border-collapse:collapse;width:100%;font-size:13px}
  table.grid th{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);
    color:var(--muted);font-weight:600;font-size:11.5px;text-transform:uppercase;
    letter-spacing:.05em}
  table.grid td{padding:9px 10px;border-bottom:1px solid rgba(48,54,61,.55);
    vertical-align:top;overflow-wrap:anywhere}
  table.grid tr:last-child td{border-bottom:0}
  table.grid tbody tr:hover td{background:rgba(255,255,255,.017)}
  table.grid .id{font-family:ui-monospace,Consolas,monospace;font-size:12.5px;
    color:var(--accent);white-space:nowrap}
  table.grid .st{font-size:12.5px;color:var(--muted)}

  .badge{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11.5px;
    font-weight:600;white-space:nowrap;border:1px solid transparent}
  .s-Critical{background:rgba(248,81,73,.16);color:#ff7b72;border-color:rgba(248,81,73,.4)}
  .s-High{background:rgba(248,81,73,.12);color:#ff9d96;border-color:rgba(248,81,73,.3)}
  .s-Medium{background:rgba(210,153,34,.14);color:#e3b341;border-color:rgba(210,153,34,.35)}
  .s-LowMed,.s-Low{background:rgba(88,166,255,.13);color:#79c0ff;
    border-color:rgba(88,166,255,.32)}
  .s-Informational{background:rgba(139,148,158,.14);color:var(--muted);
    border-color:rgba(139,148,158,.3)}
  .s-Withdrawn{background:rgba(139,148,158,.1);color:#6e7681;
    border-color:rgba(139,148,158,.22)}
  .s-other{background:var(--elev);color:var(--muted);border-color:var(--line)}
  .b-fixed{color:var(--ok)} .b-open{color:var(--bad)} .b-reclassified{color:var(--purple)}
  .b-withdrawn{color:#6e7681} .b-no-action{color:var(--muted)} .b-other{color:var(--warn)}

  .empty{color:var(--muted);text-align:center;padding:26px;font-size:13.5px}

  .doc{background:var(--panel);border:1px solid var(--line);border-radius:10px;
    padding:24px 28px;margin-bottom:24px;overflow-x:auto}
  .doc-head{display:flex;justify-content:space-between;align-items:baseline;
    gap:16px;flex-wrap:wrap;border-bottom:1px solid var(--line);
    padding-bottom:13px;margin-bottom:18px}
  .doc-head h2{margin:0;font-size:18px;color:var(--accent)}
  .doc-meta{color:var(--muted);font-size:12px;
    font-family:ui-monospace,Consolas,monospace}
  .doc h3{font-size:15px;margin:28px 0 10px;scroll-margin-top:64px}
  .doc h4{font-size:13.5px;margin:20px 0 8px;color:var(--muted);scroll-margin-top:64px}
  .doc p{margin:10px 0}
  .doc table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13px}
  .doc th,.doc td{border:1px solid var(--line);padding:8px 10px;text-align:left;
    vertical-align:top}
  .doc th{background:var(--elev);font-weight:600}
  .doc tbody tr:nth-child(even) td{background:rgba(255,255,255,.015)}
  .doc pre{background:#0b0f14;border:1px solid var(--line);border-radius:8px;
    padding:14px;overflow-x:auto;font-size:12.5px;line-height:1.5}
  .doc pre code{background:none;padding:0}
  .doc ul,.doc ol{padding-left:22px;margin:10px 0}
  .doc li{margin:5px 0}
  .doc blockquote{margin:14px 0;padding:10px 16px;border-left:3px solid var(--accent);
    background:rgba(88,166,255,.06);color:var(--muted)}
  .doc blockquote p{margin:0}
  .doc hr{border:0;border-top:1px solid var(--line);margin:26px 0}
  .doc a{color:var(--accent);text-decoration:none}
  .doc a:hover{text-decoration:underline}
  .doc del{color:#6e7681}

  .toc{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 20px;padding:12px 14px;
    background:var(--bg);border:1px solid var(--line);border-radius:8px;font-size:12.5px}
  .toc-title{color:var(--muted);text-transform:uppercase;letter-spacing:.06em;
    font-size:11px;margin-right:6px;align-self:center}
  .toc a{color:var(--muted);text-decoration:none;padding:2px 8px;border-radius:5px}
  .toc a:hover{color:var(--accent);background:rgba(88,166,255,.08)}
  .toc a.lvl-4{opacity:.72}

  footer{padding:26px 24px 40px;text-align:center;color:var(--muted);font-size:12px;
    border-top:1px solid var(--line);line-height:1.9}
  #totop{position:fixed;right:20px;bottom:20px;width:40px;height:40px;border-radius:50%;
    background:var(--elev);border:1px solid var(--line);color:var(--muted);
    cursor:pointer;font-size:16px;display:none;z-index:30;font-family:inherit}
  #totop.show{display:block}
  #totop:hover{color:var(--accent);border-color:var(--accent)}

  @media print{
    nav.bar,#totop,.chips,#q{display:none}
    body{background:#fff;color:#000}
    .panel,.doc{border-color:#ccc;background:#fff;page-break-inside:avoid}
    .doc-head h2,.doc a{color:#000}
  }
  @media (max-width:700px){
    main{padding:14px}
    .doc{padding:18px}
    header.top{padding:24px 16px 18px}
    table.grid{display:block;overflow-x:auto}
  }
</style>
</head>
<body>

<header class="top">
  <h1>TouchDine — QA Audit Portal</h1>
  <div class="sub">
    Branch <code>qa/security-performance-audit</code> · audit window 2026-11-14 → 2026-11-15 ·
    vulnerability · security · load · stress · production readiness
  </div>
  <div class="stats">
    <div class="stat blue"><b>{$summary['total']}</b><span>Findings</span></div>
    <div class="stat good"><b>{$summary['fixed']}</b><span>Fixed &amp; verified</span></div>
    <div class="stat"><b>{$summary['open']}</b><span>Still open</span></div>
    {$gateHtml}
  </div>
</header>

<nav class="bar" id="nav"><a href="#findings">Findings</a>{$navHtml}</nav>

<main>

  <section class="panel" id="findings">
    <h2>All findings</h2>
    <p class="hint">
      Parsed live from <code>issue-register.md</code>. The counters above, the filter chips and this
      table all come from the same rows, so they cannot disagree with each other.
    </p>
    <div class="chips">{$bucketHtml}</div>
    <input id="q" type="search" placeholder="Search findings — id, title, severity, status…"
           aria-label="Search findings" autocomplete="off">
    <table class="grid">
      <thead><tr>
        <th>ID</th><th>Finding</th><th>Severity</th><th>Area</th><th>Status</th>
      </tr></thead>
      <tbody id="rows">{$rows}</tbody>
    </table>
    <div class="empty" id="empty" style="display:none">No findings match that filter.</div>
  </section>

  {$body}

</main>

<button id="totop" type="button" title="Back to top" aria-label="Back to top">↑</button>

<footer>
  Generated <strong>{$built}</strong> by <code>php artisan qa:build-portal</code> — {$sources} reports,
  {$totalBytes} bytes, most recently edited {$latestDate}.<br>
  Self-contained: no external requests. Every figure traces back to a command output recorded in the
  reports above.
</footer>

<script>
(function () {
  var rows = Array.prototype.slice.call(document.querySelectorAll('#rows tr'));
  var input = document.getElementById('q');
  var empty = document.getElementById('empty');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var activeBucket = null;

  function apply() {
    var term = (input.value || '').toLowerCase().trim();
    var shown = 0;

    rows.forEach(function (row) {
      var okBucket = !activeBucket || row.getAttribute('data-bucket') === activeBucket;
      var okTerm = !term || row.textContent.toLowerCase().indexOf(term) !== -1;
      var visible = okBucket && okTerm;

      row.style.display = visible ? '' : 'none';
      if (visible) { shown++; }
    });

    empty.style.display = shown ? 'none' : '';
  }

  input.addEventListener('input', apply);

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var bucket = chip.getAttribute('data-filter');
      activeBucket = activeBucket === bucket ? null : bucket;

      chips.forEach(function (c) {
        c.classList.toggle('on', c.getAttribute('data-filter') === activeBucket);
      });

      apply();
    });
  });

  var links = Array.prototype.slice.call(document.querySelectorAll('#nav a'));
  var targets = links.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  });

  function sync() {
    var y = window.scrollY + 90;
    var current = 0;

    targets.forEach(function (el, i) {
      if (el && el.offsetTop <= y) { current = i; }
    });

    links.forEach(function (a, i) { a.classList.toggle('active', i === current); });
  }

  window.addEventListener('scroll', sync, { passive: true });
  sync();

  var top = document.getElementById('totop');
  top.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', function () {
    top.classList.toggle('show', window.scrollY > 700);
  }, { passive: true });
})();
</script>
</body>
</html>
HTML;
    }

    /** @param list<array{id:string,title:string,severity:string,area:string,status:string,bucket:string}> $findings */
    protected function findingsRows(array $findings): string
    {
        if ($findings === []) {
            return '<tr><td colspan="5" class="empty">No findings parsed from the register.</td></tr>';
        }

        usort($findings, function (array $a, array $b): int {
            $ra = self::SEVERITY_RANK[$a['severity']] ?? 9;
            $rb = self::SEVERITY_RANK[$b['severity']] ?? 9;

            return [$ra, $a['id']] <=> [$rb, $b['id']];
        });

        $allowed = [
            's-Critical', 's-High', 's-Medium', 's-LowMed', 's-Low',
            's-Informational', 's-Withdrawn',
        ];

        $out = '';
        foreach ($findings as $f) {
            // Low–Medium collapses onto one badge class; anything unrecognised
            // falls back to a neutral style rather than an empty class name.
            $key = str_replace('–Medium', 'Med', $f['severity']);
            $sevClass = 's-'.str_replace(' ', '', $key);

            if (! in_array($sevClass, $allowed, true)) {
                $sevClass = 's-other';
            }

            $out .= sprintf(
                '<tr data-bucket="%s"><td class="id">%s</td><td>%s</td>'
                .'<td><span class="badge %s">%s</span></td><td>%s</td>'
                .'<td class="st b-%s">%s</td></tr>',
                $f['bucket'],
                htmlspecialchars($f['id'], ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($f['title'], ENT_QUOTES, 'UTF-8'),
                $sevClass,
                htmlspecialchars($f['severity'], ENT_QUOTES, 'UTF-8'),
                htmlspecialchars($f['area'], ENT_QUOTES, 'UTF-8'),
                $f['bucket'],
                htmlspecialchars(mb_strimwidth($f['status'], 0, 78, '…'), ENT_QUOTES, 'UTF-8'),
            );
        }

        return $out;
    }
}
