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
use App\Http\Controllers\MarketingController;
use App\Http\Controllers\Menu\MenuController;
use App\Http\Controllers\Menu\ModifierController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Onboarding\OnboardingController;
use App\Http\Controllers\Tenant\SettingsController as TenantSettingsController;
use App\Http\Controllers\Tenant\BranchController as TenantBranchController;
use App\Http\Controllers\Orders\OrderController;
use App\Http\Controllers\Orders\ReceiptController;
use App\Http\Controllers\Payments\PaymentWebhookController;
use App\Http\Controllers\Payments\PlatformCallbackController;
use App\Http\Controllers\Platform\AdminController as PlatformAdminController;
use App\Http\Controllers\Platform\AnalyticsController as PlatformAnalyticsController;
use App\Http\Controllers\Platform\AuditController as PlatformAuditController;
use App\Http\Controllers\Platform\BackupController as PlatformBackupController;
use App\Http\Controllers\Platform\CouponController as PlatformCouponController;
use App\Http\Controllers\Platform\DashboardController as PlatformDashboardController;
use App\Http\Controllers\Platform\DiagnosticsController as PlatformDiagnosticsController;
use App\Http\Controllers\Platform\EmailController as PlatformEmailController;
use App\Http\Controllers\Platform\EmailTemplateController as PlatformEmailTemplateController;
use App\Http\Controllers\Platform\CampaignController as PlatformCampaignController;
use App\Http\Controllers\Platform\AnnouncementController as PlatformAnnouncementController;
use App\Http\Controllers\Platform\CommandController as PlatformCommandController;
use App\Http\Controllers\Platform\EntitlementsController as PlatformEntitlementsController;
use App\Http\Controllers\Platform\GatewayController as PlatformGatewayController;
use App\Http\Controllers\Platform\GatewayEventController as PlatformGatewayEventController;
use App\Http\Controllers\Platform\ImpersonationController as PlatformImpersonationController;
use App\Http\Controllers\Platform\InvoiceController as PlatformInvoiceController;
use App\Http\Controllers\Platform\NotificationController as PlatformNotificationController;
use App\Http\Controllers\Platform\OpsController as PlatformOpsController;
use App\Http\Controllers\Platform\PaymentController as PlatformPaymentController;
use App\Http\Controllers\Platform\PlanController as PlatformPlanController;
use App\Http\Controllers\Platform\RestoreController as PlatformRestoreController;
use App\Http\Controllers\Platform\RoleController as PlatformRoleController;
use App\Http\Controllers\Platform\SecurityController as PlatformSecurityController;
use App\Http\Controllers\Platform\SessionController as PlatformSessionController;
use App\Http\Controllers\Platform\SettingsController as PlatformSettingsController;
use App\Http\Controllers\Platform\SubscriptionController as PlatformSubscriptionController;
use App\Http\Controllers\Platform\SupportTicketController as PlatformSupportTicketController;
use App\Http\Controllers\Platform\TenantController as PlatformTenantController;
use App\Http\Controllers\Platform\UsageController as PlatformUsageController;
use App\Http\Controllers\POS\PosController;
use App\Http\Controllers\QrDining\QrEntryController;
use App\Http\Controllers\QrDining\QrMenuController;
use App\Http\Controllers\QrDining\QrOrderController;
use App\Http\Controllers\QrDining\QrSessionController;
use App\Http\Controllers\QrDining\QrTableController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Purchasing\PurchaseOrderController;
use App\Http\Controllers\Purchasing\SupplierController;
use App\Http\Controllers\Reporting\ReportController;
use App\Http\Controllers\Staff\AcceptInvitationController;
use App\Http\Controllers\Staff\ManagerPinController;
use App\Http\Controllers\Staff\StaffController;
use App\Http\Controllers\Subscription\SubscriptionController as TenantSubscriptionController;
use App\Http\Controllers\Tables\TableController;
use App\Http\Controllers\Waste\WasteController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public marketing & product routes
Route::get('/', [MarketingController::class, 'index'])->name('home');
Route::get('/product', [MarketingController::class, 'product'])->name('product');
Route::get('/features', [MarketingController::class, 'features'])->name('features.index');
Route::get('/features/{feature}', [MarketingController::class, 'feature'])->name('features.show');
Route::get('/solutions', [MarketingController::class, 'solutions'])->name('solutions.index');
Route::get('/solutions/{solution}', [MarketingController::class, 'solution'])->name('solutions.show');
Route::get('/pricing', [MarketingController::class, 'pricing'])->name('pricing');
Route::get('/about', [MarketingController::class, 'about'])->name('about');
Route::get('/contact', [MarketingController::class, 'contact'])->name('contact');
Route::post('/contact', [MarketingController::class, 'contactSubmit'])->name('contact.submit');
Route::get('/resources', [MarketingController::class, 'resources'])->name('resources.index');
Route::get('/resources/{slug}', [MarketingController::class, 'resourceArticle'])->name('resources.show');
Route::get('/help', [MarketingController::class, 'help'])->name('help');
Route::get('/privacy-policy', [MarketingController::class, 'privacyPolicy'])->name('privacy');
Route::get('/terms-of-service', [MarketingController::class, 'termsOfService'])->name('terms');
Route::get('/cookie-policy', [MarketingController::class, 'cookiePolicy'])->name('cookies');
Route::get('/refund-policy', [MarketingController::class, 'refundPolicy'])->name('refund');
Route::get('/sitemap.xml', function () {
    return response(file_get_contents(public_path('sitemap.xml')), 200, ['Content-Type' => 'application/xml']);
});
Route::get('/robots.txt', function () {
    return response(file_get_contents(public_path('robots.txt')), 200, ['Content-Type' => 'text/plain']);
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

// Platform subscription payment gateway callbacks (browser return + server IPN).
Route::get('/payments/result', [PlatformCallbackController::class, 'result'])->name('payments.result');
Route::match(['get', 'post'], '/payments/callback/{provider}/{result}', [PlatformCallbackController::class, 'callback'])->name('payments.callback');
Route::post('/payments/ipn/{provider}', [PlatformCallbackController::class, 'ipn'])->name('payments.ipn');

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
    Route::post('/branch/switch', function (\Illuminate\Http\Request $request) {
        $request->validate(['branch_id' => 'required|integer']);
        $user = $request->user();
        if ($user && $user->canAccessBranch($request->integer('branch_id'))) {
            $request->session()->put('active_branch_id', $request->integer('branch_id'));
        }
        return back();
    })->name('branch.switch');
});

