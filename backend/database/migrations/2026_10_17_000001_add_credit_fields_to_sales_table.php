<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * "Pay later" (credit) sales: the goods leave the counter now, the money comes in a day or
     * two later. Such a sale is still an ordinary completed sale — stock is consumed and the
     * revenue counts on the sale date — it just carries an outstanding balance until the
     * customer pays. Later payments are recorded as normal sale_payments rows.
     */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->string('customer_phone', 30)->nullable()->after('customer_name');
            $table->boolean('is_credit')->default(false)->after('change_amount');
            $table->enum('payment_status', ['paid', 'partial', 'unpaid'])->default('paid')->after('is_credit');
            $table->decimal('balance_due', 15, 2)->default(0)->after('payment_status');
            $table->timestamp('settled_at')->nullable()->after('balance_due');

            $table->index(['is_credit', 'payment_status']);
        });

        // The permission vocabulary is normally seeded, but an existing install won't re-run
        // the seeder — add the new key here and give it to the Administrator role so the
        // module is reachable straight after `php artisan migrate`.
        $now = now();
        DB::table('permissions')->updateOrInsert(
            ['key' => 'manage_receivables'],
            ['label' => 'Manage Pay-Later Invoices', 'group' => 'Point of Sale', 'created_at' => $now, 'updated_at' => $now],
        );
        $permissionId = DB::table('permissions')->where('key', 'manage_receivables')->value('id');
        $adminRoleId = DB::table('roles')->where('name', 'Administrator')->value('id');
        if ($adminRoleId && !DB::table('permission_role')->where(['permission_id' => $permissionId, 'role_id' => $adminRoleId])->exists()) {
            DB::table('permission_role')->insert(['permission_id' => $permissionId, 'role_id' => $adminRoleId]);
        }
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['is_credit', 'payment_status']);
            $table->dropColumn(['customer_phone', 'is_credit', 'payment_status', 'balance_due', 'settled_at']);
        });

        $permissionId = DB::table('permissions')->where('key', 'manage_receivables')->value('id');
        if ($permissionId) {
            DB::table('permission_role')->where('permission_id', $permissionId)->delete();
            DB::table('permissions')->where('id', $permissionId)->delete();
        }
    }
};
