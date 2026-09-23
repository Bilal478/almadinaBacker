<?php

namespace App\Providers;

use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\Sale;
use App\Models\SaleReturn;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // This MySQL install's default row format makes a full-length utf8mb4 unique
        // index (255 chars * 4 bytes) exceed the key length limit — cap it like older
        // MySQL/MariaDB setups require.
        Schema::defaultStringLength(191);

        // This app is API-only — there is no Laravel-named "login" route (the SPA's login
        // page lives entirely client-side). Without this, Laravel's default auth middleware
        // tries to redirect an unauthenticated request to route('login') whenever the
        // request doesn't send an explicit `Accept: application/json` header, which throws
        // RouteNotFoundException and turns a clean 401 into a generic 500. Returning null
        // here always throws the normal AuthenticationException instead, which bootstrap/
        // app.php's exception renderer turns into the intended 401 JSON response.
        Authenticate::redirectUsing(fn () => null);

        // Short, stable strings in inventory_movements.reference_type instead of full
        // namespaced class names.
        // Non-enforcing: only aliases the models inventory_movements.reference actually
        // points at. Sanctum's own tokenable morph (and anything else) is untouched —
        // enforceMorphMap() would wrongly demand every polymorphic relation in the app
        // register here, including Sanctum's internal one.
        Relation::morphMap([
            'purchase' => Purchase::class,
            'sale' => Sale::class,
            'sale_return' => SaleReturn::class,
            'purchase_return' => PurchaseReturn::class,
        ]);

        // Every permission key becomes a Gate ability, so both `$user->can('manage_products')`
        // and route middleware `can:manage_products` work without a Policy class per model —
        // this is role-based (a fixed permission vocabulary), not per-resource ownership, so
        // Gates are the correct fit rather than forcing artificial Policies onto it.
        foreach (Permissions::all() as $permission) {
            Gate::define($permission, fn (User $user) => $user->hasPermission($permission));
        }
    }
}
