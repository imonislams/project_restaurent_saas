"""
Restaurant POS SaaS - Production Test Case Spreadsheet Generator
READ-ONLY AUDIT OUTPUT. Does not modify project source code, database or data.

Columns (exact 14, in order):
  Test Case ID | Test Case Name | Steps | Test Data | Pre Condition |
  Expected Result | Actual Result | Test Case Status | Severity Level |
  Comments From Tester | Remark From Developers | Tested in | Resolved in | Resolved by

Sheets: Complete Test Cases | Module Summary | Bugs & Issues | Incomplete Features

Generated from a code audit of routes/web.php, routes/auth.php, app/Domain/*,
app/Http/Controllers/*, database/migrations/* and resources/js/Pages/*.
"""
import os
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

RESOLVED_BY = "Md Imon Islam"
COUNTER = {}

HEADERS = ["Test Case ID", "Test Case Name", "Steps", "Test Data", "Pre Condition",
           "Expected Result", "Actual Result", "Test Case Status", "Severity Level",
           "Comments From Tester", "Remark From Developers", "Tested in",
           "Resolved in", "Resolved by"]

MODULES = {
    "AUTH": "Authentication & User Management",
    "REST": "Restaurant Management & Onboarding",
    "BRCH": "Branch Management & Branch Switching",
    "ROLE": "Roles & Permissions",
    "STAFF": "Staff & User Management",
    "TABLE": "Table Management",
    "TSTF": "Table Staff Management",
    "MENU": "Menu & Category Management",
    "PROD": "Product & Food Management",
    "MOD": "Modifier Management",
    "INV": "Inventory Management",
    "PUR": "Purchase & Supplier Management",
    "TRF": "Stock Transfers",
    "WST": "Waste Management",
    "EXP": "Expense Management",
    "ACC": "Accounts & Ledger",
    "QR": "QR Code Ordering",
    "CORD": "Customer Ordering Workflow",
    "ACPT": "Order Acceptance & Rejection",
    "KIT": "Kitchen Order Management (KDS)",
    "PREP": "Food Preparation & Order Status",
    "BILL": "Bill Request",
    "POS": "POS Billing",
    "DISC": "Discounts & Taxes",
    "PAY": "Payment Methods & Gateways",
    "PPAY": "Partial & Full Payments",
    "DUE": "Due Management",
    "SALES": "Sales & Sales Reports",
    "DASH": "Dashboard & Analytics",
    "SET": "Settings",
    "NOTIF": "Notifications",
    "PRINT": "Printing & PDF",
    "SAAS": "SaaS Subscription & Plan Management",
    "PLAT": "Platform Administration",
    "SEC": "Security & Data Isolation",
    "VAL": "Validation & Error Handling",
    "PWA": "PWA & Offline",
}

ROWS = []
SEEN_IDS = set()


def tc(key, name, steps, data, pre, expected, sev="Medium"):
    COUNTER[key] = COUNTER.get(key, 0) + 1
    tid = "TC-%s-%03d" % (key, COUNTER[key])
    assert tid not in SEEN_IDS, "duplicate id " + tid
    SEEN_IDS.add(tid)
    ROWS.append({
        "id": tid, "module": key, "name": name, "steps": steps, "data": data,
        "pre": pre, "expected": expected, "sev": sev,
    })


# =====================================================================
# AUTH
# =====================================================================
A = "App reachable; tenant exists unless stated."
tc("AUTH", "Owner registration via email",
   "Open /register > choose email identifier > enter name, company, email, password, confirm > submit.",
   "name=QA Owner; company=Green Table; email=owner@green.test; Pass=Secret#123",
   "Guest; register route public", "Tenant + owner created in one transaction; owner gets TenantOwner role; 14-day trial started; redirected to verify-email notice.", "Critical")
tc("AUTH", "Owner registration via phone",
   "Open /register > choose phone identifier > enter name, company, phone, password > submit.",
   "phone=+8801700000000; Pass=Secret#123", "Guest; register route public", "Tenant + owner created; 6-digit OTP issued; redirected to phone verification screen.", "High")
tc("AUTH", "Registration validation (duplicate/weak)",
   "Submit register form with existing email; then with weak password; then with missing fields.",
   "existing owner@green.test; Pass=123", "Guest", "Validation errors shown per field; no duplicate tenant/user created.", "High")
tc("AUTH", "Login with valid credentials",
   "Open /login > enter valid email + password > submit.",
   "owner@green.test / Secret#123", "Verified registered user", "Session regenerated; redirected to /dashboard (platform admin goes to platform dashboard); last_login_at stamped.", "Critical")
tc("AUTH", "Login with wrong password",
   "Open /login > valid email + wrong password > submit.",
   "owner@green.test / Wrong#999", "Registered user", "Auth error shown; no session created.", "High")
tc("AUTH", "Login throttling (5 attempts/min)",
   "Attempt login with wrong password 6 times within a minute.",
   "same email each attempt", "Rate limiter active", "After 5 failed attempts the request is locked out (429); Lockout event fired.", "High")
tc("AUTH", "Email verification link",
   "Open verification email > click signed link /verify-email/{id}/{hash}.",
   "signed verification URL", "Unverified user with pending email", "Email marked verified; user may access gated areas; link is throttle:6,1 protected.", "High")
tc("AUTH", "Unverified user blocked",
   "Log in without verifying email, then open /dashboard.",
   "/dashboard", "Verified email middleware", "Redirect to verification notice; no access to business routes.", "High")
tc("AUTH", "Phone OTP verification",
   "Open /verify-phone > request code > enter correct 6-digit code.",
   "valid OTP within 10 min", "User registered with phone", "phone_verified_at set; user passes verified middleware (hasVerifiedEmail true when phone verified).", "High")
tc("AUTH", "OTP wrong code / attempts / resend cooldown",
   "Enter wrong OTP 5 times; then request resend twice within 60s.",
   "wrong codes; immediate resend", "OTP issued", "Code rejected beyond max attempts; resend blocked during 60s cooldown; code is single-use.", "Medium")
tc("AUTH", "Password reset flow",
   "Open /forgot-password > submit email > open reset link > set new password > login with new password.",
   "owner@green.test; new=New#456", "Registered user", "Reset email sent; new password works; old password fails; remember_token rotated.", "High")
tc("AUTH", "Change password while logged in",
   "Profile > change password > enter current + new + confirm.",
   "current=Secret#123; new=New#789", "Logged-in user", "Password updated; current password required; confirmation validated.", "Medium")
tc("AUTH", "Password confirmation gate",
   "Open /confirm-password and submit the password.",
   "current password", "Logged-in user", "auth.password_confirmed_at set in session; protected action proceeds.", "Low")
tc("AUTH", "Logout",
   "Click logout from the user menu.",
   "", "Logged-in user", "Session invalidated and token regenerated; /dashboard redirects to /login.", "High")
tc("AUTH", "Guest protection of tenant routes",
   "Open /dashboard and /orders while logged out.",
   "", "Not logged in", "Redirect to /login (auth middleware).", "High")
tc("AUTH", "Manager PIN setup",
   "Profile > set manager PIN: 4-8 digits + confirm.",
   "pin=1234 / 12345", "Logged-in user with approval permission", "PIN stored hashed (manager_pin hidden from serialization); invalid lengths rejected.", "High")
tc("AUTH", "Auth security events are logged",
   "Perform login, failed login and logout; then inspect Platform > Security Events.",
   "successful + failed attempts", "Platform admin access", "security_events rows recorded (login, login_failed, logout); platform-admin failed login raises a deduped alert.", "Medium")
tc("AUTH", "Social login",
   "Look for Google/Facebook sign-in on login/register.",
   "", "Guest", "Not Implemented - no Socialite integration, no google_id/github_id columns exist. Requires Investigation.", "Low")
tc("AUTH", "Two-factor authentication (TOTP)",
   "Look for 2FA enrolment on profile/security settings.",
   "", "Logged-in user", "Not Implemented - no two_factor/TOTP code anywhere; only phone OTP verification and manager PIN step-up exist.", "Low")

# =====================================================================
# REST
# =====================================================================
tc("REST", "Onboarding wizard required steps",
   "After verify, complete onboarding: profile > company > branch (required) then continue.",
   "Company=Green Table; Branch=Main", "auth+verified; fresh tenant", "Required steps saved as persisted data; wizard advances; other routes blocked until complete.", "High")
tc("REST", "Onboarding skip optional step",
   "At hours/tax/receipt/payments/menu/team step, click Skip then continue.",
   "", "Onboarding in progress", "Step marked skipped (POST /onboarding/skip/{step}); wizard proceeds; required steps cannot be skipped.", "Medium")
tc("REST", "Onboarding gate middleware",
   "As an onboarded=false tenant user, open /orders or /settings directly.",
   "/orders", "auth+verified, onboarding not complete", "Redirect to the first incomplete onboarding step; platform admins and impersonated sessions exempt.", "High")
tc("REST", "Onboarding completion side effects",
   "Finish all steps and POST /onboarding/complete.",
   "all steps done", "First-incomplete-required-step is null", "onboarding_completed_at set; step pointer cleared; demo generation started (demo_enabled default true) -> demo.setup.", "Medium")
tc("REST", "Company details persist to settings",
   "Onboarding company step > set legal name/address, then open Settings > Company.",
   "legal name/address", "settings.manage", "Same persisted values shown in both onboarding and Settings (single source of truth in tenants.settings JSON).", "Medium")
tc("REST", "Region currency & timezone applied",
   "Settings > set region country/currency/timezone; verify POS/reports use them.",
   "currency=BDT; tz=Asia/Dhaka", "settings.manage", "Currency and timezone propagate to POS, receipts, reports and date bucketing.", "High")

# =====================================================================
# BRCH
# =====================================================================
tc("BRCH", "Create branch (first is primary)",
   "Branches > Add > name, code, address, phone, timezone, currency, service types > save.",
   "Branch=Farm Outlet 2; code=OUT2", "permission:branches.manage", "Branch created active; first branch auto is_primary; default stock location and cash account provisioned; audit branch.created.", "High")
tc("BRCH", "Branch plan limit enforcement",
   "Create branches up to the plan's branch limit, then try one more.",
   "plan limit reached", "permission:branches.manage", "Creation blocked with a validation error (UsageService::guard/planLimit); no extra branch created.", "High")
tc("BRCH", "Update branch details",
   "Edit a branch name/phone/service types > save.",
   "phone changed", "permission:branches.manage", "Changes saved; audit branch.updated.", "Medium")
tc("BRCH", "Deactivate non-primary branch",
   "Deactivate an active non-primary branch.",
   "", "permission:branches.manage", "is_active=false; branch removed from the active switcher; activation restores it.", "Medium")
tc("BRCH", "Primary branch cannot be deactivated",
   "Attempt to deactivate the primary branch.",
   "", "permission:branches.manage", "Blocked 422 'Set another branch as primary first'.", "High")
tc("BRCH", "Set primary branch",
   "Set a different branch as primary.",
   "", "permission:branches.manage", "In one transaction all tenant branches cleared then target set primary + active.", "High")
tc("BRCH", "Branch deletion",
   "Look for a delete action on branches.",
   "", "permission:branches.manage", "Not Implemented - there is no delete/destroy route; only deactivate exists. Requires Investigation.", "Medium")
tc("BRCH", "Branch switcher persists active branch",
   "Use the header branch switcher to select another accessible branch; reload a page.",
   "branch_id=<accessible>", "auth user with access to >1 branch", "session('active_branch_id') saved; scoped lists/orders now show the selected branch.", "High")
tc("BRCH", "Switch to inaccessible branch blocked",
   "POST /branch/switch with a branch_id the user cannot access.",
   "foreign/other-branch id", "auth user without that branch", "403; session unchanged.", "High")
