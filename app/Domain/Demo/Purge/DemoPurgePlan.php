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
 * The order in which demo rows are removed: children before parents.
 *
 * Most foreign keys cascade, but not all — for example `invoices` is not
 * deleted by removing its orders, and `users` cascade into orders and shifts —
 * so the order matters and every ledgered model with real children is listed.
 */
class DemoPurgePlan
{
    /**
     * @return list<class-string<Model>>
     */
    public static function models(): array
    {
        return [
            // Kitchen
            KitchenTicketItem::class,
            KitchenTicket::class,

            // Orders and everything that hangs off them
            OrderItemModifier::class,
            OrderStatusHistory::class,
            OrderItem::class,
            PaymentAttempt::class,
            Payment::class,
            Invoice::class,
            Order::class,
            // OrderSequence is deliberately NOT removed: it is a counter, not a
            // business record. Deleting it would restart order numbering at 0001
            // and collide with real orders that kept their own numbers.

            // Dining / QR sessions
            DiningEvent::class,
            BillRequest::class,
            DiningFeedback::class,
            DiningParticipant::class,
            DiningSession::class,
            TableQrToken::class,

            // Cash
            CashMovement::class,
            Shift::class,
            Register::class,

            // Accounting
            Expense::class,
            FinancialTransaction::class,
            AccountTransfer::class,
            SupplierPayment::class,
            ExpenseCategory::class,

            // Purchasing
            GoodsReceiptItem::class,
            GoodsReceipt::class,
            PurchaseOrderItem::class,
            PurchaseOrder::class,
            Supplier::class,
            // DocumentSequence (purchase order / goods receipt / transfer /
            // invoice numbers) is a counter too, and is left in place.

            // Inventory and transfers
            StockTransferItem::class,
            StockTransfer::class,
            WasteRecord::class,
            StockMovement::class,
            StockBalance::class,
            RecipeItem::class,
            Recipe::class,
            Ingredient::class,
            StockLocation::class,

            // Menu
            ProductVariant::class,
            ProductAvailability::class,
            ModifierOption::class,
            ModifierGroupProduct::class,
            ModifierGroup::class,
            Product::class,
            Category::class,

            // Customers and loyalty
            LoyaltyTransaction::class,
            LoyaltyAccount::class,
            Customer::class,

            // Tables / floor
            Table::class,
            DiningArea::class,
            KitchenStation::class,
            DeliveryZone::class,

            // Accounts, staff and branches last — deleting a user or branch
            // cascades into everything above, so they must go last.
            FinancialAccount::class,
            User::class,
            Role::class,
            BusinessHour::class,
            Branch::class,
        ];
    }

    /** @param  class-string<Model>  $model */
    public static function usesSoftDeletes(string $model): bool
    {
        return in_array(SoftDeletes::class, class_uses_recursive($model), true);
    }
}
