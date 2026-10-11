<?php

namespace Database\Seeders;

use App\Domain\Communications\EmailTemplateService;
use App\Domain\Communications\Models\EmailTemplate;
use Illuminate\Database\Seeder;

class EmailTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (app(EmailTemplateService::class)->defaults() as $key => $template) {
            EmailTemplate::updateOrCreate(
                ['key' => $key],
                [
                    'name' => $template['name'],
                    'subject' => $template['subject'],
                    'body' => $template['body'],
                    'variables' => $template['variables'],
                ],
            );
        }
    }
}