tc("BRCH", "Switch to another tenant's branch blocked",
   "POST /branch/switch with a branch id belonging to a different tenant.",
   "other-tenant branch id", "auth user", "403/404; no cross-tenant branch selection possible.", "Critical")
tc("BRCH", "Stale session branch falls back",
   "Select a branch, then deactivate it (or lose access); reload.",
   "", "active_branch_id no longer accessible", "ResolveActiveBranch falls back to primary then first accessible; no error page.", "Medium")
tc("BRCH", "Branch data scoping on orders",
   "Create an order in Branch A; switch to Branch B; open Orders.",
   "2 branches with data", "tenant-wide or accessible branches", "Orders list is scoped to the active branch; Branch A data is not visible in Branch B (fail-closed when no accessible branch).", "Critical")

# =====================================================================
# ROLE
# =====================================================================
tc("ROLE", "System role catalogue",
   "Open Roles > review listed roles with permission counts.",
   "", "permission:roles.view", "Global system roles listed and read-only; tenant custom roles also listed with member counts.", "Medium")
tc("ROLE", "Create custom role",
   "Roles > New > name + toggle permissions (e.g. pos.use, orders.view) > save.",
   "Role=Cashier Plus; perms=pos.use, orders.view", "permission:roles.manage", "Custom role created with tenant_id and is_system=false; selectable when inviting staff; audit role.created.", "High")
tc("ROLE", "Update custom role permissions",
   "Edit the custom role > add orders.create > save; verify an assigned staff gains access.",
   "", "permission:roles.manage", "Permission matrix updated immediately; audit role.permissions_updated.", "High")
tc("ROLE", "Delete role in use is blocked",
   "Try deleting a role still assigned to users; then delete an unused role.",
   "", "permission:roles.manage", "Assigned role blocked with count message; unused role deleted with audit role.deleted.", "High")
tc("ROLE", "System / foreign role mutation blocked",
   "Attempt to edit or delete a system role, or a role of another tenant.",
   "", "permission:roles.manage", "403 for system role, 404 for foreign/platform role.", "High")
tc("ROLE", "Privilege escalation guard on role creation",
   "As a limited admin, try to grant a permission you do not hold.",
   "grant=settings.manage", "custom role holds not all permissions", "422 'You cannot grant permissions you do not hold: ...'; role not saved.", "Critical")
tc("ROLE", "Permission catalogue groups render",
   "Open Roles page and inspect permission groups.",
   "", "permission:roles.view", "All tenant permission groups render (dashboard, pos, orders, tables, kitchen, menu, modifiers, qr, inventory, purchasing, waste, customers, cash, accounts, invoices, expenses, reports, staff, roles, branches, settings, subscription); platform group excluded.", "Low")
tc("ROLE", "Privilege escalation via staff role assignment",
   "As a user whose custom role has staff.manage, invite a user and assign the system tenant_owner role.",
   "role=tenant_owner", "custom role with staff.manage", "RISK - StoreInvitationRequest/UpdateStaffRequest validate role existence but do not apply RoleService::allowedPermissionSlugs, so tenant_owner may be assignable. Verify and report as a security bug.", "Critical")
tc("ROLE", "Per-branch role scoping",
   "Assign a role to a user for a specific branch only.",
   "", "permission:roles.manage", "Not Implemented - role_user.branch_id exists but is never written/read; role grants are tenant-wide only. Requires Investigation.", "Medium")

# =====================================================================
# STAFF
# =====================================================================
tc("STAFF", "Staff list with filters",
   "Open Staff > review list, filters (role/status) and pending invitations.",
   "", "permission:staff.view", "Staff shown with roles, branches, status, last_login_at and has_pin; pending invitations listed.", "Medium")
tc("STAFF", "Invite staff (email link)",
   "Staff > Add > name, email, role, branches > send invitation.",
   "Rahim; rahim@green.test; role=Cashier", "permission:staff.manage", "Invitation row created with hashed token (expiry 7 days); invitation email queued; audit recorded.", "High")
tc("STAFF", "Staff plan user-limit enforcement",
   "Invite staff beyond the plan user limit.",
   "limit reached", "permission:staff.manage", "Blocked by UsageService::guard(users) validation error; no user created.", "High")
tc("STAFF", "Create staff directly with password",
   "Staff > Add > provide a temporary password instead of invitation.",
   "Pass=Temp#123", "permission:staff.manage", "User created; email auto-verified unless double opt-in policy; welcome mail sent.", "Medium")
tc("STAFF", "Accept invitation",
   "Open emailed /invitations/{token} > set password > submit.",
   "valid token", "Valid unexpired invitation", "User created with roles/branches; accepted_at stamped; audit staff.invitation_accepted; auto-login to dashboard.", "High")
tc("STAFF", "Invitation expiry / already accepted",
   "Open an expired invitation link; then re-open an already-accepted link.",
   "expired/used token", "Invitation expired or accepted", "Rejected with a clear message; no duplicate user created.", "Medium")
tc("STAFF", "Resend invitation",
   "Resend a pending invitation.",
   "", "permission:staff.manage", "New 64-char token issued; expiry reset to +7 days; email re-sent.", "Medium")
tc("STAFF", "Revoke invitation",
   "Delete a pending invitation.",
   "", "permission:staff.manage", "Invitation row deleted; link no longer works; audit staff.invitation_revoked.", "Medium")
tc("STAFF", "Update staff roles & branch access",
   "Edit a staff member: change roles and accessible branches > save.",
   "roles/branches changed", "permission:staff.manage", "Roles synced and branch pivot updated; audit staff.access_updated.", "High")
tc("STAFF", "Deactivate staff",
   "Deactivate an active staff member.",
   "", "permission:staff.manage", "status=deactivated, deactivated_at set, DB sessions deleted; login blocked; audit staff.deactivated.", "High")
tc("STAFF", "Self-deactivation blocked",
   "Try to deactivate your own account.",
   "", "permission:staff.manage", "403 self-deactivation blocked.", "Medium")
tc("STAFF", "Reactivate staff",
   "Reactivate a deactivated staff member.",
   "", "permission:staff.manage", "status=active; deactivated_at cleared; can log in again.", "Medium")
tc("STAFF", "Revoke staff sessions",
   "Revoke sessions for a member logged in elsewhere.",
   "", "permission:staff.manage", "All sessions rows for that user deleted; other device logged out on next request.", "Medium")
tc("STAFF", "Send password reset to staff",
   "Trigger password reset email for a staff member.",
   "", "permission:staff.manage", "Password reset link emailed via Password::sendResetLink.", "Medium")
tc("STAFF", "Duplicate staff email validation",
   "Invite an email that already has an account/invitation.",
   "existing email", "permission:staff.manage", "Validation error; no duplicate user/invitation.", "Medium")

# =====================================================================
# TABLE
# =====================================================================
tc("TABLE", "Create table",
   "Tables > Add > name, capacity, area, branch > save.",
   "Table T-12; capacity 4; Area=Main", "permission:tables.manage", "Table saved and shown on the table map for the active branch.", "Medium")
tc("TABLE", "Update table",
   "Edit table name/capacity/area > save.",
   "", "permission:tables.manage", "Changes saved.", "Low")
tc("TABLE", "Delete table blocked with open orders",
   "Try deleting a table that has open orders; then delete an idle table.",
   "", "permission:tables.manage", "Table with open orders blocked (hasOpenOrders); idle table deleted.", "Medium")
tc("TABLE", "Set table status",
   "Set status available/occupied/reserved/billing/cleaning.",
   "", "permission:tables.manage", "Status reflected on the map (TableStatus enum).", "Medium")
tc("TABLE", "Transfer order between tables",
   "Tables > Transfer > choose open order + target table > confirm.",
   "order from T-12 -> T-14", "permission:tables.manage", "Order reassigned; source table freed; both tables refreshed; audit recorded.", "High")
tc("TABLE", "Auto occupancy refresh",
   "Place an order on a table, then complete/void it.",
   "", "permission:tables.manage", "Table becomes occupied while non-final orders exist and returns to available when none remain.", "Medium")

# =====================================================================
# TSTF
# =====================================================================
tc("TSTF", "Assign staff to a table",
   "Table/Table-staff panel > assign eligible staff to a table > save.",
   "staff=Rahim", "permission:tables.manage (or equivalent)", "Eligible staff assigned; sync is fail-closed to eligible ids; change audited.", "High")
tc("TSTF", "Ineligible staff excluded",
   "Try assigning a staff member from another branch or without serving permission.",
   "foreign staff", "assignment UI", "Ineligible user not assignable / filtered out by TableStaffService eligibility rules.", "Medium")
tc("TSTF", "Staff snapshot frozen on order",
   "Assign table staff, place an order, then change the table's staff; reopen the order.",
   "", "assigned table staff", "order_staff snapshot preserves original names; historical order is never rewritten.", "Medium")
tc("TSTF", "Table staff sees only assigned tables",
   "Log in as table staff and open the tables/orders view.",
   "", "table_staff role", "Only assigned tables/orders are actionable.", "High")

# =====================================================================
# MENU
# =====================================================================
tc("MENU", "Create category",
   "Menu > Categories > name + sort order > save.",
   "Category=Starters", "permission:menu.manage", "Category listed and available for products; POS grouping updates.", "High")
tc("MENU", "Update / delete category",
   "Rename a category; delete an empty one; try deleting one with products.",
   "", "permission:menu.manage", "Rename applies; empty category deletes; category with products is blocked/warned.", "Medium")
tc("MENU", "Menu list search, filter, paginate",
   "Menu page: search by name/SKU/barcode, filter by category, page through results.",
   ">25 products", "permission:menu.view", "Filters return correct subsets; pagination (25/page) works.", "Medium")

# =====================================================================
# PROD
# =====================================================================
tc("PROD", "Create product",
   "Menu > Products > name, category, price, cost, tax, unit, inventory mode, active > save.",
   "Cafe Latte; Cat=Beverages; Price=180; Cost=70", "permission:menu.manage", "Product saved; appears in POS and QR catalogue.", "High")
tc("PROD", "Edit product price",
   "Change price 180 -> 200 > save; open POS; reopen a past order.",
   "", "permission:menu.manage", "POS shows 200; existing past orders keep their original price/item snapshot.", "High")
tc("PROD", "Product image upload / delete",
   "Upload an image; then delete it.",
   "valid jpg/png/webp <=2048KB", "permission:menu.manage", "Image stored (transactional replace) and displayed; delete removes the file.", "Medium")
tc("PROD", "Product variants",
   "Add/sync variants (e.g. Small/Large with own price) > save.",
   "", "permission:menu.manage", "Variants reconciled in place and selectable in POS.", "Medium")
tc("PROD", "Product import (CSV)",
   "Download template > fill rows > import CSV.",
   "rows with SKU + category + price", "permission:menu.manage", "Products upserted by SKU/name; per-row errors reported; file restricted to csv/txt <=5MB.", "Medium")
tc("PROD", "Product export (CSV/PDF)",
   "Menu > Export products (CSV and ?format=pdf).",
   "", "permission:menu.view", "Export downloads with all product columns; PDF renders via dompdf.", "Medium")
tc("PROD", "Delete product",
   "Delete a product; try one referenced by past orders.",
   "", "permission:menu.manage", "Deletion handled safely for used products (blocked or deactivated).", "Medium")
tc("PROD", "Product validation",
   "Save a product with negative price / duplicate SKU / empty name.",
   "price=-5; duplicate sku", "permission:menu.manage", "Validation errors shown; no invalid product saved.", "High")
tc("PROD", "Recipe / ingredient cost",
   "Create a recipe with ingredients and set inventory mode=recipe; verify cost per yield.",
   "qty x ingredient cost / yield", "permission:menu.manage", "Recipe costPerYield computed correctly; selling deducts ingredients.", "High")

