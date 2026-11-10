"""
Fish Farm ERP - Production Test Case Spreadsheet Generator
READ-ONLY AUDIT OUTPUT. Does not modify project source or data.
Columns (exact 14): Test Case ID | Test Case Name | Steps | Test Data | Pre Condition |
Expected Result | Actual Result | Test Case Status | Severity Level | Comments From Tester |
Remark From Developers | Tested In | Resolved In | Resolved By
"""
import sys, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

COUNTER = {}

def tc(module, name, steps, data, pre, expected, severity="Medium", group=None):
    """One test-case row. Group optional (multiple rows per ID share a group)."""
    key = module
    COUNTER[key] = COUNTER.get(key, 0) + 1
    tid = f"TC-{key[:3].upper()}-{COUNTER[key]:03d}"
    return {
        "id": tid, "name": name, "steps": steps, "data": data, "pre": pre,
        "expected": expected, "actual": "Not Tested", "status": "Pending",
        "severity": severity, "comments": "", "remark": "", "tested": "",
        "resolved_in": "", "resolved_by": "",
    }

HEADERS = ["Test Case ID","Test Case Name","Steps","Test Data","Pre Condition",
           "Expected Result","Actual Result","Test Case Status","Severity Level",
           "Comments From Tester","Remark From Developers","Tested In","Resolved In","Resolved By"]

AUTH = "Logged in user with required permission; tenancy is active."

