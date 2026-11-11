<?php

namespace App\Domain\Demo\Purge;

use App\Domain\Accounting\Models\AccountTransfer;
use App\Domain\Accounting\Models\Expense;
use App\Domain\Accounting\Models\ExpenseCategory;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Accounting\Models\FinancialTransaction;
use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Models\BusinessHour;
use App\Domain\CashManagement\Models\CashMovement;
use App\Domain\CashManagement\Models\Register;
use App\Domain\CashManagement\Models\Shift;
use App\Domain\Customers\Models\Customer;
use App\Domain\Delivery\Models\DeliveryZone;
use App\Domain\Dining\Models\BillRequest;
use App\Domain\Dining\Models\DiningEvent;
use App\Domain\Dining\Models\DiningFeedback;
use App\Domain\Dining\Models\DiningParticipant;
use App\Domain\Dining\Models\DiningSession;
use App\Domain\Identity\Models\Role;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Inventory\Models\StockBalance;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Inventory\Models\StockTransfer;
use App\Domain\Inventory\Models\StockTransferItem;
use App\Domain\Invoicing\Models\Invoice;
use App\Domain\Kitchen\Models\KitchenStation;
use App\Domain\Kitchen\Models\KitchenTicket;
use App\Domain\Kitchen\Models\KitchenTicketItem;
use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Loyalty\Models\LoyaltyTransaction;
use App\Domain\Menu\Models\Category;
use App\Domain\Menu\Models\ModifierGroup;
use App\Domain\Menu\Models\ModifierGroupProduct;
use App\Domain\Menu\Models\ModifierOption;
use App\Domain\Menu\Models\Product;
use App\Domain\Menu\Models\ProductAvailability;
use App\Domain\Menu\Models\ProductVariant;
use App\Domain\Menu\Models\Recipe;
use App\Domain\Menu\Models\RecipeItem;
use App\Domain\Orders\Models\Order;
use App\Domain\Orders\Models\OrderItem;
use App\Domain\Orders\Models\OrderItemModifier;
use App\Domain\Orders\Models\OrderRound;
use App\Domain\Orders\Models\OrderStatusHistory;
use App\Domain\Payments\Models\Payment;
use App\Domain\Payments\Models\PaymentAttempt;
use App\Domain\Purchasing\Models\GoodsReceipt;
use App\Domain\Purchasing\Models\GoodsReceiptItem;
use App\Domain\Purchasing\Models\PurchaseOrder;
use App\Domain\Purchasing\Models\PurchaseOrderItem;
use App\Domain\Purchasing\Models\Supplier;
use App\Domain\Purchasing\Models\SupplierPayment;
use App\Domain\Tables\Models\DiningArea;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Domain\Waste\Models\WasteRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * The order in which demo rows are removed: children before parents, tagged by
 * bundle so an owner can keep whole groups (menu, floor plan, team, guests,
 * settings) and drop the rest.
 *
 * The order is safe for any combination of kept bundles — a kept row is never
 * the child of a deleted one through a cascading key. Two constraints shaped it:
 * `recipe_items.ingredient_id` cascades (so ingredients share the menu bundle)
 * and `tables.branch_id` cascades (so the demo branch shares the floor bundle).
 */
class DemoPurgePlan
{
    /** Bundles the owner may keep when removing demo data. */
    public const KEEPABLE = ['menu', 'floor', 'team', 'guests', 'settings'];

    /** Bundles that own rows (everything keepable except the settings flag). */
    public const MODEL_BUNDLES = ['menu', 'floor', 'team', 'guests'];

    /**
     * Ordered removal plan, grouped by bundle.
     *
     * @return list<array{group: string, models: list<class-string<Model>>}>
     */
    public static function plan(): array
    {
        return [
            ['group' => 'kitchen', 'models' => [
                KitchenTicketItem::class,
                KitchenTicket::class,
            ]],

            // Orders and everything that hangs off them. OrderSequence is
            // deliberately NOT removed: it is a counter, not a business record,
            // and resetting it would collide with real order numbers.
            ['group' => 'sales', 'models' => [
                OrderItemModifier::class,
                OrderStatusHistory::class,
                OrderItem::class,
                PaymentAttempt::class,
                Payment::class,
                Invoice::class,
                OrderRound::class,
                Order::class,
            ]],

            // Dining / QR sessions
            ['group' => 'dining', 'models' => [
                DiningEvent::class,
                BillRequest::class,
                DiningFeedback::class,
                DiningParticipant::class,
                DiningSession::class,
            ]],

            // The QR identity belongs to the floor, and goes before its table.
            ['group' => 'floor', 'models' => [
                TableQrToken::class,
            ]],

            ['group' => 'cash', 'models' => [
                CashMovement::class,
                Shift::class,
            ]],

            ['group' => 'accounting', 'models' => [
                Expense::class,
                FinancialTransaction::class,
                AccountTransfer::class,
                SupplierPayment::class,
                ExpenseCategory::class,
            ]],

            // DocumentSequence (purchase order / goods receipt / transfer /
            // invoice numbers) is a counter too, and is left in place.
            ['group' => 'purchasing', 'models' => [
                GoodsReceiptItem::class,
                GoodsReceipt::class,
                PurchaseOrderItem::class,
                PurchaseOrder::class,
                Supplier::class,
            ]],

            ['group' => 'stock', 'models' => [
                StockTransferItem::class,
                StockTransfer::class,
                WasteRecord::class,
                StockMovement::class,
                StockBalance::class,
            ]],

            ['group' => 'menu', 'models' => [
                RecipeItem::class,
                Recipe::class,
                Ingredient::class,
                ProductVariant::class,
                ProductAvailability::class,
                ModifierOption::class,
                ModifierGroupProduct::class,
                ModifierGroup::class,
                Product::class,
                Category::class,
            ]],

            ['group' => 'guests', 'models' => [
                LoyaltyTransaction::class,
                LoyaltyAccount::class,
                Customer::class,
            ]],

            ['group' => 'delivery', 'models' => [
                DeliveryZone::class,
            ]],

            // The rest of the floor, then branches, accounts and staff last —
            // deleting a branch or user cascades into everything above.
            ['group' => 'floor', 'models' => [
                Table::class,
                DiningArea::class,
                KitchenStation::class,
                Register::class,
                StockLocation::class,
                FinancialAccount::class,
                BusinessHour::class,
                Branch::class,
            ]],

            ['group' => 'team', 'models' => [
                User::class,
                Role::class,
            ]],
        ];
    }

    /**
     * Map a stored morph class to its bundle.
     *
     * @return array<string, string>
     */
    public static function modelGroups(): array
    {
        $map = [];

        foreach (self::plan() as $entry) {
            foreach ($entry['models'] as $model) {
                $map[(new $model)->getMorphClass()] = $entry['group'];
            }
        }

        return $map;
    }

    /** @param  class-string<Model>  $model */
    public static function usesSoftDeletes(string $model): bool
    {
        return in_array(SoftDeletes::class, class_uses_recursive($model), true);
    }
}
