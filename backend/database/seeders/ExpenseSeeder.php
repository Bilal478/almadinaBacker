<?php

namespace Database\Seeders;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\User;
use Illuminate\Database\Seeder;

class ExpenseSeeder extends Seeder
{
    /** Scaled to this demo's sales volume — a full real-world rent/salary bill would dwarf ~30 seeded sales. */
    public function run(): void
    {
        foreach (['Rent', 'Utilities', 'Salaries', 'Maintenance', 'Transport', 'Miscellaneous'] as $name) {
            ExpenseCategory::updateOrCreate(['name' => $name], ['status' => 'active']);
        }

        $catId = fn (string $name) => ExpenseCategory::where('name', $name)->value('id');
        $admin = User::where('username', 'bilal.admin')->value('id');
        $manager = User::where('username', 'ayesha.manager')->value('id');

        $expenses = [
            ['2026-01-05', 'Rent', 'Shop rent — January', 5500, $admin],
            ['2026-01-10', 'Utilities', 'Electricity bill', 1500, $manager],
            ['2026-01-31', 'Salaries', 'Staff salaries — January', 11000, $admin],
            ['2026-02-05', 'Rent', 'Shop rent — February', 5500, $admin],
            ['2026-02-14', 'Maintenance', 'Oven repair and servicing', 1000, $manager],
            ['2026-02-28', 'Salaries', 'Staff salaries — February', 11000, $admin],
            ['2026-03-05', 'Rent', 'Shop rent — March', 5500, $admin],
            ['2026-03-18', 'Transport', 'Delivery van fuel and maintenance', 1800, $manager],
            ['2026-04-05', 'Rent', 'Shop rent — April', 5500, $admin],
            ['2026-04-20', 'Utilities', 'Gas bill', 1200, $manager],
            ['2026-05-05', 'Rent', 'Shop rent — May', 5600, $admin],
            ['2026-05-22', 'Miscellaneous', 'Packaging and stationery', 750, $manager],
            ['2026-06-05', 'Rent', 'Shop rent — June', 5600, $admin],
            ['2026-06-30', 'Salaries', 'Staff salaries — June', 11500, $admin],
            ['2026-07-05', 'Rent', 'Shop rent — July', 5600, $admin],
            ['2026-07-15', 'Utilities', 'Electricity bill', 1700, $manager],
            ['2026-08-05', 'Rent', 'Shop rent — August', 5600, $admin],
            ['2026-08-25', 'Maintenance', 'Refrigerator repair', 1300, $manager],
            ['2026-09-05', 'Rent', 'Shop rent — September', 5600, $admin],
            ['2026-09-10', 'Utilities', 'Electricity bill', 1600, $manager],
        ];

        foreach ($expenses as [$date, $category, $description, $amount, $createdBy]) {
            Expense::updateOrCreate(
                ['expense_date' => $date, 'description' => $description],
                ['category_id' => $catId($category), 'amount' => $amount, 'status' => 'active', 'created_by' => $createdBy],
            );
        }
    }
}
