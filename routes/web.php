<?php

use App\Http\Controllers\Accounting\AccountController;
use App\Http\Controllers\Accounting\ExpenseController;
use App\Http\Controllers\CashManagement\ShiftController;
use App\Http\Controllers\Customers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Delivery\DeliveryZoneController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\Inventory\InventoryController;
use App\Http\Controllers\Inventory\TransferController;
use App\Http\Controllers\Kitchen\KitchenDisplayController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\Loyalty\LoyaltyController;
use App\Http\Controllers\Menu\MenuController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\Orders\ReceiptController;
use App\Http\Controllers\Payments\PaymentWebhookController;
use App\Http\Controllers\Platform\AuditController as PlatformAuditController;
use App\Http\Controllers\Platform\DashboardController as PlatformDashboardController;
use App\Http\Controllers\Platform\ImpersonationController as PlatformImpersonationController;
use App\Http\Controllers\Platform\PlanController as PlatformPlanController;
use App\Http\Controllers\Platform\SubscriptionController as PlatformSubscriptionController;
use App\Http\Controllers\Platform\TenantController as PlatformTenantController;
use App\Http\Controllers\POS\PosController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Purchasing\PurchaseOrderController;
use App\Http\Controllers\Purchasing\SupplierController;
use App\Http\Controllers\Reporting\ReportController;
use App\Http\Controllers\Staff\AcceptInvitationController;
use App\Http\Controllers\Staff\ManagerPinController;
use App\Http\Controllers\Staff\StaffController;
use App\Http\Controllers\Tables\TableController;
use App\Http\Controllers\Waste\WasteController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// Public invitation acceptance (staff join via emailed link).
Route::middleware('guest')->group(function () {
    Route::get('/invitations/{token}', [AcceptInvitationController::class, 'show'])->name('invitations.accept');
    Route::post('/invitations/{token}', [AcceptInvitationController::class, 'store']);
});

// Lightweight readiness probe (no session; safe for load balancers/monitoring).
Route::get('/health', HealthController::class)->name('health');

// Payment provider webhooks (authenticated by signature, not session/CSRF).
Route::post('/webhooks/payments/{provider}', PaymentWebhookController::class)->name('webhooks.payments');

