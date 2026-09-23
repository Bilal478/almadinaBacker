<?php

namespace Database\Seeders;

use App\Models\BusinessSetting;
use Illuminate\Database\Seeder;

class BusinessSettingSeeder extends Seeder
{
    /** Required system configuration, not demo data — every install needs exactly one row here. */
    public function run(): void
    {
        BusinessSetting::firstOrCreate(['id' => 1], [
            'store_name' => env('STORE_NAME', 'My Bakery'),
            'address' => env('STORE_ADDRESS'),
            'phone' => env('STORE_PHONE'),
            'email' => env('STORE_EMAIL'),
            'tax_id' => env('STORE_TAX_ID'),
            'currency_code' => env('STORE_CURRENCY_CODE', 'PKR'),
            'currency_symbol' => env('STORE_CURRENCY_SYMBOL', 'Rs.'),
            'low_stock_alert_default' => 10,
            'receipt_footer' => 'Thank you for your business!',
        ]);
    }
}