def build():
    rows = []
    add = rows.append

    # ============================= FISH FARM MODULE (verified: NOT IMPLEMENTED) =============================
    # Grep of app/**/*.php for fish|pond|mortality|harvest|feed found only demo-data menu
    # strings (Rui Fish Curry, Harbour Fish Market supplier). No routes, controllers,
    # models, migrations, or pages exist for fish farming. These rows are documented
    # as Not Implemented so the audit sheet still records the required coverage.
    fish_note = "Not Implemented - no routes, controller, model, migration or page exists in the codebase (verified by code search on 2026-10-31). Requires Investigation."
    fish = [
        ("Fish Batch Creation", "Open Fish Batches > Create > enter species, stocking date, count, avg weight > save.",
         "Species=Rui; Batch=B-2026-001; Count=5000; Avg weight=25g; Pond=P1", "Fish module route exists", "Batch saved with unique code; initial count and weight stored; batch status = Active. " + fish_note, "High"),
        ("Initial Fish Stock Entry", "Enter initial fish stock with quantity and weight against batch and pond.",
         "Batch=B-2026-001; Qty=5000; Weight=125kg", fish_note, "Initial stock recorded; total weight 5000 x 25g = 125kg. " + fish_note, "High"),
        ("Fish Stock Calculation", "Verify current stock = initial stock + additions - mortality - transfers out - harvested.",
         "Initial 125kg + added 0 - mortality 10kg - harvested 40kg = 75kg", fish_note, "Stock summary equals computed value. " + fish_note, "High"),
        ("Mortality Recording", "Record daily mortality with count and estimated weight for a batch.",
         "Batch=B-2026-001; Deaths=50; Est weight=1.25kg", fish_note, "Mortality saved; batch remaining count 5000-50=4950; weight reduced by 1.25kg. " + fish_note, "High"),
        ("Fish Transfer Between Ponds", "Create transfer: select source pond, destination pond, species, quantity, weight > dispatch > receive.",
         "P1 to P2; Qty=1000; Weight=30kg", fish_note, "Source pond stock reduced, destination increased; transfer status Pending > Dispatched > Received. " + fish_note, "High"),
        ("Fish Harvest", "Record harvest: batch, pond, quantity, weight, harvesting date.",
         "Batch=B-2026-001; Qty=200; Weight=45kg", fish_note, "Harvest saved; stock decremented; batch remains Active while stock > 0. " + fish_note, "High"),
        ("Fish Sales", "Create fish sale linked to batch/harvest: customer, weight, rate, total.",
         "Customer=Hotel Green; Weight=45kg; Rate=380/kg; Total=45 x 380 = 17,100", fish_note, "Sale saved; batch/harvest quantity reduced; customer ledger debited 17,100; income recorded. " + fish_note, "High"),
        ("Remaining Quantity & Weight", "Verify batch remaining qty/weight = total stocked - mortality - transfers out - harvested - sold.",
         "5000 - 50 - 1000 - 200 = 3750 pcs; weight per formula above", fish_note, "Remaining values match computed figures shown on batch page. " + fish_note, "High"),
        ("Batch Completion", "When remaining stock reaches zero, verify batch is auto-marked Completed and read-only.",
         "Batch with 0 remaining", fish_note, "Status = Completed; no further transactions allowed. " + fish_note, "Medium"),
        ("Feed Purchase", "Create feed purchase: supplier, feed type, bags, bag weight, unit rate, extra costs, paid amount.",
         "Supplier=Feed House; Type=Starter; 100 bags x 25kg; Rate=2,400/bag; Transport=5,000; Paid=100,000", fish_note, "Purchase saved; supplier ledger debited 100 x 2,400 + 5,000 = 245,000; feed stock increased 2,500kg; paid 100,000 leaves due 145,000. " + fish_note, "High"),
        ("Feed Stock", "Verify feed stock per feed type = sum of purchases + adjustments - usages - transfers - deliveries.",
         "Purchased 2,500kg - used 600kg = 1,900kg", fish_note, "Stock report matches computed quantity and value. " + fish_note, "High"),
        ("Feed Usage / Feeding Entry", "Record daily feed usage: batch/pond, feed type, kg.",
         "Pond P1; Starter; 30kg/day", fish_note, "Usage saved; feed stock reduced 30kg; batch feed cost increased. " + fish_note, "High"),
        ("Feed Transfer / Delivery", "Transfer or deliver feed between stores/ponds; verify both sides update.",
         "Store A to Pond P2; 50kg", fish_note, "Store reduced, pond/store increased; nothing lost. " + fish_note, "Medium"),
        ("Additional Purchase Costs", "Add transport/chemicals/other costs to a purchase; verify cost allocation.",
         "Transport=5,000 on 100 bags = 50/bag effective 2,450", fish_note, "Effective per-bag/per-kg cost includes additional costs. " + fish_note, "Medium"),
        ("Feed Cost Calculation", "Verify feed cost per kg fish = total feed cost / total weight gain for batch.",
         "Feed cost 245,000 for 2,500kg; gain 1,000kg => 245/kg gain", fish_note, "Computed on batch/feed report. " + fish_note, "High"),
        ("Fish Feed Trading - Purchase/Sales", "Feed trading: buy from supplier, sell to party, ledger + stock update.",
         "Buy 2,500kg @120/kg; Sell 1,000kg @150/kg; Profit=30,000", fish_note, "Supplier ledger, party ledger, stock and profit all updated correctly. " + fish_note, "High"),
        ("Income / Expense Entry", "Accounting: create income and expense with account and ledger posting.",
         "Income: Fish sale 17,100; Expense: Labor 10,000", fish_note, "Cash/bank account balance updated; personal ledger reflects entries. " + fish_note, "High"),
        ("Salary & Partial Payment", "Create salary payment with partial paid amount; verify dues.",
         "Salary=20,000; Paid=8,000; Due=12,000", fish_note, "Employee ledger shows paid 8,000 and due 12,000. " + fish_note, "Medium"),
        ("Employee Advance", "Issue advance to employee; adjust against future salary.",
         "Advance=5,000", fish_note, "Advance posted to employee personal ledger. " + fish_note, "Medium"),
        ("Profit & Loss Report", "Run P&L for a date range; verify income - expense matches ledger totals.",
         "Income 17,100; Expense 255,000; Net = -237,900", fish_note, "P&L figures reconcile with ledger. " + fish_note, "High"),
        ("Ledger Reports & PDF", "Open supplier/party/employee ledger; export PDF and print.",
         "Supplier with 245,000 debit / 100,000 credit", fish_note, "PDF matches on-screen data; print layout fits A4. " + fish_note, "Medium"),
        ("Fish/Feed/Stock Reports", "Run fish batch report, feed report and stock report with date filters.",
         "Date range 2026-10-01 to 2026-10-31", fish_note, "Report totals match transaction data. " + fish_note, "Medium"),
        ("Production Environment Readiness", "Verify PHP version, DB, storage permissions, asset loading, migrations on production.",
         "PHP >= required; storage/app & public writable; vite build present", fish_note, "All pre-launch checks pass; health endpoint returns OK. " + fish_note, "High"),
    ]
    for name, steps, data, pre, exp, sev in fish:
        add(tc("Fish Farm", name, steps, data, pre, exp, sev))

    # ============================= AUTHENTICATION (routes/auth.php verified) =============================
    A = [
        ("User Registration", "Open /register > enter name, email, password, confirm > submit.",
         "name=QA Tester; email=qa@example.com; Pass=Secret#123", "Fresh install; register route public", "Account created; email verification sent; user lands on verification notice.", "High"),
        ("Login with valid credentials", "Open /login > enter valid email + password > submit.",
         "qa@example.com / Secret#123", "Registered & verified user", "Redirects to dashboard; session cookie set.", "High"),
        ("Login with wrong password", "Enter valid email + wrong password > submit.",
         "qa@example.com / Wrong#999", "Registered user", "Error 'credentials do not match'; no session; throttling applies after repeated attempts.", "High"),
        ("Email verification", "Click verification link from email before logging in.",
         "Signed verification URL", "Pending-verification user", "Email marked verified; user can log in. Unverified users are blocked by 'verified' middleware.", "High"),
        ("Password reset", "Open /forgot-password > submit email > open reset link > set new password > login with new password.",
         "qa@example.com; new pass New#456", "Registered user", "Reset email sent; new password works; old password fails.", "High"),
        ("Logout", "Click logout from user menu.",
         "", "Logged-in user", "Session destroyed; /dashboard redirects to /login.", "High"),
        ("Guest route protection", "Open /dashboard while logged out.",
         "", "Not logged in", "Redirect to /login (auth middleware).", "High"),
    ]
    for name, steps, data, pre, exp, sev in A:
        add(tc("Auth", name, steps, data, pre, exp, sev))

    # ============================= STAFF / ROLES / PERMISSIONS (routes verified) =============================
    S = [
        ("Staff list view", "Open Staff > list loads with search, role filter, status filter.",
         "", "permission:staff.view", "Staff table shows invited/active/deactivated staff; filters work.", "High"),
        ("Create staff (invitation)", "Staff > Add > name, email, role > send invitation.",
         "Rahim Uddin; rahim@farm.test; role=Cashier", "permission:staff.manage", "Invitation row created with token; email queued to rahim@farm.test.", "High"),
        ("Accept staff invitation", "Open emailed /invitations/{token} link > set password > account becomes active.",
         "token from email; Pass=Staff#123", "Valid unexpired invitation", "Staff account activated and can log in; invitation marked used.", "High"),
        ("Duplicate staff email validation", "Try inviting an email that already has an account/invitation.",
         "rahim@farm.test (existing)", "permission:staff.manage", "Validation error; no duplicate invitation.", "Medium"),
        ("Deactivate staff", "Staff > Deactivate on an active member > confirm.",
         "rahim@farm.test", "permission:staff.manage", "Staff status Deactivated; their sessions revoked; login blocked.", "High"),
        ("Reactivate staff", "Reactivate a deactivated staff member.",
         "", "permission:staff.manage", "Staff can log in again.", "Medium"),
        ("Revoke sessions", "Staff > Revoke sessions for a member logged in on another device.",
         "", "permission:staff.manage", "Other device is logged out on next request.", "Medium"),
        ("Send password reset (staff)", "Trigger password reset email for a staff member.",
         "", "permission:staff.manage", "Reset link emailed.", "Medium"),
        ("Create role with permissions", "Roles > New > name + toggle permissions (e.g. menu.view, pos.use) > save.",
         "Role=Cashier; perms=pos.use, orders.view", "permission:roles.manage", "Role saved; assignable to staff.", "High"),
        ("Edit role permissions", "Edit Cashier role > add orders.create > save; verify affected staff inherit it.",
         "", "permission:roles.manage", "Permission matrix updated immediately.", "High"),
        ("Delete role", "Delete a role; try deleting a role in use by staff.",
         "", "permission:roles.manage", "Used role is blocked or reassigned; unused role deleted.", "Medium"),
        ("Permission gate - denied access", "As Cashier, open /staff and /roles.",
         "Role without staff.view", "Staff account with limited role", "403 / blocked page; no data leaked.", "High"),
    ]
    for name, steps, data, pre, exp, sev in S:
        add(tc("Staff", name, steps, data, pre, exp, sev))

    # ============================= ONBOARDING =============================
    O = [
        ("Onboarding wizard steps", "Complete onboarding: profile, company, branch, hours, tax, receipt, payments, menu, team > complete.",
         "Company=Green Farm Ltd; Branch=Main; Vat=15%", "auth+verified; fresh tenant", "All steps saved; onboarding.completed middleware allows dashboard access.", "High"),
        ("Skip optional step", "Skip payments step then continue.",
         "", "Onboarding in progress", "Step marked skipped; wizard proceeds.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in O:
        add(tc("Onboard", name, steps, data, pre, exp, sev))

    # ============================= MENU & MODIFIERS =============================
    M = [
        ("Create category", "Menu > Categories > name, sort order > save.",
         "Category=Frozen Fish", "permission:menu.manage", "Category listed; appears in POS grouping.", "High"),
        ("Update / Delete category", "Rename category; delete empty category; try deleting one with products.",
         "", "permission:menu.manage", "Rename applies; empty delete ok; category with products blocked or warned.", "Medium"),
        ("Create product", "Menu > Products > name, category, price, cost, unit, tax, active > save.",
         "Rui Fish (Whole); Cat=Frozen Fish; Price=420; Cost=380", "permission:menu.manage", "Product saved; shows in menu and POS catalogue.", "High"),
        ("Edit product / price change", "Change product price 420 > 450; save; open POS.",
         "", "permission:menu.manage", "POS shows 450; existing past orders keep old price (no retro change).", "High"),
        ("Product image upload / delete", "Upload image; then delete it.",
         "valid jpg/png", "permission:menu.manage", "Image stored and displayed; delete removes file.", "Medium"),
        ("Product import (CSV/Excel)", "Download template > fill rows > import.",
         "1 row: product with category & price", "permission:menu.manage", "Import creates products; errors reported per row.", "Medium"),
        ("Product export", "Menu > Export products.",
         "", "permission:menu.view", "File downloads with all products/columns.", "Medium"),
        ("Delete product", "Delete a product; try one used by past orders.",
         "", "permission:menu.manage", "Used product is soft-blocked or deactivation suggested.", "Medium"),
        ("Create modifier group & options", "Modifiers > Group + options with price deltas.",
         "Group=Size; Options: 500g +0, 1kg +180", "permission:modifiers.manage", "Group/options saved; selectable on POS product.", "High"),
        ("Delete modifier in use", "Delete option attached to orders.",
         "", "permission:modifiers.manage", "Blocked or handled gracefully.", "Low"),
    ]
    for name, steps, data, pre, exp, sev in M:
        add(tc("Menu", name, steps, data, pre, exp, sev))

    # ============================= INVENTORY =============================
    I = [
        ("Create unit of measure", "Inventory > Units > name/code > save.",
         "Unit=kg", "permission:inventory.manage", "Unit saved and selectable on ingredients.", "Medium"),
        ("Create ingredient", "Inventory > Ingredients > name, unit, cost, category > save.",
         "Ice; kg; cost 20/kg", "permission:inventory.manage", "Ingredient saved with zero stock until opening.", "High"),
        ("Opening stock entry", "Inventory > Opening > ingredient, quantity, unit cost > save.",
         "Ice 100kg @ 20 = 2,000 value", "permission:inventory.adjust", "Stock = 100kg; stock value 2,000 recorded.", "High"),
        ("Stock adjustment", "Adjust stock +/- with reason; verify movement log.",
         "Adjust -5kg (spoilage)", "permission:inventory.adjust", "Stock 100 - 5 = 95kg; adjustment logged with user & reason.", "High"),
        ("Inventory list filters", "Filter by category, low-stock, search by name.",
         "", "permission:inventory.view", "Filters return correct subsets.", "Medium"),
        ("Negative stock prevention", "Adjust below zero or delete unit in use.",
         "Adjust -200kg on 95kg stock", "permission:inventory.adjust", "Blocked with validation error.", "High"),
    ]
    for name, steps, data, pre, exp, sev in I:
        add(tc("Inv", name, steps, data, pre, exp, sev))

    # ============================= POS / SHIFTS / ORDERS =============================
    P = [
        ("Open cash shift", "POS > Open shift with opening cash.",
         "Opening cash=5,000", "permission:pos.use", "Shift created Open; POS unlocked.", "High"),
        ("POS sale - create order", "Add items + modifiers to cart > create order.",
         "2 x Rui Fish (420) = 840", "permission:pos.use + orders.create", "Order created with items, subtotal 840, tax and total computed.", "High"),
        ("POS sale - settle payment", "Settle order with cash; enter received amount.",
         "Total=840; Cash received=1,000; Change=160", "permission:pos.use + orders.update", "Order Paid; change computed 160; receipt printable.", "High"),
        ("Mixed payment", "Split payment across methods (cash + gateway).",
         "400 cash + 440 card", "Gateway configured", "Sum of payments equals total; both recorded.", "Medium"),
        ("Receipt printing", "Open /orders/{id}/receipt and print.",
         "Paid order", "permission:orders.view", "Receipt shows items, totals, outlet info, prints correctly.", "High"),
        ("Void order", "Void an unsettled order with reason.",
         "Reason=customer cancelled", "permission:orders.void", "Order voided; no revenue counted; inventory restored per logic.", "High"),
        ("Offline bundle & sync", "Load /pos/offline-bundle; go offline; create sale; reconnect and POST /pos/sync.",
         "1 offline sale", "permission:pos.use", "Offline sale synced without duplicates; conflicts surfaced if any.", "High"),
        ("Shift close reconciliation", "Close shift; enter counted cash.",
         "Counted=5,840", "permission:pos.use", "Shift Closed; over/short computed vs system total.", "High"),
        ("Shift cash movement", "Add cash-in/cash-out (drop) during shift.",
         "Cash drop=1,000", "permission:pos.use", "Movement logged; closing totals reflect it.", "Medium"),
        ("Order list filters/pagination", "Orders page: search by order no, filter status/date, paginate.",
         "Create >25 orders", "permission:orders.view", "Filters correct; pagination works.", "Medium"),
        ("Kitchen ticket status flow", "Kitchen display: accept item > mark ready > complete ticket.",
         "1 ticket with 2 items", "feature:kitchen; permission:kitchen.manage", "Statuses update live (realtime) for POS/QR tracking.", "High"),
    ]
    for name, steps, data, pre, exp, sev in P:
        add(tc("POS", name, steps, data, pre, exp, sev))

    # ============================= TABLES / QR DINING =============================
    T = [
        ("Create table", "Tables > Add > name, capacity, area > save.",
         "Table T-12; capacity 4; Area=Main", "permission:tables.manage", "Table saved; appears on table map.", "Medium"),
        ("Table transfer", "Transfer an open order from T-12 to T-14.",
         "", "permission:tables.manage", "Order moves; source table freed.", "Medium"),
        ("Table status", "Set table status (available/occupied/reserved).",
         "", "permission:tables.manage", "Status reflected on map.", "Low"),
        ("QR public entry", "Scan /qr/{token} > start session > menu loads.",
         "Valid table token", "feature:qr_dining; tenant online", "Dining session cookie set; menu rendered.", "High"),
        ("QR order + tracking", "Place QR order > track status > bill request > staff settle.",
         "1 item order", "Active session", "Order lands in POS/kitchen; tracking updates live.", "High"),
        ("QR table regenerate/revoke", "Regenerate token; revoke table QR.",
         "", "permission:qr.manage", "Old QR stops working; new token issued.", "Medium"),
        ("QR design & print", "Create/activate QR design; print table QR sheet.",
         "", "permission:qr.manage/view", "Design applied; print layout correct.", "Low"),
        ("QR feedback", "Submit feedback via QR session.",
         "Rating + comment", "Active session", "Feedback stored; visible in analytics.", "Low"),
    ]
    for name, steps, data, pre, exp, sev in T:
        add(tc("QR", name, steps, data, pre, exp, sev))

    # ============================= PURCHASING / SUPPLIERS =============================
    PU = [
        ("Create supplier", "Purchasing > Suppliers > name, contact, phone, terms > save.",
         "Meghna Foods; terms=15 days", "permission:purchasing.manage", "Supplier saved; selectable on POs.", "High"),
        ("Create purchase order", "PO > supplier, items with qty/cost > save as Draft.",
         "Ice 100kg @ 20 = 2,000", "permission:purchasing.manage", "PO saved Draft; line totals computed.", "High"),
        ("Submit / Approve PO", "Submit draft PO; then approve with purchasing.approve permission.",
         "", "permission:purchasing.manage + approve", "Status Draft > Submitted > Approved; approver recorded.", "High"),
        ("Receive PO (stock-in)", "Receive approved PO fully; verify inventory increase and supplier ledger debit.",
         "Receive 100kg", "Approved PO", "Stock +100kg; ledger debit 2,000; status Received/Partial as applicable.", "High"),
        ("Partial receive", "Receive 50kg of a 100kg PO; then receive remainder.",
         "", "Approved PO", "First receive: Partial (50/100); second completes PO.", "Medium"),
        ("PO payment (partial)", "Pay part of received amount against supplier ledger.",
         "Pay 1,000 of 2,000", "permission:purchasing.manage", "Due reduces to 1,000; ledger shows paid and due.", "High"),
        ("Cancel PO", "Cancel a draft/submitted PO with reason.",
         "", "permission:purchasing.manage", "Status Cancelled; no stock movement.", "Medium"),
        ("Delete supplier in use", "Delete a supplier with POs/ledger entries.",
         "", "permission:purchasing.manage", "Blocked or soft-handled; history preserved.", "High"),
    ]
    for name, steps, data, pre, exp, sev in PU:
        add(tc("Purch", name, steps, data, pre, exp, sev))

    # ============================= TRANSFERS / WASTE =============================
    TW = [
        ("Create transfer", "Transfers > source branch/stock, destination, items, qty > save.",
         "Main to Outlet; Ice 20kg", "feature:transfers; permission:inventory.manage", "Transfer saved Pending; source stock reserved/reduced per logic.", "High"),
        ("Dispatch transfer", "Dispatch pending transfer.",
         "", "permission:inventory.manage", "Status Dispatched.", "Medium"),
        ("Receive transfer", "Receive dispatched transfer at destination; verify stock in.",
         "20kg", "", "Destination stock +20kg; no gain/loss.", "High"),
        ("Cancel transfer", "Cancel a pending transfer.",
         "", "permission:inventory.manage", "Source stock restored.", "Medium"),
        ("Waste record", "Waste > record item, qty, reason > save.",
         "Ice 3kg; reason=spoilage", "feature:waste; permission:waste.create", "Waste saved Pending; stock reduced on approval.", "High"),
        ("Waste approve/reject", "Approve one record; reject another.",
         "", "permission:waste.approve", "Approved reduces stock; rejected has no stock effect.", "High"),
    ]
    for name, steps, data, pre, exp, sev in TW:
        add(tc("Transfer", name, steps, data, pre, exp, sev))

    # ============================= EXPENSES / ACCOUNTS =============================
    E = [
        ("Create expense category", "Expenses > Categories > name > save.",
         "Fuel & Transport", "permission:expenses.manage", "Category saved; selectable.", "Medium"),
        ("Create expense", "Expenses > date, category, account, amount, note > save.",
         "10,000; Cash; Fuel", "permission:expenses.manage", "Expense saved Pending; visible in list.", "High"),
        ("Approve / Reject expense", "Approve one expense; reject another.",
         "", "permission:expenses.approve", "Approved posts to account ledger (cash/bank balance reduces); rejected does not.", "High"),
        ("Expense validation", "Save with empty category or negative amount.",
         "-500", "permission:expenses.manage", "Validation error shown.", "Medium"),
        ("Create account", "Accounts > name, type (cash/bank), opening balance > save.",
         "DBBL Current; opening 50,000", "permission:accounts.manage", "Account saved with opening balance.", "High"),
        ("Account transfer", "Transfer between accounts.",
         "Cash 10,000 > Bank", "permission:accounts.manage", "Cash -10,000; Bank +10,000; both in ledger.", "High"),
        ("Edit / delete account", "Edit account name; delete an account with transactions.",
         "", "permission:accounts.manage", "Rename ok; delete with history blocked.", "Medium"),
        ("Personal / employee ledger", "View employee ledger from salary/advance entries.",
         "", "Salary module context", "Ledger lists all postings and running balance.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in E:
        add(tc("Acc", name, steps, data, pre, exp, sev))

    # ============================= CUSTOMERS / LOYALTY / DELIVERY =============================
    C = [
        ("Create customer", "Customers > name, phone, email > save.",
         "Hotel Green; +8801711223344", "permission:customers.manage", "Customer saved with loyalty points 0.", "High"),
        ("Duplicate phone validation", "Save second customer with same phone.",
         "", "permission:customers.manage", "Validation error (unique phone).", "Medium"),
        ("Edit / delete customer", "Edit phone; delete a customer with orders.",
         "", "permission:customers.manage", "Delete blocked or soft-deleted; orders intact.", "Medium"),
        ("Customer ledger / history", "Open customer detail: orders, payments, points.",
         "Customer with 1 paid order 17,100", "permission:customers.view", "History and points accurate.", "High"),
        ("Customer export", "Customers > Export.",
         "", "permission:customers.view", "Export downloads all customers.", "Medium"),
        ("Loyalty points adjust", "Adjust points +/- on customer.",
         "+50", "permission:customers.manage", "Points updated and logged.", "Low"),
        ("Delivery zones CRUD", "Settings > Delivery zones: create, edit, delete zone with charge.",
         "Zone A; charge=100", "permission:settings.manage", "CRUD works; charge applied on delivery orders.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in C:
        add(tc("Cust", name, steps, data, pre, exp, sev))

    # ============================= REPORTS =============================
    R = [
        ("Reports dashboard", "Open /reports; each report card loads its own data.",
         "Date range = current month", "permission:reports.view", "All report pages load without error.", "High"),
        ("Sales report totals", "Compare sales report total with settled orders in range.",
         "3 settled orders summing 2,520", "permission:reports.view", "Report total = 2,520; per-day breakdown correct.", "High"),
        ("Purchase report", "Purchase report vs received POs.",
         "1 received PO 2,000", "permission:reports.view", "Totals match received amounts.", "Medium"),
        ("Expense report", "Expense report vs approved expenses.",
         "1 approved 10,000", "permission:reports.view", "Only approved included; total 10,000.", "High"),
        ("Stock report", "Stock report vs computed stock (opening + in - out).",
         "Ice 95kg", "permission:reports.view", "Qty and value match.", "High"),
        ("Profit & Loss", "P&L = income - expenses for range.",
         "Income 2,520; Expense 10,000; Net -7,480", "permission:reports.view", "Net figure reconciles with ledgers.", "High"),
        ("Report PDF export / print", "Export a report to PDF; print from browser.",
         "Sales report", "permission:reports.view", "PDF/print matches screen; A4 layout; no cut columns.", "Medium"),
        ("Date-range edge cases", "Run report with end before start; range with no data.",
         "2026-10-31 to 2026-10-01", "permission:reports.view", "Validation or empty state; no crash.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in R:
        add(tc("Rpt", name, steps, data, pre, exp, sev))

    # ============================= SETTINGS / BRANCHES / INVOICES =============================
    ST = [
        ("Tenant settings groups", "Settings > open each group (general, tax, receipt, etc.) > save a change.",
         "Vat=15%", "permission:settings.manage", "Saved values persist and appear in POS/receipts.", "High"),
        ("Logo upload/delete", "Settings > upload logo; then delete.",
         "logo.png", "permission:settings.manage", "Logo appears on receipts/branding; delete reverts to default.", "Medium"),
        ("Branch CRUD", "Branches: create, edit, deactivate, set primary.",
         "Branch=Farm Outlet 2", "permission:branches.manage", "CRUD works; branch switcher updates active context.", "High"),
        ("Branch switching", "Use branch switcher; verify data scoped to active branch.",
         "Create order in Branch 2; check Branch 1 list", "", "Data isolated per branch.", "High"),
        ("Payment gateways CRUD", "Settings > Payments: add gateway, toggle, set default, test, delete.",
         "bKash sandbox keys", "permission:settings.manage", "Gateway saved; toggle affects checkout; default applied.", "High"),
        ("Invoice list/view", "Invoices > list and open an invoice PDF/document.",
         "Subscription invoice", "permission:invoices.view", "Invoice renders with correct amounts.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in ST:
        add(tc("Set", name, steps, data, pre, exp, sev))

    # ============================= SUBSCRIPTION / PLATFORM =============================
    SU = [
        ("Subscription plan change", "Subscription > change plan; verify entitlements update.",
         "Plan: Scale", "permission:subscription.manage", "Plan changed; usage limits follow plan.", "High"),
        ("Apply / remove coupon", "Apply coupon; remove it.",
         "VALID-CODE", "permission:subscription.manage", "Discount applied/removed on invoices.", "Medium"),
        ("Cancel / resume subscription", "Cancel then resume.",
         "", "permission:subscription.manage", "State transitions recorded; access follows status.", "High"),
        ("Download invoice document", "Download subscription invoice document.",
         "", "permission:subscription.view", "PDF downloads correctly.", "Medium"),
        ("Platform admin dashboard", "Login as platform admin > /platform dashboard loads with stats.",
         "Platform admin account", "platform middleware", "Tenant/user/revenue stats visible.", "High"),
        ("Platform tenants CRUD/bulk", "Platform > Tenants: view, create/suspend via bulk actions.",
         "", "platform.permission:platform.tenants.manage", "Actions applied and logged.", "High"),
        ("Impersonation & stop", "Impersonate a tenant user; then stop.",
         "", "Platform admin", "Impersonation session works; stop returns admin session.", "High"),
        ("Platform maintenance mode", "Toggle maintenance mode; verify tenant access blocked/allowed.",
         "", "platform.permission:platform.maintenance.manage", "Maintenance banner/route enforced.", "High"),
        ("Backups & restore", "Trigger backup; view list; run restore in staging only.",
         "", "platform.permission:platform.backups.view/manage", "Backup created; restore documented; no prod restore in tests.", "Medium"),
        ("Email/SMS settings & test", "Platform > Email settings save > send test email; SMS test likewise.",
         "test@example.com", "platform.permission:platform.email.manage", "Test message delivered; logs show status.", "Medium"),
        ("Queue & failed jobs", "Ops > Queue and failed jobs pages; retry a failed job.",
         "Force one failing job", "platform.permission:platform.monitoring.view", "Job retried; status updates.", "Medium"),
        ("Audit log", "Platform > Audit: verify actions (impersonation, deletes) are logged.",
         "Perform a delete", "platform.permission:platform.audit.view", "Audit entries with actor, action, time.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in SU:
        add(tc("Plat", name, steps, data, pre, exp, sev))

    # ============================= PRODUCTION / SYSTEM =============================
    PR = [
        ("Health probe endpoint", "GET /health on production; check response and load-balancer pass.",
         "", "Deployed production URL", "200 OK; no session requirement.", "High"),
        ("PHP version compatibility", "php -v matches composer.json platform requirement; all extensions installed.",
         "PHP 8.5 / required ext: pdo, mbstring, intl, gd", "Server access", "Composer check-platform-reqs passes.", "High"),
        ("Storage & file permissions", "Verify storage/ and bootstrap/cache writable; uploads save to storage/app/public with symlink.",
         "Upload one logo on prod", "Deployed server", "Uploads succeed; public/storage serves files.", "High"),
        ("Migration status", "php artisan migrate:status shows no pending migrations.",
         "", "Deployment box (read-only check)", "No 'Pending' rows.", "High"),
        ("Production asset loading", "Verify built assets load (vite manifest), no console errors on dashboard.",
         "Chrome DevTools console", "npm run build executed on deploy", "No 404 assets; no console errors.", "High"),
        ("Environment configuration", ".env prod keys set: APP_ENV=production, APP_DEBUG=false, DB/queue/redis/mail credentials.",
         "", "Server access (read-only audit)", "Debug page never exposed; error pages generic.", "High"),
        ("Multi-domain configuration", "Access app via each configured tenant domain; tenancy resolves per domain.",
         "domainA.test, domainB.test", "DNS configured", "Each domain resolves its tenant data.", "High"),
        ("Scheduler & queue workers", "Verify scheduled jobs run (schedule:list) and queue worker active.",
         "queue:work supervisor", "Server access", "Jobs processed; failed-jobs stays low.", "Medium"),
        ("Session/cookie security on HTTPS", "Verify secure cookies, CSRF on POSTs, rate limiting active.",
         "Attempt 6 rapid logins", "Deployed HTTPS URL", "Throttle 429 on abuse; cookies Secure/HttpOnly.", "Medium"),
    ]
    for name, steps, data, pre, exp, sev in PR:
        add(tc("Prod", name, steps, data, pre, exp, sev))

    return rows

# ---------------------------------------------------------------- styling
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
SEV_FILL = {"High": "F8CBAD", "Medium": "FFF2CC", "Low": "E2EFDA"}
STATUS_FILL = {"Pending": "FFF2CC", "Passed": "C6EFCE", "Failed": "FFC7CE"}

def write_sheet(wb, title, rows, summary=None):
    ws = wb.create_sheet(title)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:N{len(rows)+1}"
    headers = HEADERS
    for c, h in enumerate(headers, 1):
        cell = ws.cell(1, c, h)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = PatternFill("solid", fgColor="1F4E78")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    widths = [14, 34, 52, 40, 34, 56, 14, 14, 12, 24, 26, 12, 12, 12]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.row_dimensions[1].height = 30
    for r, t in enumerate(rows, 2):
        vals = [t["id"], t["name"], t["steps"], t["data"], t["pre"], t["expected"],
                t["actual"], t["status"], t["severity"], t["comments"], t["remark"],
                t["tested"], t["resolved_in"], t["resolved_by"]]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(r, c, v)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.font = Font(size=10)
            cell.border = BORDER
        ws.cell(r, 9).fill = PatternFill("solid", fgColor=SEV_FILL[t["severity"]])
        ws.cell(r, 9).alignment = Alignment(horizontal="center", vertical="top")
        ws.cell(r, 8).fill = PatternFill("solid", fgColor=STATUS_FILL[t["status"]])
        ws.cell(r, 8).alignment = Alignment(horizontal="center", vertical="top")
        ws.cell(r, 7).alignment = Alignment(horizontal="center", vertical="top")
        ws.cell(r, 1).font = Font(size=10, bold=True)
    # dropdowns
    dv_status = DataValidation(type="list", formula1='"Pending,Passed,Failed,Blocked,Not Implemented,Requires Investigation"', allow_blank=True)
    dv_sev = DataValidation(type="list", formula1='"Critical,High,Medium,Low"', allow_blank=True)
    ws.add_data_validation(dv_status); ws.add_data_validation(dv_sev)
    dv_status.add(f"H2:H{len(rows)+1}")
    dv_sev.add(f"I2:I{len(rows)+1}")
    ws.cell(1, 1).comment = None
    return ws

def build_summary(wb, rows):
    ws = wb.create_sheet("Summary & Checklist", 1)
    ws.column_dimensions["A"].width = 6
    ws.column_dimensions["B"].width = 26
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 60
    r = 1
    def head(text, size=13):
        nonlocal r
        ws.cell(r, 1, text).font = Font(bold=True, size=size, color="1F4E78")
        r += 1
    def table(headers, data, widths=(26, 12, 60)):
        nonlocal r
        for c, h in enumerate(headers, 2):
            cell = ws.cell(r, c, h)
            cell.font = Font(bold=True, color="FFFFFF", size=10)
            cell.fill = PatternFill("solid", fgColor="1F4E78")
            cell.border = BORDER
        r += 1
        for row in data:
            for c, v in enumerate(row, 2):
                cell = ws.cell(r, c, v)
                cell.border = BORDER
                cell.font = Font(size=10)
                cell.alignment = Alignment(vertical="top", wrap_text=True)
            r += 1
        r += 1
    head("Restaurant SaaS ERP - Production Test Case Workbook")
    ws.cell(r, 2, "Generated (code audit date)").font = Font(bold=True); ws.cell(r, 3, "2026-10-31"); r += 1
    ws.cell(r, 2, "Total test cases").font = Font(bold=True); ws.cell(r, 3, len(rows)); r += 2

    head("Module-wise coverage summary", 11)
    mods = {}
    for t in rows:
        m = t["id"].split("-")[1]
        mods[m] = mods.get(m, 0) + 1
    table(["Module", "Cases", "Verified state in code"],
          [[m, n, "Code-verified routes/features" if m not in ("FIS",) else "Not Implemented (no fish-farm code found)"]
           for m, n in mods.items()])
    head("Incomplete features (verified)", 11)
    table(["Feature", "Status", "Evidence / note"],
          [["Fish Farm module (batches, ponds, mortality, harvest, feed, fish sales, fish/feed ledgers)",
            "Not Implemented", "Code search for fish|pond|mortality|harvest|feed returns only demo-data strings; no routes/controllers/models/migrations/pages."],
           ["Fish / Feed / Salary-advance / Personal-ledger business rules",
            "Backend Not Ready", "Depends on the missing fish-farm module; accounting module covers generic expenses/accounts only."],
           ["Dedicated fish/feed P&L and stock reports",
            "Not Implemented", "ReportController serves restaurant domain reports only."]])
    head("Production risk list", 11)
    table(["#", "Risk", "Mitigation to verify on production"],
          [[1, "Fish-farm module absent - core business cannot run", "Do not deploy as fish-farm ERP until module is built; current codebase is a restaurant ERP."],
           [2, "Demo-data generator writes bulk tenant data", "Confirm demo endpoints are disabled on production (settings.manage gate only)."],
           [3, "Payment webhooks without session auth", "Verify provider signature checks on /webhooks/*."],
           [4, "Offline POS sync conflicts", "Replay test offline bundle before go-live."],
           [5, "Storage symlink + permissions on deploy", "php artisan storage:link; writable storage verified."],
           [6, "APP_DEBUG=false and error reporting on prod", "Check .env and error page behaviour."],
           [7, "Queue workers / scheduler running", "Supervisor configured; schedule:list reviewed."]])
    head("Local vs Production verification checklist", 11)
    checks = ["Login/registration + email verification flow works on prod domain",
              "php artisan migrate:status clean on prod DB",
              "php artisan config:cache / route:cache / npm run build executed",
              "storage:link created; upload test passes",
              "Queue worker + scheduler running under supervisor",
              "Health probe /health returns 200 from load balancer",
              "All permission-gated routes return 403 for low-privilege staff",
              "Backup job configured and a restore rehearsed on staging",
              "Payment gateways in live mode with signed webhooks verified",
              "APP_DEBUG=false, HTTPS enforced, secure cookies verified"]
    for i, chk in enumerate(checks, 1):
        ws.cell(r, 2, i).font = Font(size=10, bold=True)
        ws.cell(r, 3, "Local").font = Font(size=10)
        ws.cell(r, 4, chk).font = Font(size=10)
        r += 1
    return ws

def main():
    rows = build()
    wb = Workbook()
    wb.remove(wb.active)
    # Main sheet with ALL cases
    write_sheet(wb, "Complete Test Cases", rows)
    # module sheets
    modules = {}
    for t in rows:
        m = t["id"].split("-")[1]
        modules.setdefault(m, []).append(t)
    names = {
        "FIS": "Fish Farm (Not Impl.)", "AUT": "Authentication", "STA": "Staff & Roles",
        "ONB": "Onboarding", "MEN": "Menu & Modifiers", "INV": "Inventory",
        "POS": "POS Orders & Shifts", "QRD": "QR Dining & Tables", "PUR": "Purchasing",
        "TRA": "Transfers & Waste", "ACC": "Expenses & Accounts", "CUS": "Customers & Loyalty",
        "RPT": "Reports", "SET": "Settings & Branches", "PLA": "Platform & Subscription",
        "PRO": "Production & System",
    }
    for m, rs in modules.items():
        write_sheet(wb, names.get(m, m), rs)
    build_summary(wb, rows)
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "Restaurant_SaaS_ERP_Production_Test_Cases.xlsx")
    wb.save(out)
    total = len(rows)
    critical = sum(1 for t in rows if t["severity"] == "High")
    print(f"Saved: {out}")
    print(f"Total test cases: {total}; High-severity: {critical}")

if __name__ == "__main__":
    main()