// Language switch (available to guests so auth screens can be localized too).
Route::post('/locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware('auth')->group(function () {
    Route::prefix('onboarding')->name('onboarding.')->group(function () {
        Route::get('/', [OnboardingController::class, 'index'])->name('index');
        Route::get('/{step}', [OnboardingController::class, 'show'])->name('show');
        Route::post('/company', [OnboardingController::class, 'storeCompany'])->name('company');
        Route::post('/branch', [OnboardingController::class, 'storeBranch'])->name('branch');
        Route::post('/hours', [OnboardingController::class, 'storeHours'])->name('hours');
        Route::post('/tax', [OnboardingController::class, 'storeTax'])->name('tax');
        Route::post('/receipt', [OnboardingController::class, 'storeReceipt'])->name('receipt');
        Route::post('/skip/{step}', [OnboardingController::class, 'skip'])->name('skip');
        Route::post('/complete', [OnboardingController::class, 'complete'])->name('complete');
    });

    Route::put('/profile/manager-pin', [ManagerPinController::class, 'update'])->name('profile.manager-pin');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::prefix('staff')->name('staff.')->group(function () {
        Route::get('/', [StaffController::class, 'index'])
            ->middleware('permission:staff.view')->name('index');

        Route::middleware('permission:staff.manage')->group(function () {
            Route::post('/', [StaffController::class, 'store'])->name('store');
            Route::patch('/{staff}', [StaffController::class, 'update'])->name('update');
            Route::post('/{staff}/deactivate', [StaffController::class, 'deactivate'])->name('deactivate');
            Route::post('/{staff}/reactivate', [StaffController::class, 'reactivate'])->name('reactivate');
            Route::post('/{staff}/revoke-sessions', [StaffController::class, 'revokeSessions'])->name('revoke-sessions');
            Route::post('/{staff}/password-reset', [StaffController::class, 'sendPasswordReset'])->name('password-reset');
            Route::post('/invitations/{invitation}/resend', [StaffController::class, 'resendInvitation'])->name('invitations.resend');
            Route::delete('/invitations/{invitation}', [StaffController::class, 'destroyInvitation'])->name('invitations.destroy');
        });
    });

    Route::prefix('menu')->name('menu.')->group(function () {
        Route::get('/', [MenuController::class, 'index'])
            ->middleware('permission:menu.view')->name('index');

        Route::middleware('permission:menu.manage')->group(function () {
            Route::post('/categories', [MenuController::class, 'storeCategory'])->name('categories.store');
            Route::patch('/categories/{category}', [MenuController::class, 'updateCategory'])->name('categories.update');
            Route::delete('/categories/{category}', [MenuController::class, 'destroyCategory'])->name('categories.destroy');
            Route::post('/products', [MenuController::class, 'storeProduct'])->name('products.store');
            Route::patch('/products/{product}', [MenuController::class, 'updateProduct'])->name('products.update');
            Route::delete('/products/{product}', [MenuController::class, 'destroyProduct'])->name('products.destroy');
        });
    });

    Route::prefix('inventory')->name('inventory.')->group(function () {
        Route::get('/', [InventoryController::class, 'index'])
            ->middleware('permission:inventory.view')->name('index');

        Route::middleware('permission:inventory.manage')->group(function () {
            Route::post('/units', [InventoryController::class, 'storeUnit'])->name('units.store');
            Route::patch('/units/{unit}', [InventoryController::class, 'updateUnit'])->name('units.update');
            Route::delete('/units/{unit}', [InventoryController::class, 'destroyUnit'])->name('units.destroy');
            Route::post('/ingredients', [InventoryController::class, 'storeIngredient'])->name('ingredients.store');
            Route::patch('/ingredients/{ingredient}', [InventoryController::class, 'updateIngredient'])->name('ingredients.update');
            Route::delete('/ingredients/{ingredient}', [InventoryController::class, 'destroyIngredient'])->name('ingredients.destroy');
        });

        Route::middleware('permission:inventory.adjust')->group(function () {
            Route::post('/opening', [InventoryController::class, 'storeOpening'])->name('opening');
            Route::post('/adjust', [InventoryController::class, 'adjust'])->name('adjust');
        });
    });

    Route::get('/pos', [PosController::class, 'index'])
        ->middleware('permission:pos.use')->name('pos.index');
    Route::post('/pos/orders', [PosController::class, 'store'])
        ->middleware('permission:pos.use')->name('pos.orders.store');
    Route::post('/pos/orders/open', [PosController::class, 'open'])
        ->middleware('permission:pos.use')->name('pos.orders.open');

    Route::middleware('permission:pos.use')->group(function () {
        Route::post('/shifts/open', [ShiftController::class, 'open'])->name('shifts.open');
        Route::post('/shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
        Route::post('/shifts/{shift}/movements', [ShiftController::class, 'movement'])->name('shifts.movements.store');
    });

    Route::get('/orders', [OrderController::class, 'index'])
        ->middleware('permission:orders.view')->name('orders.index');
    Route::get('/orders/{order}', [OrderController::class, 'show'])
        ->middleware('permission:orders.view')->name('orders.show');
    Route::get('/orders/{order}/receipt', [ReceiptController::class, 'show'])
        ->middleware('permission:orders.view')->name('orders.receipt');
    Route::post('/orders/{order}/void', [OrderController::class, 'void'])
        ->middleware('permission:orders.void')->name('orders.void');
    Route::post('/orders/{order}/settle', [OrderController::class, 'settle'])
        ->middleware('permission:pos.use')->name('orders.settle');
    Route::patch('/orders/{order}/fulfillment', [OrderController::class, 'updateFulfillment'])
        ->middleware('permission:orders.update')->name('orders.fulfillment');

    Route::prefix('kitchen')->name('kitchen.')->middleware('feature:kitchen')->group(function () {
        Route::middleware('permission:kitchen.view')->group(function () {
            Route::get('/', [KitchenDisplayController::class, 'index'])->name('index');
            Route::get('/tickets/{ticket}/print', [KitchenDisplayController::class, 'print'])->name('tickets.print');
        });

        Route::middleware('permission:kitchen.manage')->group(function () {
            Route::patch('/tickets/{ticket}', [KitchenDisplayController::class, 'setTicketStatus'])->name('tickets.status');
            Route::patch('/tickets/{ticket}/priority', [KitchenDisplayController::class, 'setPriority'])->name('tickets.priority');
            Route::patch('/items/{item}', [KitchenDisplayController::class, 'setItemStatus'])->name('items.status');
        });
    });

    Route::prefix('tables')->name('tables.')->group(function () {
        Route::get('/', [TableController::class, 'index'])
            ->middleware('permission:tables.view')->name('index');

        Route::middleware('permission:tables.manage')->group(function () {
            Route::post('/', [TableController::class, 'store'])->name('store');
            Route::post('/transfer', [TableController::class, 'transfer'])->name('transfer');
            Route::patch('/{table}', [TableController::class, 'update'])->name('update');
            Route::delete('/{table}', [TableController::class, 'destroy'])->name('destroy');
            Route::patch('/{table}/status', [TableController::class, 'setStatus'])->name('status');
        });
    });

    Route::prefix('purchasing')->name('purchasing.')->middleware('feature:purchasing')->group(function () {
        Route::middleware('permission:purchasing.view')->group(function () {
            Route::get('/orders', [PurchaseOrderController::class, 'index'])->name('orders.index');
            Route::get('/orders/{order}', [PurchaseOrderController::class, 'show'])->name('orders.show');
        });

        Route::middleware('permission:purchasing.manage')->group(function () {
            Route::post('/orders', [PurchaseOrderController::class, 'store'])->name('orders.store');
            Route::patch('/orders/{order}', [PurchaseOrderController::class, 'update'])->name('orders.update');
            Route::post('/orders/{order}/submit', [PurchaseOrderController::class, 'submit'])->name('orders.submit');
            Route::post('/orders/{order}/receive', [PurchaseOrderController::class, 'receive'])->name('orders.receive');
            Route::post('/orders/{order}/payments', [PurchaseOrderController::class, 'pay'])->name('orders.pay');
            Route::post('/orders/{order}/cancel', [PurchaseOrderController::class, 'cancel'])->name('orders.cancel');
            Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
            Route::patch('/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
            Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');
        });

        Route::post('/orders/{order}/approve', [PurchaseOrderController::class, 'approve'])
            ->middleware('permission:purchasing.approve')->name('orders.approve');
    });

    Route::prefix('waste')->name('waste.')->middleware('feature:waste')->group(function () {
        Route::get('/', [WasteController::class, 'index'])
            ->middleware('permission:waste.view')->name('index');
        Route::post('/', [WasteController::class, 'store'])
            ->middleware('permission:waste.create')->name('store');
        Route::post('/{record}/approve', [WasteController::class, 'approve'])
            ->middleware('permission:waste.approve')->name('approve');
        Route::post('/{record}/reject', [WasteController::class, 'reject'])
            ->middleware('permission:waste.approve')->name('reject');
    });

    Route::prefix('transfers')->name('transfers.')->group(function () {
        Route::get('/', [TransferController::class, 'index'])
            ->middleware('permission:inventory.view')->name('index');

        Route::middleware('permission:inventory.manage')->group(function () {
            Route::post('/', [TransferController::class, 'store'])->name('store');
            Route::post('/{transfer}/dispatch', [TransferController::class, 'dispatch'])->name('dispatch');
            Route::post('/{transfer}/receive', [TransferController::class, 'receive'])->name('receive');
            Route::post('/{transfer}/cancel', [TransferController::class, 'cancel'])->name('cancel');
        });

        Route::post('/{transfer}/approve', [TransferController::class, 'approve'])
            ->middleware('permission:inventory.approve')->name('approve');
    });

    Route::prefix('expenses')->name('expenses.')->group(function () {
        Route::get('/', [ExpenseController::class, 'index'])
            ->middleware('permission:expenses.view')->name('index');

        Route::middleware('permission:expenses.manage')->group(function () {
            Route::post('/', [ExpenseController::class, 'store'])->name('store');
            Route::post('/categories', [ExpenseController::class, 'storeCategory'])->name('categories.store');
        });

        Route::middleware('permission:expenses.approve')->group(function () {
            Route::post('/{expense}/approve', [ExpenseController::class, 'approve'])->name('approve');
            Route::post('/{expense}/reject', [ExpenseController::class, 'reject'])->name('reject');
        });
    });

    Route::prefix('accounts')->name('accounts.')->group(function () {
        Route::get('/', [AccountController::class, 'index'])
            ->middleware('permission:accounts.view')->name('index');

        Route::middleware('permission:accounts.manage')->group(function () {
            Route::post('/', [AccountController::class, 'store'])->name('store');
            Route::post('/transfer', [AccountController::class, 'transfer'])->name('transfer');
            Route::patch('/{account}', [AccountController::class, 'update'])->name('update');
            Route::delete('/{account}', [AccountController::class, 'destroy'])->name('destroy');
        });
    });

    Route::get('/reports', [ReportController::class, 'index'])
        ->middleware('permission:reports.view')->name('reports.index');

    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');

    Route::prefix('customers')->name('customers.')->group(function () {
        Route::get('/', [CustomerController::class, 'index'])
            ->middleware('permission:customers.view')->name('index');

        Route::middleware('permission:customers.manage')->group(function () {
            Route::post('/', [CustomerController::class, 'store'])->name('store');
            Route::patch('/{customer}', [CustomerController::class, 'update'])->name('update');
            Route::delete('/{customer}', [CustomerController::class, 'destroy'])->name('destroy');
            Route::post('/{customer}/points', [LoyaltyController::class, 'adjust'])->name('points');
        });
    });

    Route::prefix('delivery-zones')->name('delivery-zones.')->middleware('permission:settings.manage')->group(function () {
        Route::get('/', [DeliveryZoneController::class, 'index'])->name('index');
        Route::post('/', [DeliveryZoneController::class, 'store'])->name('store');
        Route::patch('/{deliveryZone}', [DeliveryZoneController::class, 'update'])->name('update');
        Route::delete('/{deliveryZone}', [DeliveryZoneController::class, 'destroy'])->name('destroy');
    });
});

Route::middleware(['auth', 'platform'])->prefix('platform')->name('platform.')->group(function () {
    Route::get('/', [PlatformDashboardController::class, 'index'])->name('dashboard');

    Route::get('/tenants', [PlatformTenantController::class, 'index'])->name('tenants.index');
    Route::get('/tenants/{tenant}', [PlatformTenantController::class, 'show'])->name('tenants.show');
    Route::post('/tenants/{tenant}/activate', [PlatformTenantController::class, 'activate'])->name('tenants.activate');
    Route::post('/tenants/{tenant}/suspend', [PlatformTenantController::class, 'suspend'])->name('tenants.suspend');

    Route::get('/plans', [PlatformPlanController::class, 'index'])->name('plans.index');
    Route::post('/plans', [PlatformPlanController::class, 'store'])->name('plans.store');
    Route::patch('/plans/{plan}', [PlatformPlanController::class, 'update'])->name('plans.update');

    Route::post('/subscriptions/{subscription}/plan', [PlatformSubscriptionController::class, 'changePlan'])->name('subscriptions.plan');
    Route::post('/subscriptions/{subscription}/suspend', [PlatformSubscriptionController::class, 'suspend'])->name('subscriptions.suspend');
    Route::post('/subscriptions/{subscription}/reactivate', [PlatformSubscriptionController::class, 'reactivate'])->name('subscriptions.reactivate');
    Route::post('/subscriptions/{subscription}/cancel', [PlatformSubscriptionController::class, 'cancel'])->name('subscriptions.cancel');
    Route::post('/subscriptions/{subscription}/renew', [PlatformSubscriptionController::class, 'renew'])->name('subscriptions.renew');
    Route::post('/invoices/{invoice}/pay', [PlatformSubscriptionController::class, 'payInvoice'])->name('invoices.pay');

    Route::get('/audit', [PlatformAuditController::class, 'index'])->name('audit.index');

    Route::post('/tenants/{tenant}/impersonate', [PlatformImpersonationController::class, 'start'])->name('impersonate.start');
});

// Reachable while impersonating (the session is a tenant user, not a platform admin).
Route::middleware('auth')->post('/platform/impersonate/stop', [PlatformImpersonationController::class, 'stop'])
    ->name('platform.impersonate.stop');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
