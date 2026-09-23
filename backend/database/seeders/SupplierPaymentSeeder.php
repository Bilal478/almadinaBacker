<?php

namespace Database\Seeders;

use App\Models\Supplier;
use App\Services\Suppliers\SupplierPaymentService;
use Illuminate\Database\Seeder;

class SupplierPaymentSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(SupplierPaymentService::class);
        $supplierId = fn (string $name) => Supplier::where('name', $name)->value('id');

        $payments = [
            ['supplier' => 'Al-Rehman Flour Mills', 'amount' => 50000, 'date' => '2026-01-20', 'reference' => 'PAY-1001', 'description' => 'Advance against January flour order', 'method' => 'CASH'],
            ['supplier' => 'Al-Rehman Flour Mills', 'amount' => 17400, 'date' => '2026-02-05', 'reference' => 'PAY-1002', 'description' => 'Balance settlement for PO-2026-00001', 'method' => 'BANK_TRANSFER'],
            ['supplier' => 'Al-Rehman Flour Mills', 'amount' => 30000, 'date' => '2026-09-15', 'reference' => 'PAY-1003', 'description' => 'Partial payment against PO-2026-00006', 'method' => 'BANK_TRANSFER'],
            ['supplier' => 'Nestle Milk & Dairy Distributors', 'amount' => 66000, 'date' => '2026-01-25', 'reference' => 'PAY-2001', 'description' => 'Full settlement for PO-2026-00003', 'method' => 'BANK_TRANSFER'],
            ['supplier' => 'Nestle Milk & Dairy Distributors', 'amount' => 69500, 'date' => '2026-09-18', 'reference' => 'PAY-2002', 'description' => 'Full settlement for PO-2026-00007', 'method' => 'BANK_TRANSFER'],
            ['supplier' => 'Al-Fateh Sugar Traders', 'amount' => 5000, 'date' => '2026-01-20', 'reference' => 'PAY-3001', 'description' => 'Partial payment for PO-2026-00002', 'method' => 'CASH'],
            ['supplier' => 'Al-Fateh Sugar Traders', 'amount' => 6000, 'date' => '2026-09-10', 'reference' => 'PAY-3002', 'description' => 'Partial payment for PO-2026-00005', 'method' => 'CASH'],
            ['supplier' => 'Punjab Fresh Beverages', 'amount' => 10000, 'date' => '2026-01-22', 'reference' => 'PAY-4001', 'description' => 'Partial payment for PO-2026-00004', 'method' => 'CASH'],
            ['supplier' => 'Crescent Packaging Co.', 'amount' => 3000, 'date' => '2026-02-10', 'reference' => 'PAY-5001', 'description' => 'Partial payment against opening balance for packaging boxes', 'method' => 'CASH'],
        ];

        foreach ($payments as $p) {
            $service->create(Supplier::findOrFail($supplierId($p['supplier'])), [
                'amount' => $p['amount'],
                'payment_date' => $p['date'],
                'reference' => $p['reference'],
                'description' => $p['description'],
                'payment_method' => $p['method'],
            ]);
        }
    }
}