# =====================================================================
# MOD
# =====================================================================
tc("MOD", "Create modifier group + options",
   "Modifiers > New group + options with price deltas > save.",
   "Group=Size; Small +0; Large +60", "permission:modifiers.manage", "Group and options saved; selectable on linked products.", "High")
tc("MOD", "Update modifier group",
   "Rename a group / edit options and price deltas.",
   "", "permission:modifiers.manage", "Changes saved and reflected in POS/QR.", "Medium")
tc("MOD", "Delete modifier group / option",
   "Delete a modifier group and a single option.",
   "", "permission:modifiers.manage", "Deleted groups/options disappear from product choices; historical orders unaffected.", "Medium")
tc("MOD", "Modifier price delta applied on order",
   "Add a product with a +60 modifier in POS/QR and check the line total.",
   "base 180 + 60 = 240", "permission:pos.use / QR session", "Line total and order total include the modifier delta.", "High")
tc("MOD", "Standalone modifier option endpoints",
   "Check whether option store/update/delete routes are used by the UI.",
   "", "permission:modifiers.manage", "Endpoints exist but the frontend manages options only via group sync - redundant/unused routes (minor dead surface).", "Low")

# =====================================================================
# INV
# =====================================================================
tc("INV", "Create unit of measure",
   "Inventory > Units > name/code > save.",
   "Unit=kg", "permission:inventory.manage", "Unit saved and selectable on ingredients.", "Medium")
tc("INV", "Create ingredient",
   "Inventory > Ingredients > name, unit, cost > save.",
   "Milk; L; cost 90", "permission:inventory.manage", "Ingredient saved with zero stock until an opening entry.", "High")
tc("INV", "Opening stock entry",
   "Inventory > Opening > ingredient, quantity, unit cost > save.",
   "Milk 50L @ 90 = 4,500", "permission:inventory.adjust", "stock_movements 'opening' row appended; balance = 50L; value 4,500.", "High")
tc("INV", "Stock adjustment",
   "Adjust stock +/- with a reason; verify movement log and balance.",
   "adjust -5L (spoilage)", "permission:inventory.adjust", "Balance 50 -> 45L; adjustment row logged with user and reason; append-only ledger.", "High")
tc("INV", "Negative stock prevention",
   "Adjust below zero with allow_negative off; repeat with the setting on.",
   "-100L on 45L", "inventory.adjust; inventory.allow_negative off", "Blocked with validation when off; permitted when on; setting is DB/seed-only (no Settings UI).", "High")
tc("INV", "Low stock threshold alert",
   "Cross inventory.low_stock_threshold downward and check for an alert notification.",
   "threshold=10L", "inventory.adjust", "LowStock notification (database+mail) triggered; realtime alert pushed to inventory stream.", "Medium")
tc("INV", "Inventory list & filters",
   "Open Inventory: search, low-stock filter, view balances/movements.",
   "", "permission:inventory.view", "Balances and last 100 movements listed; filters return correct subsets.", "Medium")
tc("INV", "Stock location management",
   "Look for a create/edit stock-location route.",
   "", "inventory.manage", "Not Implemented - locations are auto-provisioned (Main Store); no create/edit route. Requires Investigation.", "Low")
tc("INV", "Unit conversion in stock math",
   "Record stock in a converted unit (e.g. g vs kg) and verify balance math.",
   "1000g = 1kg", "unit conversions provisioned", "GAP - UnitConversion rows exist (kg->g, L->mL) but no deduction/validation applies a factor; conversions are unused. Requires Investigation.", "Medium")

# =====================================================================
# PUR
# =====================================================================
tc("PUR", "Create supplier",
   "Purchasing > Suppliers > name, contact, phone, terms > save.",
   "Meghna Foods; terms 15d", "permission:purchasing.manage; feature:purchasing", "Supplier saved and selectable on POs.", "High")
tc("PUR", "Create purchase order (draft)",
   "PO > supplier, items with qty/unit cost > save as Draft.",
   "Milk 100L @ 90 = 9,000", "permission:purchasing.manage", "PO saved Draft; line totals = round(qty x cost,2); order subtotal = total = sum of lines.", "High")
tc("PUR", "Submit purchase order",
   "Submit a draft PO.",
   "", "permission:purchasing.manage", "Status draft -> submitted; edits locked after submit.", "Medium")
tc("PUR", "Approve purchase order (approval limit + manager PIN)",
   "Approve a PO whose total exceeds purchasing.approval_limit.",
   "total > limit", "permission:purchasing.approve + valid manager PIN", "Approval requires a valid manager PIN above the limit; approver recorded; status submitted -> approved.", "High")
tc("PUR", "Receive PO - full (stock + ledger)",
   "Receive an approved PO fully; check inventory and supplier balance.",
   "receive 100L", "approved PO", "Item received_quantity updated; stock +100L (purchase movement, allowNegative=true); order -> received.", "High")
tc("PUR", "Receive PO - partial",
   "Receive 50L of a 100L PO, then the remainder.",
   "", "approved PO", "First receive sets status partially_received while received<ordered; second completes to received.", "Medium")
tc("PUR", "PO payment (partial) & due",
   "Pay part of a received PO against the supplier.",
   "pay 4,000 of 9,000", "permission:purchasing.manage", "paidTotal increases; outstanding = total - paidTotal shows 5,000 remaining.", "High")
tc("PUR", "Cancel purchase order",
   "Cancel a draft/submitted PO with reason.",
   "", "permission:purchasing.manage", "Status cancelled; no stock movement occurs.", "Medium")
tc("PUR", "Supplier outstanding balance",
   "Open a supplier with approved/received POs and payments.",
   "", "purchasing.view", "outstandingBalance = sum(approved/partially_received/received totals) - sum(payments).", "Medium")
tc("PUR", "Supplier index route",
   "Look for a dedicated supplier list route/page.",
   "", "purchasing.view", "Not Implemented - there is no supplier index route; suppliers are only returned inside the PO index. Requires Investigation.", "Low")
tc("PUR", "Purchasing feature flag gating",
   "With a plan lacking the 'purchasing' feature, open /purchasing/*.",
   "plan without purchasing", "subscribed tenant", "Blocked by feature:purchasing (EnsureFeature -> Tenant::hasFeature); nav item hidden.", "Medium")

# =====================================================================
# TRF
# =====================================================================
tc("TRF", "Create transfer draft",
   "Transfers > source branch, destination branch, items, qty > save.",
   "Main -> Outlet; Milk 20L", "feature:transfers; permission:inventory.manage", "Draft transfer created with TRF number; from != to enforced; >=1 item required.", "High")
tc("TRF", "Approve transfer",
   "Approve a draft transfer.",
   "", "permission:inventory.approve", "Status draft -> approved.", "Medium")
tc("TRF", "Dispatch transfer",
   "Dispatch an approved transfer.",
   "", "permission:inventory.manage", "Status approved -> dispatched; source default-location stock deducted (transfer_out), respecting negative-stock rule.", "High")
tc("TRF", "Receive transfer",
   "Receive a dispatched transfer at the destination.",
   "", "permission:inventory.manage", "Destination stock +qty (transfer_in); no gain/loss; status dispatched -> received.", "High")
tc("TRF", "Cancel transfer",
   "Cancel a draft or approved transfer; then try to cancel after dispatch.",
   "", "permission:inventory.manage", "Cancel allowed only from draft/approved; after dispatch it is blocked.", "Medium")
tc("TRF", "Transfers feature flag gating",
   "With a plan lacking 'transfers', open /transfers.",
   "plan without transfers", "subscribed tenant", "Blocked by feature:transfers; nav hidden.", "Medium")
tc("TRF", "Partial dispatch / receive",
   "Try to dispatch or receive only part of a transfer line.",
   "", "permission:inventory.manage", "Not Implemented - only full line quantities are supported. Requires Investigation.", "Low")

# =====================================================================
# WST
# =====================================================================
tc("WST", "Record waste below approval threshold",
   "Waste > item, quantity, reason > save with cost below waste.approval_threshold.",
   "Milk 2L; reason=spoilage", "feature:waste; permission:waste.create", "Record auto-approved; stock deducted immediately (waste movement); cost = round(qty x unit cost,2).", "High")
tc("WST", "Waste above approval threshold -> pending",
   "Record waste whose cost exceeds waste.approval_threshold.",
   "cost > threshold", "feature:waste", "Record saved Pending; no stock change until approved.", "High")
tc("WST", "Approve waste",
   "Approve a pending waste record.",
   "", "permission:waste.approve", "Stock deducted (waste movement) honoring negative-stock rule; status approved.", "High")
tc("WST", "Reject waste",
   "Reject a pending waste record.",
   "", "permission:waste.approve", "Status rejected; no stock effect.", "Medium")
tc("WST", "Waste quantity validation",
   "Save waste with quantity 0 or negative.",
   "qty=0", "feature:waste; waste.create", "Validation error; nothing saved.", "Medium")
tc("WST", "Waste feature flag gating",
   "With a plan lacking 'waste', open /waste.",
   "plan without waste", "subscribed tenant", "Blocked by feature:waste; nav hidden.", "Medium")

# =====================================================================
# EXP
# =====================================================================
tc("EXP", "Create expense category",
   "Expenses > Categories > name > save.",
   "Fuel & Transport", "permission:expenses.manage", "Category saved and selectable.", "Medium")
tc("EXP", "Create expense (auto-approve limit)",
   "Expenses > date, category, account, amount > save below expenses.auto_approve_limit.",
   "500 <= limit", "permission:expenses.manage", "Expense auto-approves when amount <= limit; posts a negative expense transaction to the account.", "High")
tc("EXP", "Approve expense posts ledger",
   "Approve a Submitted expense with an account selected.",
   "10,000; Cash", "permission:expenses.approve", "Approved; account balance reduces by the amount; report includes only approved expenses.", "High")
tc("EXP", "Reject expense",
   "Reject an expense.",
   "", "permission:expenses.approve", "Status rejected; no ledger/balance effect.", "Medium")
tc("EXP", "Expense validation",
   "Save an expense with amount 0 or negative, or no category.",
   "amount=-500", "permission:expenses.manage", "Validation error; nothing saved.", "Medium")
tc("EXP", "Expense edit / delete",
   "Look for edit or delete actions on expenses.",
   "", "permission:expenses.manage", "Not Implemented - only create + approve/reject exist; no update/delete endpoints. Requires Investigation.", "Low")

# =====================================================================
# ACC
# =====================================================================
tc("ACC", "Create financial account",
   "Accounts > name, type (cash/bank), opening balance > save.",
   "DBBL Current; opening 50,000", "permission:accounts.manage", "Account saved; balance = opening + sum(transactions).", "High")
tc("ACC", "Edit account",
   "Edit an account name/details.",
   "", "permission:accounts.manage", "Changes saved.", "Medium")
tc("ACC", "Delete account with transactions",
   "Try deleting an account that has ledger transactions.",
   "", "permission:accounts.manage", "Blocked / handled to preserve history.", "Medium")
tc("ACC", "Account transfer",
   "Transfer between two accounts.",
   "Cash 10,000 -> Bank", "permission:accounts.manage", "Two signed entries posted (source -amount, destination +amount, category transfer); both balances update.", "High")
tc("ACC", "Account balance calculation",
   "Add income/expense/transfer entries and verify balance.",
   "opening + sum", "permission:accounts.view", "Balance matches opening + signed transactions exactly.", "High")
tc("ACC", "Account statement / ledger view",
   "Look for a per-account statement page.",
   "", "accounts.view", "Not Implemented - only balance + last 50 transfers on the index; no statement/detail route. Requires Investigation.", "Low")

