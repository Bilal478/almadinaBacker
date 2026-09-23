<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateBusinessSettingRequest;
use App\Models\BusinessSetting;
use App\Services\Audit\AuditLogger;

class SettingsController extends Controller
{
    /** Readable by any authenticated user — the receipt/invoice needs it, not just admins. */
    public function show()
    {
        return $this->success(BusinessSetting::current());
    }

    public function update(UpdateBusinessSettingRequest $request)
    {
        $this->authorize('settings');

        $settings = BusinessSetting::current();
        $old = $settings->toArray();
        $settings->update($request->validated());

        AuditLogger::log('updated', 'settings', 'business_setting', $settings->id, $old, $settings->fresh()->toArray());

        return $this->success($settings->fresh(), 'Settings updated');
    }
}