/*
|--------------------------------------------------------------------------
| Public QR Dining (app-less ordering)
|--------------------------------------------------------------------------
| Unauthenticated. The QR token resolves the tenant/branch/table server-side;
| the dining session travels in an HttpOnly cookie. Rate limited per IP.
*/
Route::prefix('qr')->name('qr.')->middleware(['qr.context', 'throttle:qr-public'])->group(function () {
    Route::get('{token}', [QrEntryController::class, 'show'])->name('entry');

    Route::post('{token}/session', [QrSessionController::class, 'store'])
        ->middleware('throttle:qr-session')->name('session.start');

    Route::middleware('qr.session')->group(function () {
        Route::get('{token}/menu', [QrMenuController::class, 'show'])->name('menu');
        Route::post('{token}/orders', [QrOrderController::class, 'store'])
            ->middleware('throttle:qr-order')->name('orders.store');
        Route::delete('{token}/session', [QrSessionController::class, 'destroy'])->name('session.destroy');
    });
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

    Route::prefix('modifiers')->name('modifiers.')->group(function () {
        Route::get('/', [ModifierController::class, 'index'])
            ->middleware('permission:modifiers.view')->name('index');

        Route::middleware('permission:modifiers.manage')->group(function () {
            Route::post('/groups', [ModifierController::class, 'storeGroup'])->name('groups.store');
            Route::patch('/groups/{group}', [ModifierController::class, 'updateGroup'])->name('groups.update');
            Route::delete('/groups/{group}', [ModifierController::class, 'destroyGroup'])->name('groups.destroy');
            Route::post('/options', [ModifierController::class, 'storeOption'])->name('options.store');
            Route::patch('/options/{option}', [ModifierController::class, 'updateOption'])->name('options.update');
            Route::delete('/options/{option}', [ModifierController::class, 'destroyOption'])->name('options.destroy');
        });
    });

    Route::prefix('qr-dining')->name('qr-dining.')->middleware('feature:qr_dining')->group(function () {
        Route::get('/tables', [QrTableController::class, 'index'])
            ->middleware('permission:qr.view')->name('tables.index');
        Route::get('/tables/print', [QrTableController::class, 'print'])
            ->middleware('permission:qr.view')->name('tables.print');
        Route::get('/tables/{table}/qr', [QrTableController::class, 'qr'])
            ->middleware('permission:qr.view')->name('tables.qr');

        Route::middleware('permission:qr.manage')->group(function () {
            Route::post('/tables/{table}/regenerate', [QrTableController::class, 'regenerate'])->name('tables.regenerate');
            Route::post('/tables/{table}/revoke', [QrTableController::class, 'revoke'])->name('tables.revoke');
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
    Route::post('/orders/{order}/accept', [OrderController::class, 'accept'])
        ->middleware('permission:orders.update')->name('orders.accept');
    Route::post('/orders/{order}/reject', [OrderController::class, 'reject'])
        ->middleware('permission:orders.update')->name('orders.reject');

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

    Route::prefix('branches')->name('branches.')->group(function () {
        Route::get('/', [TenantBranchController::class, 'index'])
            ->middleware('permission:branches.view')->name('index');

        Route::middleware('permission:branches.manage')->group(function () {
            Route::post('/', [TenantBranchController::class, 'store'])->name('store');
            Route::patch('/{branch}', [TenantBranchController::class, 'update'])->name('update');
            Route::post('/{branch}/deactivate', [TenantBranchController::class, 'deactivate'])->name('deactivate');
            Route::post('/{branch}/activate', [TenantBranchController::class, 'activate'])->name('activate');
            Route::post('/{branch}/primary', [TenantBranchController::class, 'setPrimary'])->name('primary');
        });
    });

    Route::prefix('settings')->name('settings.')->middleware('permission:settings.manage')->group(function () {
        Route::get('/', [TenantSettingsController::class, 'index'])->name('index');
        Route::get('/{group}', [TenantSettingsController::class, 'show'])->name('show');
        Route::post('/{group}', [TenantSettingsController::class, 'update'])->name('update');
    });

    Route::prefix('subscription')->name('subscription.')->group(function () {
        Route::get('/', [TenantSubscriptionController::class, 'index'])
            ->middleware('permission:subscription.view')->name('index');
        Route::post('/plan', [TenantSubscriptionController::class, 'changePlan'])
            ->middleware('permission:subscription.manage')->name('plan');
        Route::post('/invoices/{invoice}/pay', [TenantSubscriptionController::class, 'payInvoice'])
            ->middleware('permission:subscription.manage')->name('pay');
    });
});

Route::middleware(['auth', 'platform'])->prefix('platform')->name('platform.')->group(function () {
    Route::get('/', [PlatformDashboardController::class, 'index'])
        ->middleware('platform.permission:platform.dashboard.view')->name('dashboard');

    Route::get('/analytics', [PlatformAnalyticsController::class, 'index'])
        ->middleware('platform.permission:platform.dashboard.view')->name('analytics.index');

    Route::middleware('platform.permission:platform.tenants.view')->group(function () {
        Route::get('/tenants', [PlatformTenantController::class, 'index'])->name('tenants.index');
        Route::get('/tenants/export', [PlatformTenantController::class, 'export'])->name('tenants.export');
        Route::get('/tenants/verification', [PlatformTenantController::class, 'verification'])->name('tenants.verification');
        Route::get('/tenants/{tenant}', [PlatformTenantController::class, 'show'])->name('tenants.show');
    });

    Route::middleware('platform.permission:platform.tenants.manage')->group(function () {
        Route::post('/tenants/bulk', [PlatformTenantController::class, 'bulk'])->name('tenants.bulk');
        Route::post('/tenants/{tenant}/verify', [PlatformTenantController::class, 'verify'])->name('tenants.verify');
        Route::post('/tenants/{tenant}/activate', [PlatformTenantController::class, 'activate'])->name('tenants.activate');
        Route::post('/tenants/{tenant}/archive', [PlatformTenantController::class, 'archive'])->name('tenants.archive');
    });
    Route::post('/tenants/{tenant}/suspend', [PlatformTenantController::class, 'suspend'])
        ->middleware('platform.permission:platform.tenants.suspend')->name('tenants.suspend');

    Route::middleware('platform.permission:platform.support.view')->group(function () {
        Route::get('/support', [PlatformSupportTicketController::class, 'index'])->name('support.index');
        Route::get('/support/{ticket}', [PlatformSupportTicketController::class, 'show'])->name('support.show');
    });
    Route::middleware('platform.permission:platform.support.manage')->group(function () {
        Route::post('/support', [PlatformSupportTicketController::class, 'store'])->name('support.store');
        Route::post('/support/{ticket}/reply', [PlatformSupportTicketController::class, 'reply'])->name('support.reply');
        Route::post('/support/{ticket}/status', [PlatformSupportTicketController::class, 'updateStatus'])->name('support.status');
    });

    Route::get('/plans', [PlatformPlanController::class, 'index'])
        ->middleware('platform.permission:platform.plans.view')->name('plans.index');
    Route::get('/plans/create', [PlatformPlanController::class, 'create'])
        ->middleware('platform.permission:platform.plans.manage')->name('plans.create');
    Route::get('/plans/{plan}/edit', [PlatformPlanController::class, 'edit'])
        ->middleware('platform.permission:platform.plans.manage')->name('plans.edit');
    Route::post('/plans', [PlatformPlanController::class, 'store'])
        ->middleware('platform.permission:platform.plans.manage')->name('plans.store');
    Route::patch('/plans/{plan}', [PlatformPlanController::class, 'update'])
        ->middleware('platform.permission:platform.plans.manage')->name('plans.update');
    Route::post('/plans/{plan}/archive', [PlatformPlanController::class, 'archive'])
        ->middleware('platform.permission:platform.plans.manage')->name('plans.archive');
    Route::delete('/plans/{plan}', [PlatformPlanController::class, 'destroy'])
        ->middleware('platform.permission:platform.plans.manage')->name('plans.destroy');

    Route::middleware('platform.permission:platform.subscriptions.view')->group(function () {
        Route::get('/subscriptions', [PlatformSubscriptionController::class, 'index'])->name('subscriptions.index');
        Route::get('/subscriptions/trials', [PlatformSubscriptionController::class, 'trials'])->name('subscriptions.trials');
        Route::get('/subscriptions/past-due', [PlatformSubscriptionController::class, 'pastDue'])->name('subscriptions.past-due');
        Route::get('/subscriptions/cancellations', [PlatformSubscriptionController::class, 'cancellations'])->name('subscriptions.cancellations');
        Route::get('/usage', [PlatformUsageController::class, 'index'])->name('usage.index');
        Route::get('/coupons', [PlatformCouponController::class, 'index'])->name('coupons.index');
    });

    Route::middleware('platform.permission:platform.subscriptions.manage')->group(function () {
        Route::post('/subscriptions/{subscription}/plan', [PlatformSubscriptionController::class, 'changePlan'])->name('subscriptions.plan');
        Route::post('/subscriptions/{subscription}/suspend', [PlatformSubscriptionController::class, 'suspend'])->name('subscriptions.suspend');
        Route::post('/subscriptions/{subscription}/reactivate', [PlatformSubscriptionController::class, 'reactivate'])->name('subscriptions.reactivate');
        Route::post('/subscriptions/{subscription}/cancel', [PlatformSubscriptionController::class, 'cancel'])->name('subscriptions.cancel');
        Route::post('/subscriptions/{subscription}/schedule-cancel', [PlatformSubscriptionController::class, 'scheduleCancel'])->name('subscriptions.schedule-cancel');
        Route::post('/subscriptions/{subscription}/renew', [PlatformSubscriptionController::class, 'renew'])->name('subscriptions.renew');
        Route::post('/subscriptions/{subscription}/retry', [PlatformSubscriptionController::class, 'retryRenewal'])->name('subscriptions.retry');
        Route::post('/subscriptions/{subscription}/coupon', [PlatformSubscriptionController::class, 'applyCoupon'])->name('subscriptions.coupon.apply');
        Route::delete('/subscriptions/{subscription}/coupon', [PlatformSubscriptionController::class, 'removeCoupon'])->name('subscriptions.coupon.remove');

        Route::post('/coupons', [PlatformCouponController::class, 'store'])->name('coupons.store');
        Route::patch('/coupons/{coupon}', [PlatformCouponController::class, 'update'])->name('coupons.update');
        Route::delete('/coupons/{coupon}', [PlatformCouponController::class, 'destroy'])->name('coupons.destroy');
    });

    Route::post('/invoices/{invoice}/pay', [PlatformSubscriptionController::class, 'payInvoice'])
        ->middleware('platform.permission:platform.invoices.manage')->name('invoices.pay');

    Route::middleware('platform.permission:platform.invoices.view')->group(function () {
        Route::get('/invoices', [PlatformInvoiceController::class, 'index'])->name('billing.invoices.index');
        Route::get('/invoices/{invoice}', [PlatformInvoiceController::class, 'show'])->name('billing.invoices.show');
        Route::get('/invoices/{invoice}/document', [PlatformInvoiceController::class, 'document'])->name('billing.invoices.document');
    });
    Route::middleware('platform.permission:platform.invoices.manage')->group(function () {
        Route::post('/invoices/{invoice}/send', [PlatformInvoiceController::class, 'send'])->name('billing.invoices.send');
        Route::post('/invoices/{invoice}/credit-notes', [PlatformInvoiceController::class, 'creditNote'])->name('billing.invoices.credit-notes');
        Route::post('/invoices/{invoice}/adjustments', [PlatformInvoiceController::class, 'adjustment'])->name('billing.invoices.adjustments');
        Route::post('/invoices/{invoice}/checkout', [PlatformInvoiceController::class, 'checkout'])->name('billing.invoices.checkout');
    });

    Route::get('/payments/webhooks', [PlatformGatewayEventController::class, 'index'])
        ->middleware('platform.permission:platform.webhooks.manage')->name('payments.webhooks');
    Route::get('/payments/gateway-transactions', [PlatformPaymentController::class, 'index'])
        ->middleware('platform.permission:platform.payments.view')->name('payments.transactions');
    Route::get('/billing/refunds', [PlatformPaymentController::class, 'refunds'])
        ->middleware('platform.permission:platform.refunds.manage')->name('billing.refunds');
    Route::get('/billing/settlements', [PlatformPaymentController::class, 'index'])
        ->middleware('platform.permission:platform.payments.view')->name('billing.settlements');

    Route::middleware('platform.permission:platform.payments.view')->group(function () {
        Route::get('/payments', [PlatformPaymentController::class, 'index'])->name('billing.payments.index');
        Route::get('/payments/{payment}', [PlatformPaymentController::class, 'show'])->name('billing.payments.show');
    });
    Route::post('/payments/{payment}/refund', [PlatformPaymentController::class, 'refund'])
        ->middleware('platform.permission:platform.refunds.manage')->name('billing.payments.refund');
    Route::post('/payments/{payment}/settle', [PlatformPaymentController::class, 'settle'])
        ->middleware('platform.permission:platform.payments.manage')->name('billing.payments.settle');

    Route::middleware('platform.permission:platform.gateways.configure')->group(function () {
        Route::get('/gateways', [PlatformGatewayController::class, 'index'])->name('gateways.index');
        Route::get('/gateways/sslcommerz', [PlatformGatewayController::class, 'sslcommerz'])->name('gateways.sslcommerz');
        Route::get('/gateways/health', [PlatformGatewayController::class, 'index'])->name('gateways.health');
        Route::post('/gateways', [PlatformGatewayController::class, 'store'])->name('gateways.store');
        Route::patch('/gateways/{gateway}', [PlatformGatewayController::class, 'update'])->name('gateways.update');
        Route::post('/gateways/{gateway}/toggle', [PlatformGatewayController::class, 'toggle'])->name('gateways.toggle');
        Route::post('/gateways/{gateway}/default', [PlatformGatewayController::class, 'setDefault'])->name('gateways.default');
        Route::post('/gateways/{gateway}/test', [PlatformGatewayController::class, 'test'])->name('gateways.test');
        Route::delete('/gateways/{gateway}', [PlatformGatewayController::class, 'destroy'])->name('gateways.destroy');
    });

    Route::middleware('platform.permission:platform.email.view')->group(function () {
        Route::get('/email', [PlatformEmailController::class, 'index'])->name('email.dashboard');
        Route::get('/email/logs', [PlatformEmailController::class, 'logs'])->name('email.logs');
        Route::get('/email/failed', [PlatformEmailController::class, 'failed'])->name('email.failed');
    });
    Route::middleware('platform.permission:platform.email.manage')->group(function () {
        Route::get('/email/settings', [PlatformEmailController::class, 'settings'])->name('email.settings');
        Route::post('/email/settings', [PlatformEmailController::class, 'updateSettings'])->name('email.settings.update');
        Route::post('/email/test', [PlatformEmailController::class, 'testEmail'])->name('email.test');
        Route::post('/email/logs/{log}/retry', [PlatformEmailController::class, 'retry'])->name('email.retry');
    });

    Route::middleware('platform.permission:platform.monitoring.view')->group(function () {
        Route::get('/ops/queue', [PlatformOpsController::class, 'queue'])->name('ops.queue');
        Route::get('/ops/failed-jobs', [PlatformOpsController::class, 'queue'])->name('ops.failed-jobs');
        Route::get('/ops/schedule', [PlatformOpsController::class, 'schedule'])->name('ops.schedule');
        Route::get('/ops/health', [PlatformOpsController::class, 'health'])->name('ops.health');
        Route::post('/ops/failed-jobs/retry-all', [PlatformOpsController::class, 'retryAllFailed'])->name('ops.failed-jobs.retry-all');
        Route::post('/ops/failed-jobs/{id}/retry', [PlatformOpsController::class, 'retryFailedJob'])->name('ops.failed-jobs.retry');
        Route::delete('/ops/failed-jobs/{id}', [PlatformOpsController::class, 'deleteFailedJob'])->name('ops.failed-jobs.destroy');
    });
    Route::get('/ops/logs', [PlatformOpsController::class, 'logs'])
        ->middleware('platform.permission:platform.logs.view')->name('ops.logs');

    Route::get('/maintenance', [PlatformOpsController::class, 'maintenance'])
        ->middleware('platform.permission:platform.maintenance.view')->name('maintenance');
    Route::post('/maintenance', [PlatformOpsController::class, 'updateMaintenance'])
        ->middleware('platform.permission:platform.maintenance.manage')->name('maintenance.update');

    Route::middleware('platform.permission:platform.backups.view')->group(function () {
        Route::get('/backups', [PlatformBackupController::class, 'index'])->name('backups.index');
        Route::get('/backups/tenants', [PlatformBackupController::class, 'tenants'])->name('backups.tenants');
        Route::get('/backups/{backup}/download', [PlatformBackupController::class, 'download'])->name('backups.download');
        Route::get('/restores', [PlatformRestoreController::class, 'index'])->name('restores.index');
        Route::get('/restores/{restore}', [PlatformRestoreController::class, 'show'])->name('restores.show');
    });
    Route::middleware('platform.permission:platform.backups.create')->group(function () {
        Route::post('/backups/platform', [PlatformBackupController::class, 'storePlatform'])->name('backups.platform');
        Route::post('/backups/tenant/{tenant}', [PlatformBackupController::class, 'storeTenant'])->name('backups.tenant');
        Route::post('/backups/prune', [PlatformBackupController::class, 'prune'])->name('backups.prune');
        Route::post('/backups/{backup}/verify', [PlatformBackupController::class, 'verify'])->name('backups.verify');
        Route::delete('/backups/{backup}', [PlatformBackupController::class, 'destroy'])->name('backups.destroy');
    });
    Route::middleware('platform.permission:platform.backups.restore')->group(function () {
        Route::post('/restores', [PlatformRestoreController::class, 'store'])->name('restores.store');
        Route::post('/restores/{restore}/execute', [PlatformRestoreController::class, 'execute'])->name('restores.execute');
    });

    Route::middleware('platform.permission:platform.admins.manage')->group(function () {
        Route::get('/admins', [PlatformAdminController::class, 'index'])->name('admins.index');
        Route::post('/admins', [PlatformAdminController::class, 'store'])->name('admins.store');
        Route::patch('/admins/{admin}', [PlatformAdminController::class, 'update'])->name('admins.update');
        Route::post('/admins/{admin}/deactivate', [PlatformAdminController::class, 'deactivate'])->name('admins.deactivate');
        Route::post('/admins/{admin}/reactivate', [PlatformAdminController::class, 'reactivate'])->name('admins.reactivate');
        Route::post('/admins/{admin}/revoke-sessions', [PlatformAdminController::class, 'revokeSessions'])->name('admins.revoke-sessions');
    });

    Route::middleware('platform.permission:platform.roles.manage')->group(function () {
        Route::get('/roles', [PlatformRoleController::class, 'index'])->name('roles.index');
        Route::patch('/roles/{role}', [PlatformRoleController::class, 'update'])->name('roles.update');
    });

    Route::middleware('platform.permission:platform.security.view')->group(function () {
        Route::get('/sessions', [PlatformSessionController::class, 'index'])->name('sessions.index');
        Route::delete('/sessions/{id}', [PlatformSessionController::class, 'destroy'])->name('sessions.destroy');
        Route::get('/security-events', [PlatformSecurityController::class, 'index'])->name('security.index');
    });

    Route::get('/audit/export', [PlatformAuditController::class, 'export'])
        ->middleware('platform.permission:platform.audit.view')->name('audit.export');
    Route::get('/impersonation-history', [PlatformAuditController::class, 'impersonation'])
        ->middleware('platform.permission:platform.audit.view')->name('impersonation.index');

    Route::middleware('platform.permission:platform.settings.view')->group(function () {
        foreach ([
            'general', 'branding', 'localization', 'billing', 'payments',
            'operations', 'security', 'retention', 'features',
        ] as $settingsGroup) {
            Route::get("/settings/{$settingsGroup}", [PlatformSettingsController::class, 'show'])
                ->defaults('group', $settingsGroup)
                ->name("settings.{$settingsGroup}");
        }
    });
    Route::post('/settings/{group}', [PlatformSettingsController::class, 'update'])
        ->whereIn('group', ['general', 'branding', 'localization', 'billing', 'payments', 'operations', 'security', 'retention', 'features'])
        ->middleware('platform.permission:platform.settings.manage')->name('settings.update');

    Route::get('/diagnostics', [PlatformDiagnosticsController::class, 'index'])
        ->middleware('platform.permission:platform.diagnostics.view')->name('diagnostics.index');
    Route::get('/entitlements', [PlatformEntitlementsController::class, 'index'])
        ->middleware('platform.permission:platform.plans.view')->name('entitlements.index');
    Route::get('/billing/overview', [PlatformInvoiceController::class, 'overview'])
        ->middleware('platform.permission:platform.billing.view')->name('billing.overview');
    Route::get('/billing/credit-notes', [PlatformInvoiceController::class, 'creditNotes'])
        ->middleware('platform.permission:platform.invoices.view')->name('billing.credit-notes');
    Route::get('/billing/adjustments', [PlatformInvoiceController::class, 'adjustments'])
        ->middleware('platform.permission:platform.billing.manage')->name('billing.adjustments');
    Route::get('/email/templates', [PlatformEmailTemplateController::class, 'index'])
        ->middleware('platform.permission:platform.email.manage')->name('email.templates');
    Route::post('/email/templates/{key}', [PlatformEmailTemplateController::class, 'update'])
        ->middleware('platform.permission:platform.email.manage')->name('email.templates.update');
    Route::delete('/email/templates/{key}', [PlatformEmailTemplateController::class, 'reset'])
        ->middleware('platform.permission:platform.email.manage')->name('email.templates.reset');
    Route::post('/email/templates/{key}/test', [PlatformEmailTemplateController::class, 'sendTest'])
        ->middleware('platform.permission:platform.email.manage')->name('email.templates.test');

    Route::middleware('platform.permission:platform.marketing.manage')->group(function () {
        Route::get('/marketing/campaigns', [PlatformCampaignController::class, 'index'])->name('marketing.campaigns');
        Route::post('/marketing/campaigns', [PlatformCampaignController::class, 'store'])->name('marketing.campaigns.store');
        Route::put('/marketing/campaigns/{campaign}', [PlatformCampaignController::class, 'update'])->name('marketing.campaigns.update');
        Route::post('/marketing/campaigns/{campaign}/send', [PlatformCampaignController::class, 'send'])->name('marketing.campaigns.send');
        Route::delete('/marketing/campaigns/{campaign}', [PlatformCampaignController::class, 'destroy'])->name('marketing.campaigns.destroy');

        Route::get('/marketing/announcements', [PlatformAnnouncementController::class, 'index'])->name('marketing.announcements');
        Route::post('/marketing/announcements', [PlatformAnnouncementController::class, 'store'])->name('marketing.announcements.store');
        Route::put('/marketing/announcements/{announcement}', [PlatformAnnouncementController::class, 'update'])->name('marketing.announcements.update');
        Route::post('/marketing/announcements/{announcement}/toggle', [PlatformAnnouncementController::class, 'toggle'])->name('marketing.announcements.toggle');
        Route::delete('/marketing/announcements/{announcement}', [PlatformAnnouncementController::class, 'destroy'])->name('marketing.announcements.destroy');
    });

    Route::middleware('platform.permission:platform.commands.run')->group(function () {
        Route::get('/commands', [PlatformCommandController::class, 'index'])->name('commands.index');
        Route::post('/commands/run', [PlatformCommandController::class, 'runCurated'])->name('commands.run');
        Route::post('/commands/advanced', [PlatformCommandController::class, 'runAdvanced'])->name('commands.advanced');
    });
    Route::get('/notifications', [PlatformNotificationController::class, 'index'])
        ->middleware('platform.permission:platform.email.view')->name('notifications.index');
    Route::post('/notifications/read-all', [PlatformNotificationController::class, 'markAllRead'])
        ->middleware('platform.permission:platform.email.view')->name('notifications.read-all');
    Route::get('/gateways/health', [PlatformGatewayController::class, 'index'])
        ->middleware('platform.permission:platform.gateways.configure')->name('gateways.health');
    Route::get('/backups/verification', [PlatformBackupController::class, 'index'])
        ->middleware('platform.permission:platform.backups.view')->name('backups.verification');
    Route::get('/analytics/revenue-reports', [PlatformAnalyticsController::class, 'index'])
        ->middleware('platform.permission:platform.billing.view')->name('analytics.revenue-reports');
    Route::get('/ops/api-errors', [PlatformOpsController::class, 'apiErrors'])
        ->middleware('platform.permission:platform.logs.view')->name('ops.api-errors');
    Route::get('/ops/maintenance-history', [PlatformAuditController::class, 'maintenanceHistory'])
        ->middleware('platform.permission:platform.audit.view')->name('ops.maintenance-history');

    Route::get('/audit', [PlatformAuditController::class, 'index'])
        ->middleware('platform.permission:platform.audit.view')->name('audit.index');

    Route::post('/tenants/{tenant}/impersonate', [PlatformImpersonationController::class, 'start'])
        ->middleware('platform.permission:platform.impersonate')->name('impersonate.start');

    // Destination for modules delivered in later phases. Clearly labelled, not mock data.
    Route::get('/coming-soon/{module}', function (string $module) {
        return Inertia::render('Platform/ComingSoon', ['module' => $module]);
    })->name('coming-soon');
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