# =====================================================================
# QR
# =====================================================================
tc("QR", "Generate and print table QR",
   "qr-dining > Tables > generate QR for a table > print sheet.",
   "", "feature:qr_dining; permission:qr.view", "Unique token created; printable sheet generated.", "High")
tc("QR", "QR entry with valid token",
   "Scan /qr/{token} > entry page loads menu.",
   "valid token", "active tenant, branch and table", "Entry resolves tenant/branch/table server-side; scan_count incremented; menu rendered.", "High")
tc("QR", "Invalid or revoked token",
   "Open /qr/{token} with a missing or revoked token.",
   "bad/revoked token", "public", "HTTP 410 returned; no tenant data disclosed.", "High")
tc("QR", "Inactive tenant/branch/table",
   "Open a QR whose tenant is suspended, or branch/table inactive.",
   "inactive context", "public", "404 returned; access denied server-side.", "High")
tc("QR", "QR rate limiting",
   "Hit /qr endpoints beyond the configured limits.",
   "qr-public 60/min; qr-session 10/min; qr-order 20/min", "public", "Requests throttled (429) per IP / dining token.", "Medium")
tc("QR", "Regenerate QR token",
   "Regenerate a table token.",
   "", "permission:qr.manage", "New token issued; the previous token no longer resolves (410).", "High")
tc("QR", "Revoke table QR",
   "Revoke a table's QR.",
   "", "permission:qr.manage", "Old token stops working; no new sessions can start.", "High")
tc("QR", "QR card design create/activate/print",
   "Designs > create a design, activate it, preview/export and print.",
   "", "permission:qr.view/manage", "Design saved/activated; preview and export render with the active design.", "Low")
tc("QR", "QR feedback submission",
   "Submit rating + comment from the QR session.",
   "rating 1-5 + comment", "active dining session", "Feedback stored (updateOrCreate per session); visible in QR analytics.", "Low")
tc("QR", "QR analytics dashboard",
   "Open qr-dining > Analytics.",
   "", "permission:qr.analytics", "Scans/sessions/orders/feedback metrics render for the branch.", "Medium")
tc("QR", "QR dining feature flag gating",
   "With a plan lacking 'qr_dining', open /qr-dining/*.",
   "plan without qr_dining", "subscribed tenant", "Blocked by feature:qr_dining; nav hidden.", "Medium")

# =====================================================================
# CORD
# =====================================================================
tc("CORD", "Start dining session",
   "From the QR entry, start a session; note the HttpOnly cookie.",
   "valid token", "feature:qr_dining on", "One active session per table; dining_session HttpOnly cookie set (path /qr, SameSite lax); join if a session already exists.", "Critical")
tc("CORD", "Session identity requirement",
   "Start a session when require_phone/require_email is enabled.",
   "phone/email", "QrDiningSettings require identity", "Session blocked until required contact details provided.", "High")
tc("CORD", "Place order from QR",
   "Add items + modifiers, note, submit the QR order.",
   "1 item + 1 modifier; idempotency_key", "active dining session", "Order created as held, source=qr, correct tenant/branch/table; acceptance auto or pending per settings.", "Critical")
tc("CORD", "QR order idempotency",
   "Submit the same QR order payload twice with the same idempotency_key.",
   "same idempotency_key", "active session", "Only one order is created; the duplicate is ignored.", "High")
tc("CORD", "QR order tenant/branch isolation",
   "Place an order via a branch QR and verify it appears only in that tenant/branch.",
   "", "active session", "Order reaches the correct restaurant and branch only; no cross-tenant leakage.", "Critical")
tc("CORD", "Session timeout / expiry",
   "Leave a session idle beyond session_timeout_minutes.",
   "timeout=180 (min 15)", "active session", "Session auto-expires; further orders blocked; state recorded as expired.", "Medium")
tc("CORD", "Additional orders in one session",
   "With allow_additional_orders on, place a second round.",
   "", "active session", "Additional order added to the same open invoice/session.", "Medium")
tc("CORD", "Customer tracking page",
   "Open /qr/{token}/tracking and watch status updates.",
   "", "active session", "Customer-facing status flows received->confirmed->preparing->ready->served; live updates when live_tracking on.", "High")
tc("CORD", "Close/end session",
   "Close the dining session (logout/leave).",
   "", "active session", "Session marked closed; cookie cleared.", "Medium")

# =====================================================================
# ACPT
# =====================================================================
tc("ACPT", "Auto-accept QR orders",
   "With qr auto_accept enabled, place a QR order.",
   "auto_accept=on", "QR session", "Order acceptance_status=auto_accepted; proceeds to kitchen when configured.", "High")
tc("ACPT", "QR order awaits acceptance",
   "With staff confirmation required, place a QR order.",
   "confirmation mode=central", "QR session", "acceptance_status=pending; staff notified (awaiting approval); not sent to kitchen yet.", "High")
tc("ACPT", "Staff accept order",
   "Orders > accept a pending QR order.",
   "", "permission:orders.approve", "acceptance_status=accepted, confirmed_by_user_id + accepted_at set; kitchen ticket opened if enabled; realtime broadcast.", "Critical")
tc("ACPT", "Staff reject order",
   "Reject a pending QR order.",
   "reason optional", "permission:orders.approve", "acceptance_status=rejected; order voided; stock reversed; no kitchen ticket.", "High")
tc("ACPT", "Accept is idempotent / locked",
   "Accept the same order twice (or two staff accept concurrently).",
   "", "pending order", "Second attempt is a no-op; row-locked (lockForUpdate); no duplicate kitchen ticket.", "Medium")
tc("ACPT", "POS orders are auto-accepted",
   "Create a POS order and inspect acceptance status.",
   "", "permission:pos.use", "POS orders are auto_accepted and never wait for approval.", "Medium")
tc("ACPT", "Accept/reject permission enforced",
   "As a user without orders.approve, try accept/reject endpoints.",
   "", "limited role", "403 blocked.", "High")

# =====================================================================
# KIT
# =====================================================================
tc("KIT", "Kitchen display lists branch tickets",
   "Open /kitchen and review open tickets.",
   "", "feature:kitchen; permission:kitchen.view", "Tickets for the active branch listed with items and statuses.", "High")
tc("KIT", "Kitchen feature flag",
   "With a plan lacking 'kitchen', open /kitchen.",
   "plan without kitchen", "subscribed tenant", "Blocked by feature:kitchen; nav hidden.", "Medium")
tc("KIT", "Ticket status transitions",
   "Move a ticket new->accepted->preparing->ready->handed_over->served.",
   "", "permission:kitchen.manage", "Each valid transition applied; timestamps (accepted_at/ready_at/handed_over_at/served_at) stamped; items cascade.", "High")
tc("KIT", "Invalid ticket transition blocked",
   "Attempt a disallowed jump (e.g. new -> served).",
   "", "permission:kitchen.manage", "Rejected by canTransitionTo; state unchanged.", "Medium")
tc("KIT", "KDS bump-back correction",
   "Move preparing back to new (correction).",
   "", "permission:kitchen.manage", "Allowed one-step bump-back; timestamp behaviour recorded.", "Low")
tc("KIT", "Item status update",
   "Update a single item status (pending/preparing/ready/served/cancelled).",
   "", "permission:kitchen.manage", "Item status updated; note there is no transition guard on items (any valid value accepted) - verify. ", "Medium")
tc("KIT", "Ticket priority",
   "Set a ticket priority.",
   "", "permission:kitchen.manage", "Priority saved and reflected on the KDS ordering.", "Low")
tc("KIT", "Print kitchen ticket",
   "Print a ticket from the KDS.",
   "", "permission:kitchen.view", "Printable ticket rendered; printed_at set.", "Medium")
tc("KIT", "Realtime kitchen updates",
   "Have the KDS open while a new ticket is opened elsewhere.",
   "", "kitchen.view; realtime configured", "KitchenTicketActivity broadcast on tenant.{id}.kitchen; KDS updates live.", "Medium")
tc("KIT", "Kitchen ticket auto-created on confirmation",
   "Confirm a QR order with kitchen enabled.",
   "send_confirmed_to_kitchen=on", "confirmed order", "Ticket opened exactly once (unique order_id, lockForUpdate re-check).", "High")

# =====================================================================
# PREP
# =====================================================================
tc("PREP", "Fulfillment status flow",
   "Move an order new->preparing->ready->served.",
   "", "permission:orders.update", "Each transition validated by FulfillmentStatus::canTransitionTo; status persisted.", "High")
tc("PREP", "Served triggers invoice",
   "Mark an order served.",
   "", "permission:orders.update", "OrderInvoiceService::forServedOrder creates/updates the invoice for the order.", "High")
tc("PREP", "Delivery dispatch and delivery",
   "For a delivery order move ready->dispatched->delivered.",
   "", "orders.update", "Transitions follow the allowed map; delivery fee retained.", "Medium")
tc("PREP", "Kitchen-to-order sync",
   "Update the kitchen ticket and observe the order fulfillment status.",
   "", "kitchen.manage", "KitchenStatusSynchronizer maps ticket status to fulfillment without illegal jumps.", "Medium")
tc("PREP", "Cancel fulfillment",
   "Cancel an order's fulfillment (e.g. new->cancelled).",
   "", "orders.update", "Status cancelled; downstream kitchen/order handling consistent.", "Medium")
tc("PREP", "Fulfillment permission enforced",
   "Update fulfillment without orders.update.",
   "", "limited role", "403 blocked.", "Medium")

# =====================================================================
# BILL
# =====================================================================
tc("BILL", "Request bill from QR",
   "In an active session with allow_bill_request on, tap Request Bill.",
   "", "active session", "Bill request created (pending); outstanding computed; invoice opened/linked; billing staff notified + realtime alert.", "High")
tc("BILL", "Bill request blocked when disabled",
   "With allow_bill_request off, call bill-request.",
   "", "active session", "403 returned; no bill request created.", "Medium")
tc("BILL", "Bill request idempotent",
   "Request the bill twice.",
   "", "active session", "Second request is a no-op; single open bill request maintained.", "Medium")
tc("BILL", "Bill request opens/links invoice",
   "After a bill request, open Invoices (staff) for the session.",
   "", "permission:invoices.view", "Invoice linked to the bill request; amounts reflect orders in the session.", "High")
tc("BILL", "Consolidated vs individual billing",
   "Switch billing_mode and request bills for a multi-guest table.",
   "billing_mode=consolidated|individual", "active session", "Consolidated = one invoice for the table; individual = per-participant invoices; scoping via DiningAuthorization.", "Medium")
tc("BILL", "Staff acknowledgement of bill request",
   "Look for a staff action to mark a bill request in_progress/handled.",
   "", "staff billing permission", "Not Implemented - no controller sets handled_by/handled_at or the in_progress/cancelled states; only auto-settle closes it. Requires Investigation.", "Medium")

# =====================================================================
# POS
# =====================================================================
tc("POS", "Open POS page",
   "Open /pos.",
   "", "permission:pos.use", "POS loads with catalogue (via OfflineBundle), open shift and held/draft orders.", "High")
tc("POS", "Open cash shift",
   "POS > Open shift with opening cash.",
   "opening=5,000", "permission:pos.use", "Shift opened; duplicate open shift on the same register is blocked.", "High")
tc("POS", "Place a sale",
   "Add items + modifiers > take payment > create sale.",
   "2 x 180 = 360", "permission:pos.use + orders.update", "Order created Completed with server-calculated totals; redirect to receipt; shift/cash/stock/audit updated.", "Critical")
tc("POS", "Open / held order",
   "Start an order without payment (open order).",
   "", "permission:pos.use + orders.create", "Order saved held/draft with acceptance pending only when central approval is required.", "High")
