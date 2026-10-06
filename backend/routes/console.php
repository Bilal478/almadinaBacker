<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// One-time per server: creates the certificate QZ Tray uses to recognise this POS, so tills can
// tick "Remember this decision" once instead of being asked to Allow on every connection.
Artisan::command('qz:certificate {--force : Replace an existing certificate (every till must Allow again)}', function (\App\Services\Printing\QzSigner $signer) {
    if ($signer->hasCertificate() && !$this->option('force')) {
        $this->info('A QZ Tray certificate already exists — nothing to do. Use --force to replace it.');
        return;
    }
    $name = \App\Models\BusinessSetting::current()->store_name ?? config('app.name');
    $signer->generate($name ?: 'Bakery POS');
    $this->info("QZ Tray certificate created for \"{$name}\".");
    $this->line('Next: on each till, click Print once, tick "Remember this decision" and click Allow.');
})->purpose('Create the certificate used to sign QZ Tray printing requests');
