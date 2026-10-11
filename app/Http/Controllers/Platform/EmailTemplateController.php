<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Communications\EmailTemplateService;
use App\Domain\Communications\Models\EmailTemplate;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;

class EmailTemplateController extends Controller
{
    public function __construct(
        protected EmailTemplateService $templates,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $selectedKey = $request->string('template')->toString()
            ?: (EmailTemplate::query()->orderBy('name')->value('key') ?? 'invoice_issued');

        $selected = EmailTemplate::query()->where('key', $selectedKey)->first();
        $sample = $this->templates->sampleData();

        return Inertia::render('Platform/Email/Templates', [
            'templates' => EmailTemplate::query()->orderBy('name')->get()->map(fn (EmailTemplate $template) => [
                'key' => $template->key,
                'name' => $template->name,
                'subject' => $template->subject,
                'body' => $template->body,
                'variables' => $template->variables ?? [],
                'is_active' => $template->is_active,
                'updated_at' => $template->updated_at?->toIso8601String(),
            ]),
            'selected_key' => $selectedKey,
            'preview' => $selected ? [
                'subject' => $this->templates->compile($selected->subject, $sample),
                'body' => $this->templates->wrap($this->templates->compile($selected->body, $sample)),
            ] : null,
        ]);
    }

    public function update(Request $request, string $key): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'subject' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:20000'],
            'is_active' => ['boolean'],
        ]);

        $template = EmailTemplate::updateOrCreate(
            ['key' => $key],
            $data + ['updated_by' => $request->user()->getKey()],
        );

        $this->audit->log('platform.email_template_updated', $template, ['key' => $key], $request->user());

        return back()->with('success', 'Template saved.');
    }

    public function reset(Request $request, string $key): RedirectResponse
    {
        EmailTemplate::query()->where('key', $key)->delete();

        $this->audit->log('platform.email_template_reset', null, ['key' => $key], $request->user());

        return back()->with('success', 'Template reset to the default.');
    }

    public function sendTest(Request $request, string $key): RedirectResponse
    {
        $data = $request->validate(['email' => ['required', 'email', 'max:255']]);

        $rendered = $this->templates->render($key, $this->templates->sampleData());

        if (! $rendered) {
            return back()->with('error', 'That template does not exist.');
        }

        try {
            Mail::html($rendered['body'], function ($message) use ($data, $rendered) {
                $message->to($data['email'])->subject($rendered['subject']);
            });

            $this->audit->log('platform.email_template_test', null, ['key' => $key, 'to' => $data['email']], $request->user());

            return back()->with('success', 'Test email sent to '.$data['email'].'.');
        } catch (\Throwable $e) {
            return back()->with('error', 'Send failed: '.$e->getMessage());
        }
    }
}