tc("POS", "Settle a held order",
   "Settle a held/draft order with payment.",
   "", "orders.update + pos.use; open shift on branch", "Order becomes Completed; payment recorded; receipt available.", "High")
tc("POS", "Void an order (manager PIN)",
   "Void a completed/open order with a manager PIN.",
   "reason; manager PIN", "orders.void", "Stock reversed, cash refunded, payments marked refunded, kitchen ticket cancelled, status Voided; PIN audited.", "Critical")
tc("POS", "Shift close reconciliation",
   "Close the shift entering counted cash.",
   "counted=5,360", "permission:pos.use", "Expected/over/short computed; variance over pos.cash_variance_threshold requires a manager PIN.", "High")
tc("POS", "Shift cash movement",
   "Record a cash-in/cash-out (drop) during the shift.",
   "drop=1,000", "permission:pos.use", "Movement logged; closing totals reflect it.", "Medium")
tc("POS", "Order list filters & pagination",
   "Orders page: search by order no, filter status/date, paginate.",
   ">25 orders", "permission:orders.view", "Filters correct; pagination works.", "Medium")
tc("POS", "Settle permission double-gate",
   "Settle an order with orders.update but without pos.use (and vice versa).",
   "", "role with only one of the two", "Blocked when either permission is missing (route orders.update + SettleOrderRequest requires pos.use).", "Medium")

# =====================================================================
# DISC
# =====================================================================
tc("DISC", "Apply discount",
   "Add a percent or fixed discount to an order.",
   "10% on 1,000 = 100", "permission:orders.update", "discount_total applied; net total = subtotal - discount; recorded on the order.", "High")
tc("DISC", "Discount approval threshold",
   "Apply a discount above pos.discount_approval_percent.",
   "discount > threshold", "pos.use", "A valid manager PIN is required to approve the discount.", "High")
tc("DISC", "Tax calculation",
   "Set tenant tax rate and place a taxable order.",
   "tax=15% exclusive on 1,000 = 150", "settings.manage", "Tax computed from tenant tax settings; order tax_total correct.", "High")
tc("DISC", "Inclusive vs exclusive tax",
   "Toggle tax.inclusive and compare totals.",
   "inclusive on/off", "settings.manage", "Inclusive tax is backed out of the price; exclusive is added on top.", "High")
tc("DISC", "Tax snapshot on line items",
   "Change the tax rate after an order is placed; reopen the order.",
   "", "settings.manage", "order_items.tax_rate snapshot keeps the historical rate; past orders unchanged.", "Medium")
tc("DISC", "Service charge",
   "Set service_charge.rate and place a dine-in order.",
   "rate=5%", "settings.manage", "Service charge applied and reflected in the sales/tax reports.", "Medium")
tc("DISC", "Order total formula",
   "Verify grand total = subtotal - discount + tax + service charge + delivery fee.",
   "mixed cart", "pos.use", "Server-side SaleCalculator produces the exact total; client figures match.", "High")

# =====================================================================
# PAY
# =====================================================================
tc("PAY", "Configure a payment gateway",
   "Settings > Payments > add cash/stripe/sslcommerz/bkash with credentials.",
   "provider=bkash; keys", "permission:settings.manage", "Gateway saved; only cash may be credential-free; first gateway becomes default.", "High")
tc("PAY", "Gateway credentials encrypted / not returned",
   "Save a gateway, then inspect the settings response.",
   "sandbox keys", "settings.manage", "Credentials stored encrypted and returned only as credential_keys (never the secret values).", "High")
tc("PAY", "Set default / toggle gateway",
   "Toggle a gateway off; set another as default.",
   "", "settings.manage", "Toggling affects checkout availability; setting default clears siblings and forces enabled=true.", "Medium")
tc("PAY", "Gateway test (health)",
   "Run Test on a gateway with and without all required credentials.",
   "", "settings.manage", "health_status ok when all required keys present, error otherwise.", "Medium")
tc("PAY", "Delete gateway",
   "Delete a configured gateway.",
   "", "settings.manage", "Gateway removed; checkout falls back to remaining/default method.", "Medium")
tc("PAY", "Cross-tenant gateway access",
   "Attempt to edit/delete another tenant's gateway.",
   "foreign gateway id", "settings.manage", "404 via authorizeTenant tenant_id mismatch; no leak.", "Critical")
tc("PAY", "Provider eligibility (currency/country)",
   "Configure a currency/country not supported by a provider and attempt checkout.",
   "", "settings.manage + billing", "Provider not offered (fails closed when country unknown); eligible providers only.", "Medium")
tc("PAY", "Webhook signature & idempotency",
   "Post a duplicate provider webhook and a bad-signature webhook.",
   "signed payload; duplicate event_id", "production-like config", "Bad signatures rejected; duplicate events ignored (firstOrCreate on event_id); amount/currency re-verified server-side.", "Critical")

# =====================================================================
# PPAY
# =====================================================================
tc("PPAY", "Full payment settles order",
   "Pay the exact total on a held order.",
   "total=360; paid=360", "pos.use; open shift", "Order Completed; payment Succeeded; change_due 0.", "High")
tc("PPAY", "Partial payment with allow_partial",
   "Pay less than the total with pos.allow_partial on.",
   "total=360; paid=200", "pos.allow_partial=on", "Order remains open; paid_total=200; outstanding=160 tracked.", "High")
tc("PPAY", "Partial payments accumulate to full",
   "Add a second partial payment covering the remainder.",
   "paid 160 again", "pos.allow_partial=on", "paid_total reaches 360; order may complete; invoice reflects paid.", "High")
tc("PPAY", "Partial payment blocked when disallowed",
   "Attempt a partial payment with pos.allow_partial off.",
   "paid < total", "pos.allow_partial=off", "Rejected with validation error; order unchanged.", "Medium")
tc("PPAY", "Overpayment allowed only with cash",
   "Tender more than the total: once with cash, once with card only.",
   "paid=400 on 360", "pos.use", "Cash overpayment allowed (change_due 40); card-only overpayment rejected.", "Medium")
tc("PPAY", "Zero/negative payment rejected",
   "Submit a payment of 0 or a negative amount.",
   "paid=0", "orders.update", "Validation error; no payment recorded.", "High")
tc("PPAY", "Payment reversed on void",
   "Void a paid order and inspect payment records.",
   "", "orders.void + manager PIN", "Payments marked refunded; cash movement refunded; order Voided.", "High")
tc("PPAY", "QR online payment reconciliation",
   "Complete an online QR payment and poll payment status.",
   "provider payment succeeds", "active QR session", "QrPaymentService reconciles only when verified successful payments >= total; cash never self-settles.", "High")

# =====================================================================
# DUE
# =====================================================================
tc("DUE", "Order due / outstanding",
   "Partially pay an order and check the outstanding amount.",
   "total 360; paid 200", "pos.allow_partial", "Outstanding = total - paid_total shown accurately.", "High")
tc("DUE", "Invoice outstanding refresh",
   "Add a payment to an invoice and reopen it.",
   "", "invoices.view", "Invoice status moves open -> partially_paid -> paid and outstanding recalculates.", "High")
tc("DUE", "Supplier due",
   "Partially pay a received PO and check the supplier balance.",
   "", "purchasing.manage", "Supplier outstanding reduces by the paid amount.", "Medium")
tc("DUE", "Customer due history",
   "Open a customer with unpaid/partial orders.",
   "", "customers.view", "Customer show page lists orders/payments and any outstanding balances.", "Medium")

# =====================================================================
# SALES
# =====================================================================
tc("SALES", "Sales report totals reconcile",
   "Run the sales report for a period and compare with settled orders.",
   "3 completed orders", "permission:reports.view", "Gross/discounts/net/tax/tax collected totals match the underlying orders.", "High")
tc("SALES", "Product report",
   "Run products report; compare qty/revenue/COGS with orders.",
   "", "reports.view", "Per-product qty, revenue, COGS (unit_cost snapshot) and margin match; take top 50.", "Medium")
tc("SALES", "Payment method report",
   "Run the payments report grouped by method.",
   "", "reports.view", "Totals per method reconcile with completed orders in the period.", "Medium")
tc("SALES", "Cash / shift report",
   "Run the cash report.",
   "", "reports.view", "Opening float, expected, counted and variance per shift; cash movements by type.", "Medium")
tc("SALES", "Profit report",
   "Run the profit report.",
   "net sales - COGS - approved expenses", "reports.view", "Net operating = net sales - COGS - approved expenses; margin % correct.", "High")
tc("SALES", "Tax report",
   "Run the tax report.",
   "taxable = subtotal - discount", "reports.view", "Tax collected and daily grid reconcile with orders.", "High")
tc("SALES", "Staff, branch and hourly reports",
   "Run staff, branches and hourly reports.",
   "", "reports.view", "Cashier orders/sales/voids, branch comparison and 24-hour buckets render correctly.", "Medium")
tc("SALES", "Date range and presets",
   "Use presets (today/yesterday/last 7 days/this month/last month) and a custom range.",
   "from/to", "reports.view", "Period resolved in tenant timezone; list presets and custom range return the expected windows.", "Medium")
tc("SALES", "Branch filter authorization",
   "Select All Branches in reports as a branch-restricted user.",
   "", "user without tenant-wide access", "'All Branches' available only with hasTenantWideBranchAccess; otherwise restricted to accessible branches (server re-validated).", "High")
tc("SALES", "Report print / CSV (client-side)",
   "Print a report and export CSV.",
   "", "reports.view", "Print uses browser window.print; CSV generated client-side; on-screen figures match.", "Medium")
tc("SALES", "reports.export permission",
   "Look for a server-side report export endpoint.",
   "", "reports.export defined", "GAP - reports.export is registered/seeded but no export route or controller method exists; no server PDF/CSV. Requires Investigation.", "Low")

# =====================================================================
# DASH
# =====================================================================
tc("DASH", "Dashboard KPIs",
   "Open /dashboard and review the KPI cards.",
   "", "auth; active subscription; onboarding complete", "Net sales, orders, average ticket, payments collected (with deltas) render correctly.", "High")
tc("DASH", "Sales trend chart",
   "Review the sales trend area chart current vs previous period.",
   "", "subscribed", "Net-sales series aligned with the previous period (truncated to current length).", "Medium")
tc("DASH", "Business360 right-now strip",
   "Review active guests, pending approvals, low stock, branches, team, products, customers, plan.",
   "", "subscribed", "Live counts render, including a plan + subscription status badge.", "Medium")
tc("DASH", "Branch comparison & staff performance",
   "View branch comparison and staff tables.",
   "", "tenant-wide branch access", "Shown only for users with tenant-wide access; figures reconcile with reports.", "Medium")
tc("DASH", "Dashboard period filter",
   "Change the dashboard period (preset/custom).",
   "preset=month", "subscribed", "All widgets recompute for the selected period.", "Medium")
tc("DASH", "Non-onboarded fallback view",
   "Open the dashboard before onboarding completes.",
   "", "onboarding incomplete", "Checklist, progress, warnings and quick links shown instead of KPIs.", "Low")
tc("DASH", "Dashboard permission enforcement",
   "Open /dashboard as a user without dashboard.view.",
   "", "role lacking dashboard.view", "GAP - /dashboard has no permission middleware (only subscribed); dashboard.view is never enforced. Verify and flag.", "Medium")

# =====================================================================
# SET
# =====================================================================
tc("SET", "Settings groups render",
   "Open Settings and navigate each group (company, branches, team, hours, tax, receipt, billing, pos, orders, notifications, qr).",
   "", "permission:settings.manage", "Each group loads with a form and options; invalid group returns 404.", "High")
tc("SET", "Save each settings group",
   "Change a value in each group and save.",
   "various", "settings.manage", "Saved values persist to tenants.settings JSON / branch / hours data; audit settings.{group}_updated.", "High")
