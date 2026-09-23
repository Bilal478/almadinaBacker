<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessSetting extends Model
{
    protected $fillable = [
        'store_name',
        'address',
        'phone',
        'email',
        'tax_id',
        'currency_code',
        'currency_symbol',
        'low_stock_alert_default',
        'receipt_footer',
    ];

    /** This table only ever has one row — id 1 — created by BusinessSettingSeeder. */
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1], ['store_name' => 'My Bakery']);
    }
}