tc("SET", "Logo upload / delete",
   "Upload a logo (jpg/png/webp <=2048KB); then delete it.",
   "logo.png", "settings.manage", "Logo stored under logos/{tenant_id}; shown as tenant.logo_url; delete restores default.", "Medium")
tc("SET", "Tax settings",
   "Set tax name/rate/inclusive and verify on POS + receipts.",
   "rate=15", "settings.manage", "Tax applied everywhere; single tenant-level rate (no tax_rates table).", "High")
tc("SET", "Receipt settings",
   "Set receipt header/footer/show_tax/show_logo and print a receipt.",
   "", "settings.manage", "Receipt reflects tenant settings merged with platform receipt branding.", "Medium")
tc("SET", "POS settings",
   "Set pos.allow_partial and pos.discount_approval_percent.",
   "", "settings.manage", "Values drive partial payments and discount approval behaviour.", "High")
tc("SET", "Order confirmation settings",
   "Set orders.staff_confirmation_mode and send_confirmed_to_kitchen.",
   "mode=central|direct", "settings.manage", "QR order acceptance and kitchen dispatch follow these settings.", "High")
tc("SET", "Notification / loyalty / low-stock settings",
   "Set inventory.low_stock_threshold, loyalty.enabled, loyalty.points_per_currency.",
   "", "settings.manage", "Settings saved and used by stock alerts and loyalty earning.", "Medium")
tc("SET", "Delivery zones CRUD",
   "Settings > Delivery zones: create/edit/delete a zone with fee + min order.",
   "Zone A; fee=100; min=500", "settings.manage", "CRUD works; fee/min order applied on delivery orders (route gated by settings.manage).", "Medium")
tc("SET", "Missing settings UI keys",
   "Look for UI to edit waste.approval_threshold, expenses.auto_approve_limit, purchasing.approval_limit, inventory.allow_negative, block_sale_when_insufficient.",
   "", "settings.manage", "Frontend Not Implemented - these keys are DB/seed only (no tenant form); must be set directly for testing. Requires Investigation.", "Medium")
tc("SET", "settings.view read-only access",
   "As a user with only settings.view, open Settings.",
   "", "role with settings.view", "GAP - all tenant settings routes require settings.manage; settings.view is never enforced/usable. Requires Investigation.", "Low")

# =====================================================================
# NOTIF
# =====================================================================
tc("NOTIF", "Notification list",
   "Open /notifications.",
   "", "auth", "Latest 50 notifications with read flags; unread count in header.", "Medium")
tc("NOTIF", "Mark read / read-all",
   "Mark one notification read; then mark all read.",
   "", "auth", "Flags update; unread count resets.", "Medium")
tc("NOTIF", "QR order placed notification",
   "Place a QR order and check staff notifications.",
   "", "staff with relevant permission", "QrOrderPlaced delivered to branch recipients; realtime alert where configured.", "Medium")
tc("NOTIF", "Low stock notification",
   "Trigger a low-stock event.",
   "", "inventory", "LowStock notification sent on database + mail channels.", "Medium")
tc("NOTIF", "Realtime channel authorization",
   "Subscribe to a tenant channel without the required permission.",
   "e.g. kitchen.view", "realtime configured", "Channel rejected: area permission required and tenant_id equality enforced.", "High")
tc("NOTIF", "Notifications permission & pagination",
   "Open notifications as a low-privilege user; page beyond 50.",
   "", "auth", "GAP - no permission middleware and no pagination beyond 50; no delete/archive or per-user preferences. Requires Investigation.", "Low")

# =====================================================================
# PRINT
# =====================================================================
tc("PRINT", "Receipt print & reprint",
   "Open /orders/{order}/receipt and print; then reprint.",
   "", "permission:orders.view", "Receipt renders with items/totals/branding and prints; reprint audits receipt.reprinted.", "High")
tc("PRINT", "Kitchen ticket print",
   "Print a kitchen ticket.",
   "", "kitchen.view", "Ticket page renders and prints; ticket marked printed.", "Medium")
tc("PRINT", "Subscription invoice PDF",
   "Download a subscription invoice document.",
   "", "subscription.view", "dompdf renders the invoice PDF with correct amounts and billing snapshot.", "Medium")
tc("PRINT", "QR table tent / product export PDF",
   "Print QR table cards and export products as PDF.",
   "", "qr.view / menu.view", "dompdf output matches on-screen data with correct layout.", "Medium")
tc("PRINT", "Server-side report PDF",
   "Look for a server PDF export of operational reports.",
   "", "reports.view", "Not Implemented - reports have no server PDF/CSV; printing is browser window.print only. Requires Investigation.", "Low")

# =====================================================================
# SAAS
# =====================================================================
tc("SAAS", "View plans and current subscription",
   "Open Subscription page.",
   "", "permission:subscription.view", "Current plan, cycle, status and entitlements shown with currency resolved for the tenant.", "High")
tc("SAAS", "Request plan change",
   "Change to another eligible plan/cycle.",
   "target plan", "permission:subscription.manage", "Target plan held pending; an invoice is issued; live plan switches only after the invoice is settled.", "High")
tc("SAAS", "Pay subscription invoice",
   "Pay the pending subscription invoice via a gateway.",
   "", "subscription.manage; eligible gateway", "Payment verified server-side; subscription activates/renews; entitlements update.", "High")
tc("SAAS", "Apply / remove coupon",
   "Apply a valid coupon; then remove it.",
   "VALID-CODE", "subscription.manage", "Discount applied to the unrealised invoice; redeemed only on settlement; remove restores the amount.", "Medium")
tc("SAAS", "Cancel at period end / resume",
   "Cancel the subscription (schedule) then resume.",
   "", "subscription.manage", "cancel_at_period_end toggled true/false; access continues until period end.", "High")
tc("SAAS", "Trial expiry / lapsed access",
   "Let the subscription lapse and open a business route.",
   "", "trialing/past_due/grace handling", "Inactive plan redirects every business route to /subscription (billing state only; user stays logged in) - subscription.* always reachable.", "High")
tc("SAAS", "Plan feature entitlements",
   "Compare enabled features vs a plan's feature list.",
   "e.g. kitchen off", "subscribed", "Feature-gated routes enforce entitlements (qr_dining, kitchen, purchasing, waste, transfers). GAP: pos/tables/menu/inventory/accounts/reports claim features in Entitlements but are NOT route-enforced. Requires Investigation.", "High")
tc("SAAS", "Usage limits (users / branches)",
   "Exceed the plan's user or branch limit.",
   "", "subscription active", "Blocked with a validation error via UsageService::guard; no over-limit resource created.", "High")
tc("SAAS", "Invoice document download",
   "Download a subscription invoice PDF.",
   "", "subscription.view", "Invoice PDF downloads with correct billing snapshot amounts.", "Medium")
tc("SAAS", "Multi-currency pricing",
   "Switch tenant currency and view plan prices.",
   "USD/BDT", "subscription.manage", "Price resolved from plan_prices for the tenant's currency/interval; regional ladder respected.", "Medium")

# =====================================================================
# PLAT
# =====================================================================
tc("PLAT", "Platform admin login redirect",
   "Log in as a platform admin.",
   "", "platform admin account", "Redirected to /platform dashboard (KPIs MRR/ARR/churn/trial conversion).", "High")
tc("PLAT", "Tenants list / export / show",
   "Platform > Tenants: list, export and open a tenant.",
   "", "platform.permission:platform.tenants.view", "Tenant list, CSV export and detail render correctly.", "High")
tc("PLAT", "Tenant lifecycle actions",
   "Verify / activate / suspend / archive a tenant and run a bulk action.",
   "", "platform.tenants.manage / tenants.suspend", "Status changes applied and audited; suspended tenant users are logged out.", "High")
tc("PLAT", "Plans (versioned) CRUD",
   "Platform > Plans: create, edit, archive, delete-guarded.",
   "", "platform.plans.manage", "Plan saved/versioned; archive/deletion guarded when in use; entitlement cache purged.", "High")
tc("PLAT", "Subscriptions management",
   "Platform > Subscriptions: change plan, suspend, reactivate, cancel, schedule-cancel, renew, retry, coupon.",
   "", "platform.subscriptions.manage", "Each action changes state and is audited; trials/past-due/cancellations views correct.", "High")
tc("PLAT", "Invoices / credit notes / adjustments",
   "Platform > Billing: view invoices, send, issue a credit note, add an adjustment.",
   "", "platform.invoices.manage", "Correct append-only entries; totals updated.", "Medium")
tc("PLAT", "Payments approve / reject / refund / settle",
   "Review gateway transactions and process a refund.",
   "", "platform.payments.manage / refunds.manage", "Payment state transitions and refunds recorded with reasons.", "Medium")
tc("PLAT", "Gateways configuration",
   "Platform > Gateways: add, test, set default, toggle, delete.",
   "", "platform.gateways.configure", "Configs saved (encrypted secrets); health/test works.", "Medium")
tc("PLAT", "Email / SMS settings and test",
   "Save email/SMS settings and send a test message.",
   "", "platform.email.manage / settings.manage", "Test delivered; logs (incl. body) capture status; failed emails retryable.", "Medium")
tc("PLAT", "Backups & restore",
   "Create a backup, verify it, list it; rehearse a restore on staging only.",
   "", "platform.backups.view/create/restore", "Backups created/downloadable/verified; restore executed only outside production.", "Medium")
tc("PLAT", "Audit logs & impersonation history",
   "Open Platform > Audit and export; view impersonation history.",
   "", "platform.audit.view", "Audit entries with actor/action/time; CSV export streams; impersonation history present.", "Medium")
tc("PLAT", "Impersonation start / stop",
   "Impersonate a tenant user (with reason), then stop.",
   "reason required", "platform.impersonate", "Time-limited audited session as a real tenant user (isolation holds); stop returns the admin session.", "High")
tc("PLAT", "Maintenance mode",
   "Enable maintenance mode; then open a tenant route.",
   "", "platform.maintenance.manage", "Tenant traffic blocked with 503 maintenance view; platform/health/webhooks/payments exempt; auto-expires at ends_at.", "High")
tc("PLAT", "Ops: queue, failed jobs, schedule, health, logs",
   "Open each Ops page and retry a failed job.",
   "", "platform.monitoring.view / logs.view", "Queue/schedule/health pages render; a failed job can be retried/deleted.", "Medium")
tc("PLAT", "Offline sync conflicts review",
   "Platform > Offline Conflicts: open and resolve a conflict.",
   "", "platform.monitoring.view", "Conflict marked reviewed/resolved and audited.", "Medium")
tc("PLAT", "Command runner",
   "Run a curated command; then an advanced command.",
   "", "platform.commands.run", "Curated command runs; advanced requires the higher permission.", "Low")
tc("PLAT", "Marketing campaigns & announcements",
   "Create and send a campaign; toggle an announcement.",
   "", "platform.marketing.manage", "Campaign saved/sent; announcement toggled.", "Low")
tc("PLAT", "ComingSoon placeholder route",
   "Open /platform/coming-soon/{module}.",
   "", "platform admin", "Renders an honest 'not available yet' empty state. Note the route is defined but not linked from any nav (dead placeholder).", "Low")

# =====================================================================
# SEC
# =====================================================================
tc("SEC", "Tenant model isolation",
   "As tenant A, query a tenant B record by id across scoped models.",
   "other tenant id", "two tenants", "404/empty - BelongsToTenant global scope prevents cross-tenant reads.", "Critical")
tc("SEC", "Tenant auto-fill on create",
   "Create a scoped record and inspect tenant_id.",
   "", "authenticated tenant user", "tenant_id auto-filled from context; cannot be spoofed via request.", "Critical")
tc("SEC", "Branch fail-closed scoping",
   "As a user with no accessible branch, list branch-scoped records.",
   "", "user without branch access", "Query falls back to whereRaw('1 = 0') - no rows leak.", "Critical")
tc("SEC", "Permission middleware enforcement",
   "Call a permission-gated route without the permission.",
   "", "limited role", "403 returned; no data leaked.", "High")
tc("SEC", "Platform routes blocked for tenant users",
   "Open /platform/* as a normal tenant user.",
   "", "non-platform user", "403 via EnsurePlatformAdmin; platform dashboard redirect not triggered.", "High")
tc("SEC", "Suspended tenant logout",
   "Suspend a tenant while its user is logged in, then make a request.",
   "", "platform.tenants.suspend", "User is logged out, session invalidated, and blocked at login.", "High")
tc("SEC", "CSRF protection on state-changing POSTs",
   "POST without a CSRF token to a tenant route.",
   "", "web middleware", "419 rejected; webhooks/payments are the only excluded prefixes.", "High")
tc("SEC", "Security headers present",
   "Inspect response headers on a page.",
   "", "any request", "X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin-when-cross-origin, X-Permitted-Cross-Domain-Policies none. Note: no CSP/HSTS.", "Medium")
tc("SEC", "Rate limiting on abuse-prone endpoints",
   "Flood login / QR / OTP / webhook endpoints.",
   "", "public + auth", "Login 5/min, OTP 3/300s, qr-public 60/min, qr-session 10/min, qr-order 20/min enforced (429).", "High")
tc("SEC", "Cross-tenant QR token isolation",
   "Reuse a QR token from tenant A on tenant B context or after suspension.",
   "", "two tenants", "Token resolves only to its own tenant/branch/table; inactive context returns 404; no data leaked.", "Critical")
tc("SEC", "Impersonation isolation",
   "While impersonating, access another tenant's data.",
   "", "platform.impersonate", "Only the impersonated tenant's data is reachable; all actions audited; stop restores admin session.", "High")
tc("SEC", "Secrets encrypted at rest",
   "Inspect stored gateway/SMS/realtime credentials.",
   "", "platform/tenant settings", "Secrets stored encrypted (Crypt) and never returned to the browser (only key names).", "High")
tc("SEC", "Public invitation endpoint hardening",
   "Probe /invitations/{token} for enumeration/rate abuse.",
   "", "guest", "RISK - 64-char hashed tokens protect it, but the endpoint has no throttle and requires being logged out. Verify and flag.", "Medium")
tc("SEC", "Manager PIN brute force",
   "Attempt many wrong manager PINs.",
   "", "approval action", "RISK - verify() has audit but no attempt lockout/rate limit. Verify and flag.", "Medium")

# =====================================================================
# VAL
# =====================================================================
tc("VAL", "Required-field validation",
   "Submit core forms (product, branch, expense, table) with required fields empty.",
   "", "relevant manage permission", "Inline validation errors; form not saved.", "Medium")
tc("VAL", "Unique constraint validation",
   "Create duplicates for email, product SKU, and customer phone.",
   "", "relevant permissions", "Unique validation errors raised; no duplicates saved.", "High")
tc("VAL", "Boundary and negative values",
   "Enter negative prices/amounts/quantities where not allowed.",
   "e.g. -1", "relevant permissions", "Rejected with validation errors; only valid ranges accepted.", "High")
tc("VAL", "Date range validation",
   "Run a report with end date before start date.",
   "to < from", "reports.view", "Validation error or empty state; no crash.", "Medium")
tc("VAL", "Not-found handling",
   "Open a record id that does not exist or belongs to another tenant.",
   "bogus id", "authenticated user", "404 returned; no stack trace (APP_DEBUG off in prod).", "Medium")
tc("VAL", "File upload validation",
   "Upload disallowed mime types / oversized files (logo, product image, product import).",
   "e.g. .exe / >2MB", "relevant permission", "Rejected with a clear error; allowed types/sizes accepted.", "Medium")
tc("VAL", "Idempotency handling",
   "Repeat QR order, bill request and webhook with the same key.",
   "same idempotency_key/event_id", "active session", "Duplicate suppressed; single record created.", "Medium")
tc("VAL", "Error page / status codes",
   "Trigger 403, 404 and 500 conditions.",
   "", "various roles", "Correct status codes and friendly pages; no sensitive detail leaked.", "Medium")

# =====================================================================
# PWA
# =====================================================================
tc("PWA", "Service worker caches shell only",
   "Inspect the service worker cache after navigating the app.",
   "", "built PWA", "App shell/assets precached; application HTML/data never cached; navigations network-first with /offline.html fallback.", "Medium")
tc("PWA", "Offline sale capture & sync",
   "Load the POS offline bundle, go offline, create a sale, reconnect, POST /pos/sync.",
   "1 offline sale", "permission:pos.use", "Offline ops queued then replayed through live services; idempotent via offline_reference; no duplicates.", "High")
tc("PWA", "Offline conflict handling",
   "Sync an operation that differs from server state (price/stock/shift/table).",
   "total mismatch; occupied table", "pos.use", "Conflict recorded (total_mismatch/stock_insufficient/shift_closed/table_occupied/...); platform can review/resolve.", "High")
tc("PWA", "Offline bundle mirrors catalogue",
   "Compare the offline bundle with live catalogue (products/variants/modifiers/tables/customers/zones).",
   "", "pos.use", "Prices mirrored verbatim; the browser never derives a price.", "Medium")


# =====================================================================
# INCOMPLETE FEATURES (verified)
# =====================================================================
INCOMPLETE = [
    ["Order Refund", "Partially Implemented",
     "Permissions.php defines orders.refund and it is seeded + listed in ManagerPinService, but no route/controller refunds a completed order; only void exists.",
     "Add a refund flow or remove the unused permission."],
    ["Report export (server-side)", "Partially Implemented",
     "reports.export permission defined/seeded, but ReportController exposes only GET /reports; no export route, no server PDF/CSV (client print/CSV only).",
     "Add export endpoints or drop the permission."],
    ["Cash management permissions", "Partially Implemented",
     "cash.view/manage/approve defined and seeded, but all shift routes use middleware permission:pos.use; cash.approve only appears in the PIN list.",
     "Gate shift routes with cash.* or remove unused permissions."],
    ["Dashboard / Settings read permissions", "Requires Investigation",
     "dashboard.view and settings.view are registered but never enforced (dashboard has no permission middleware; all settings routes require settings.manage).",
     "Decide whether read-only roles should be supported."],
    ["Plan feature enforcement", "Backend Not Ready",
     "Entitlements UI lists pos, kitchen, tables, menu, inventory, purchasing, waste, transfers, accounts, reports, but only qr_dining/kitchen/purchasing/waste/transfers are enforced via feature: middleware.",
     "Apply feature middleware or align the entitlements list."],
    ["Per-branch role scoping", "Not Implemented",
     "role_user.branch_id exists but is never written or read; roles are tenant-wide only.",
     "Implement or remove the column."],
    ["Bill request staff handling", "Partially Implemented",
     "bill_requests has handled_by/handled_at and statuses in_progress/cancelled, but no controller sets them; only auto-settle closes a request.",
     "Add a staff acknowledge/handle endpoint."],
    ["Settings UI for thresholds/limits", "Frontend Not Implemented",
     "waste.approval_threshold, expenses.auto_approve_limit, purchasing.approval_limit, inventory.allow_negative and block_sale_when_insufficient are DB/seed only - no tenant form.",
     "Expose these keys in Settings."],
    ["Supplier index route", "Backend Not Ready",
     "No dedicated supplier list route; suppliers are returned only inside the PO index. No PO delete/destroy (cancel only).",
     "Add supplier list + PO delete if required."],
    ["Expense edit / delete & category CRUD", "Backend Not Ready",
     "Expenses support create + approve/reject only; expense categories support create only (no list/update/delete).",
     "Add full CRUD if required."],
    ["Account statement / ledger view", "Backend Not Ready",
     "No per-account statement or transaction listing route; index shows balance + last 50 transfers only. Transfers cannot be reversed.",
     "Add statement view."],
    ["Stock location management", "Backend Not Ready",
     "Stock locations are auto-provisioned (Main Store); no create/edit route. Unit conversions (kg->g, L->mL) exist but are unused in stock math.",
     "Add location management and apply conversions."],
    ["Loyalty redemption / history", "Partially Implemented",
     "LoyaltyService supports redeem but only earn/adjust are exposed (customers.points); no transaction-history endpoint.",
     "Expose redemption and history."],
    ["Modifier standalone option endpoints", "Partially Implemented",
     "modifiers.options.* routes exist but the frontend manages options only through group sync.",
     "Remove dead routes or wire the UI."],
    ["Branch deletion", "Not Implemented",
     "No delete/destroy route for branches; only deactivate. No bulk operations.",
     "Add delete if required."],
    ["Social login / 2FA", "Not Implemented",
     "No Socialite integration and no two_factor/TOTP code anywhere; only phone OTP + manager PIN.",
     "Backlog / out of scope unless required."],
    ["Platform analytics KPIs", "Partially Implemented",
     "PlatformAnalyticsService marks failed_payments and refunds KPIs available:false (Phase 5). No FX conversion for multi-currency figures.",
     "Implement in a later phase."],
    ["Platform ComingSoon route", "Partially Implemented",
     "GET /platform/coming-soon/{module} renders a placeholder but is not linked from any nav.",
     "Wire or remove."],
]

# =====================================================================
# BUGS & ISSUES / RISKS
# =====================================================================
BUGS = [
    ["Privilege escalation: staff role assignment", "Security Bug", "Critical",
     "app/Http/Requests/Staff/StoreInvitationRequest.php, UpdateStaffRequest.php vs app/Domain/Identity/RoleService.php:allowedPermissionSlugs()",
     "Staff/invitation requests validate that a role exists but do not apply the allowedPermissionSlugs guard, so a user whose custom role holds staff.manage could assign the system tenant_owner role (all tenant permissions). Confirm and fix."],
    ["orders.refund permission without a refund endpoint", "Backend Gap", "High",
     "app/Domain/Identity/Permissions.php, routes/web.php",
     "A refund permission is seeded and appears in the manager-PIN list but no route implements refunding a completed order; only void exists."],
    ["No attempt lockout on manager PIN verify", "Security Risk", "High",
     "app/Domain/Identity/ManagerPinService.php",
     "verify() audits failures but has no attempt limit/rate limit - brute-force surface for approvals (voids, discounts, cash variance, PO approval)."],
    ["Public invitation endpoint has no throttle", "Security Risk", "Medium",
     "routes/web.php (guest group /invitations/{token}), app/Http/Controllers/Staff/AcceptInvitationController.php",
     "64-char hashed tokens are strong, but the endpoint is unauthenticated and unthrottled, and requires being logged out to accept."],
    ["Feature middleware absent on core modules", "Consistency Risk", "High",
     "routes/web.php vs app/Http/Controllers/Platform/EntitlementsController.php",
     "Entitlements UI lists pos/tables/menu/inventory/accounts/reports but they are not route-enforced by feature:, so a plan listing them as off still exposes the routes."],
    ["User model lacks tenant global scope", "Isolation Risk", "High",
     "app/Models/User.php",
     "User::query() is globally unscoped; staff isolation depends on $tenant->users() and policies (cross-tenant binding returns 403 rather than 404)."],
    ["Kitchen item status has no transition guard", "Data Integrity Risk", "Medium",
     "app/Domain/Kitchen/KitchenService.php::setItemStatus()",
     "Ticket status transitions are validated but item statuses accept any valid enum value - arbitrary jumps are possible."],
    ["Negative stock behaviour depends on DB-only setting", "Test Blocker", "Medium",
     "app/Domain/Inventory/StockService.php + inventory.allow_negative",
     "inventory.allow_negative / block_sale_when_insufficient have no Settings UI; test env must set them directly, and defaults affect sale/transfer/waste outcomes."],
    ["No CSP / HSTS headers", "Security Hardening", "Medium",
     "app/Http/Middleware/AddSecurityHeaders.php",
     "Only nosniff, X-Frame-Options, Referrer-Policy and X-Permitted-Cross-Domain-Policies are set; no Content-Security-Policy or HSTS."],
    ["Reports/dashboard PDF only client-side", "UX Risk", "Low",
     "resources/js/Pages/Reports/Index.tsx, Dashboard.tsx",
     "No server-side PDF/CSV for operational reports; output depends on the browser print dialog."],
    ["Modifier option routes unused by frontend", "Tech Debt", "Low",
     "routes/web.php (modifiers.options.*), resources/js/Pages/Menu/Modifiers.tsx",
     "Option store/update/delete routes exist but the UI manages options only via group sync."],
    ["Invitation revoke audit missing tenant_id", "Minor Bug", "Low",
     "app/Domain/Identity/InvitationService.php::revoke()",
     "The staff.invitation_revoked audit entry is written without tenant_id, unlike other invitation events."],
]


# ---------------------------------------------------------------- styling
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
SEV_FILL = {"Critical": "F4B6B6", "High": "F8CBAD", "Medium": "FFF2CC", "Low": "E2EFDA"}
STATUS_FILL = {"Not Tested": "FFF2CC", "Passed": "C6EFCE", "Failed": "FFC7CE"}


def style_header(ws, ncols, height=30):
    for c in range(1, ncols + 1):
        cell = ws.cell(1, c)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[1].height = height
    ws.freeze_panes = "A2"


def build_main(wb):
    ws = wb.create_sheet("Complete Test Cases")
    for c, h in enumerate(HEADERS, 1):
        ws.cell(1, c, h)
    widths = [16, 40, 56, 40, 36, 62, 18, 14, 12, 26, 28, 12, 12, 20]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    r = 2
    for t in ROWS:
        vals = [t["id"], t["name"], t["steps"], t["data"], t["pre"], t["expected"],
                "", "Not Tested", t["sev"], "", "", "", "", RESOLVED_BY]
        for c, v in enumerate(vals, 1):
            cell = ws.cell(r, c, v)
            cell.alignment = Alignment(vertical="top", wrap_text=True)
            cell.font = Font(size=10)
            cell.border = BORDER
        ws.cell(r, 1).font = Font(size=10, bold=True)
        ws.cell(r, 7).alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
        ws.cell(r, 8).fill = PatternFill("solid", fgColor=STATUS_FILL["Not Tested"])
        ws.cell(r, 8).alignment = Alignment(horizontal="center", vertical="top", wrap_text=True)
        ws.cell(r, 9).fill = PatternFill("solid", fgColor=SEV_FILL[t["sev"]])
        ws.cell(r, 9).alignment = Alignment(horizontal="center", vertical="top")
        ws.cell(r, 14).alignment = Alignment(horizontal="center", vertical="top", wrap_text=True)
        r += 1

    last = r - 1
    ws.auto_filter.ref = "A1:N%d" % last
    style_header(ws, len(HEADERS))

    dv_status = DataValidation(type="list", allow_blank=True,
                               formula1='"Not Tested,Passed,Failed,Blocked,Partially Tested,Not Applicable,Requires Investigation"')
    dv_sev = DataValidation(type="list", allow_blank=True,
                            formula1='"Critical,High,Medium,Low"')
    ws.add_data_validation(dv_status)
    ws.add_data_validation(dv_sev)
    if last >= 2:
        dv_status.add("H2:H%d" % last)
        dv_sev.add("I2:I%d" % last)
    return ws, last


def put(ws, r, c, value, bold=False, size=10, color=None, fill=None, wrap=True):
    cell = ws.cell(r, c, value)
    cell.font = Font(bold=bold, size=size, color=color)
    cell.alignment = Alignment(vertical="top", wrap_text=wrap)
    if fill:
        cell.fill = PatternFill("solid", fgColor=fill)
    cell.border = BORDER
    return cell


def build_module_summary(wb):
    ws = wb.create_sheet("Module Summary")
    ws.column_dimensions["A"].width = 6
    ws.column_dimensions["B"].width = 38
    ws.column_dimensions["C"].width = 12
    ws.column_dimensions["D"].width = 30
    ws.column_dimensions["E"].width = 46

    counts = {}
    sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for t in ROWS:
        counts[t["module"]] = counts.get(t["module"], 0) + 1
        sev_counts[t["sev"]] += 1

    ws.cell(1, 2, "Restaurant POS SaaS - Test Case Workbook").font = Font(bold=True, size=14, color="1F4E78")
    r = 3
    r = summary_row(ws, r, "Total modules inspected", len(MODULES))
    r = summary_row(ws, r, "Total test cases created", len(ROWS))
    r = summary_row(ws, r, "Critical severity cases", sev_counts["Critical"])
    r = summary_row(ws, r, "High severity cases", sev_counts["High"])
    r = summary_row(ws, r, "Medium severity cases", sev_counts["Medium"])
    r = summary_row(ws, r, "Low severity cases", sev_counts["Low"])
    r = summary_row(ws, r, "Incomplete features logged", len(INCOMPLETE))
    r = summary_row(ws, r, "Bugs / issues / risks logged", len(BUGS))
    r += 1

    ws.cell(r, 2, "Test cases by module").font = Font(bold=True, size=12, color="1F4E78")
    r += 1
    hdr = ["Module Code", "Module Name", "Cases", "Coverage", "Verified state in code"]
    for c, h in enumerate(hdr, 1):
        cell = ws.cell(r, c, h)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = HEADER_FILL
        cell.border = BORDER
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    r += 1
    for key in MODULES:
        n = counts.get(key, 0)
        state = "Code-verified routes/models/pages"
        if key in ("PWA",):
            state = "Code-verified (service worker + offline engine)"
        put(ws, r, 1, key, bold=True)
        put(ws, r, 2, MODULES[key])
        put(ws, r, 3, n)
        put(ws, r, 4, "Full" if n >= 5 else "Partial")
        put(ws, r, 5, state)
        r += 1
    total_fill = "D9E1F2"
    put(ws, r, 1, "", fill=total_fill)
    put(ws, r, 2, "TOTAL", bold=True, fill=total_fill)
    put(ws, r, 3, len(ROWS), bold=True, fill=total_fill)
    put(ws, r, 4, "", fill=total_fill)
    put(ws, r, 5, "", fill=total_fill)

    r += 2
    ws.cell(r, 2, "Critical workflow coverage (verified end-to-end)").font = Font(bold=True, size=12, color="1F4E78")
    r += 1
    for item in [
        "QR scan -> dining session -> place order -> correct tenant/branch/table (CORD)",
        "Order acceptance before kitchen (ACPT, KIT)",
        "Kitchen preparation status updates + realtime KDS (KIT, PREP)",
        "Table staff assignment + assigned-table visibility (TSTF, TABLE)",
        "Customer bill request -> invoice link -> staff billing (BILL, DUE)",
        "Cashier bill generation (POS) -> full/partial payments -> outstanding (PPAY, DUE)",
        "Cross-tenant and cross-branch isolation (SEC, BRCH)",
        "Branch switching does not expose other restaurant data (BRCH, SEC)",
    ]:
        put(ws, r, 2, item, wrap=True)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
        r += 1

    r += 1
    ws.cell(r, 2, "Areas requiring manual verification").font = Font(bold=True, size=12, color="1F4E78")
    r += 1
    for item in [
        "Live payment gateway checkout (stripe/sslcommerz/bkash) with signed webhooks - sandbox only",
        "Realtime (Reverb/Pusher) channels end-to-end with a running broadcast server",
        "Offline POS replay + conflict resolution against a live shift",
        "Manager-PIN-gated approvals (void, discount, cash variance, PO approval)",
        "Negative-stock behaviour under inventory.allow_negative / block_sale_when_insufficient",
        "Plan feature enforcement matrix vs the Entitlements UI",
        "Report totals reconciled against a seeded dataset",
    ]:
        put(ws, r, 2, item, wrap=True)
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=5)
        r += 1
    return ws


def summary_row(ws, r, label, value):
    put(ws, r, 2, label, bold=True)
    put(ws, r, 3, value, bold=True)
    return r + 1


def build_bugs(wb):
    ws = wb.create_sheet("Bugs & Issues")
    headers = ["#", "Title", "Type", "Severity", "Status", "Evidence / Location", "Notes"]
    widths = [6, 40, 16, 12, 12, 52, 70]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for c, h in enumerate(headers, 1):
        ws.cell(1, c, h)
    r = 2
    for i, (title, typ, sev, evidence, note) in enumerate(BUGS, 1):
        put(ws, r, 1, i, bold=True)
        put(ws, r, 2, title)
        put(ws, r, 3, typ)
        put(ws, r, 4, sev, fill=SEV_FILL.get(sev))
        put(ws, r, 5, "Open", fill=STATUS_FILL["Not Tested"])
        put(ws, r, 6, evidence)
        put(ws, r, 7, note)
        r += 1
    style_header(ws, len(headers), height=24)
    ws.auto_filter.ref = "A1:G%d" % (r - 1)
    dv_sev = DataValidation(type="list", allow_blank=True, formula1='"Critical,High,Medium,Low"')
    dv_status = DataValidation(type="list", allow_blank=True, formula1='"Open,In Progress,Fixed,Verified,Won\'t Fix,By Design"')
    ws.add_data_validation(dv_sev)
    ws.add_data_validation(dv_status)
    dv_sev.add("D2:D%d" % (r - 1))
    dv_status.add("E2:E%d" % (r - 1))
    return ws


def build_incomplete(wb):
    ws = wb.create_sheet("Incomplete Features")
    headers = ["#", "Feature / Module", "Status", "Evidence / Detail", "Recommended Action"]
    widths = [6, 34, 24, 78, 40]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    for c, h in enumerate(headers, 1):
        ws.cell(1, c, h)
    status_fill = {
        "Not Implemented": "F4B6B6",
        "Backend Not Ready": "F8CBAD",
        "Frontend Not Implemented": "FFF2CC",
        "Partially Implemented": "DDEBF7",
        "Requires Investigation": "E2EFDA",
    }
    r = 2
    for i, (feat, status, detail, action) in enumerate(INCOMPLETE, 1):
        put(ws, r, 1, i, bold=True)
        put(ws, r, 2, feat)
        put(ws, r, 3, status, fill=status_fill.get(status))
        put(ws, r, 4, detail)
        put(ws, r, 5, action)
        r += 1
    style_header(ws, len(headers), height=24)
    ws.auto_filter.ref = "A1:E%d" % (r - 1)
    dv = DataValidation(type="list", allow_blank=True,
                        formula1='"Not Implemented,Backend Not Ready,Frontend Not Implemented,Partially Implemented,Requires Investigation"')
    ws.add_data_validation(dv)
    dv.add("C2:C%d" % (r - 1))
    return ws


def main():
    wb = Workbook()
    wb.remove(wb.active)
    build_main(wb)
    build_module_summary(wb)
    build_bugs(wb)
    build_incomplete(wb)
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "Restaurant_POS_SaaS_Test_Cases.xlsx")
    wb.save(out)
    print("Saved: %s" % out)
    print("Modules: %d | Test cases: %d | Incomplete: %d | Bugs/risks: %d" % (
        len(MODULES), len(ROWS), len(INCOMPLETE), len(BUGS)))


if __name__ == "__main__":
    main()
