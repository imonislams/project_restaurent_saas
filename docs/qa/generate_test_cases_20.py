"""
Restaurant POS SaaS - FOCUSED 20 Test Case Spreadsheet
READ-ONLY: does not modify source/database/data.
Runs statuses are filled from an automated PHPUnit subset run (storage/app/phpunit_critical.txt).

Columns (exact 14): Test Case ID | Test Case Name | Steps | Test Data | Pre Condition |
Expected Result | Actual Result | Test Case Status | Severity Level | Comments From Tester |
Remark From Developers | Tested in | Resolved in | Resolved by
"""
import os
import re
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "Restaurant_POS_SaaS_Test_Cases.xlsx")
JUNIT = os.path.abspath(os.path.join(HERE, "..", "..", "storage", "app", "junit.xml"))

TESTED_IN = "Imon Islam"
RESOLVED_BY = "Md Imon Islam"

HEADERS = ["Test Case ID", "Test Case Name", "Steps", "Test Data", "Pre Condition",
           "Expected Result", "Actual Result", "Test Case Status", "Severity Level",
           "Comments From Tester", "Remark From Developers", "Tested in",
           "Resolved in", "Resolved by"]

F = "Tests\\Feature\\"

# id, name, steps, data, pre, expected, severity, [phpunit classes]
CASES = [
    ("TC-AUTH-001", "Authentication - registration & trial", "Critical",
     "Open /register > register owner with email (and phone) > submit.",
     "owner@green.test / +8801700000000; Pass=Secret#123",
     "Guest; register route public",
     "Tenant + owner created in one transaction, owner gets TenantOwner role, 14-day trial started, verification required.",
     [F + "Auth\\RegistrationTest", F + "Auth\\MobileRegistrationTest"]),

    ("TC-AUTH-002", "Authentication - login, throttling & logout", "Critical",
     "Log in with valid and invalid credentials; attempt 6 rapid failed logins; then log out.",
     "valid creds; wrong creds x6",
     "Registered & verified user",
     "Valid login -> dashboard; wrong password rejected without session; 5/min throttle locks out; logout destroys the session.",
     [F + "Auth\\AuthenticationTest", F + "Auth\\PasswordUpdateTest"]),

    ("TC-AUTH-003", "Authentication - email verification", "High",
     "Open the signed verification link from the email.",
     "signed verify URL",
     "Unverified user",
     "Email marked verified; gated routes accessible; link throttled.",
     [F + "Auth\\EmailVerificationTest"]),

    ("TC-AUTH-004", "Authentication - phone OTP verification", "High",
     "Request a phone OTP and submit the correct 6-digit code (and a wrong one).",
     "valid + invalid OTP",
     "User registered with phone",
     "phone_verified_at set on correct code; wrong code rejected; attempts/cooldown enforced.",
     [F + "Auth\\PhoneVerificationTest", F + "Auth\\MobileRegistrationTest"]),

    ("TC-STAFF-002", "Staff invitation & acceptance", "High",
     "Staff > Add > send invitation > open emailed link > set password > submit.",
     "rahim@green.test; role=Cashier",
     "permission:staff.manage",
     "Invitation created with hashed token; accepted invitation creates the user, syncs roles/branches and logs them in.",
     [F + "Staff\\StaffManagementTest", F + "Staff\\InvitationPasswordTest"]),

    ("TC-ROLE-006", "Roles - custom role & privilege-escalation guard", "Critical",
     "Create a custom role granting only permissions you hold; then try to grant one you do not hold.",
     "grant=settings.manage (not held)",
     "permission:roles.manage",
     "Role created with selected permissions; granting a permission you do not hold is rejected (422).",
     [F + "Identity\\RolePermissionTest", F + "Identity\\CustomRoleManagementTest"]),

    ("TC-BRCH-001", "Branch management (create/update/primary rules)", "High",
     "Branches > create, edit, deactivate; try deactivating the primary; set a new primary.",
     "Branch=Outlet 2",
     "permission:branches.manage",
     "First branch is primary; update persists; primary deactivation blocked; set-primary clears others in one transaction.",
     [F + "Tenant\\BranchTest"]),

    ("TC-BRCH-008", "Branch switching & branch isolation", "Critical",
     "Switch branch via the switcher; attempt an inaccessible/foreign branch; reload list pages.",
     "accessible + inaccessible branch ids",
     "user with access to more than one branch",
     "Active branch persists in session; inaccessible/foreign branch -> 403; scoped data follows the active branch.",
     [F + "Branches\\ActiveBranchContextTest"]),

    ("TC-SEC-001", "Security - tenant data isolation", "Critical",
     "As tenant A, attempt to read tenant B records by id; create a scoped record.",
     "foreign tenant id",
     "two tenants seeded",
     "Cross-tenant reads blocked (scoped query/404); tenant_id auto-filled and not spoofable.",
     [F + "Tenancy\\TenantIsolationTest"]),

    ("TC-TABLE-005", "Table management - CRUD, status & transfer", "High",
     "Create/edit a table; set status; transfer an open order to another table; try deleting a table with open orders.",
     "T-12 -> T-14",
     "permission:tables.manage",
     "CRUD works; transfer reassigns the order and frees the source table; delete blocked when open orders exist.",
     [F + "Tables\\TableManagementTest"]),

    ("TC-TSTF-001", "Table staff management - assignment & visibility", "High",
     "Assign eligible staff to a table; verify ineligible staff are excluded; check the order staff snapshot.",
     "staff=Rahim",
     "assignment permission",
     "Eligible staff assigned (fail-closed); order_staff snapshot frozen; historical orders unchanged.",
     [F + "Tables\\TableStaffAssignmentTest"]),

    ("TC-PROD-001", "Product & menu management", "High",
     "Menu > create category and product; edit price; upload image; import/export; verify validation.",
     "Cafe Latte; Price=180",
     "permission:menu.manage",
     "Category/product saved and shown in POS; price edit applies to new orders only; validation blocks bad input.",
     [F + "Menu\\MenuManagementTest"]),

    ("TC-QR-002", "QR code ordering - entry & dining session", "High",
     "Scan /qr/{token}: load entry, start session, verify invalid/revoked token and rate limiting.",
     "valid, invalid and revoked tokens",
     "feature:qr_dining; active tenant/branch/table",
     "Valid token starts a session (HttpOnly cookie) and loads the menu; invalid/revoked token -> 410; inactive context -> 404.",
     [F + "Qr\\QrDiningFlowTest"]),

    ("TC-CORD-003", "Customer ordering - QR order placement", "Critical",
     "In an active session add items + modifiers and submit the order (twice with same idempotency key).",
     "1 item + modifier; idempotency_key",
     "active dining session",
     "Order created as held for the correct tenant/branch/table; duplicate submission ignored; tracking shows progress.",
     [F + "Qr\\QrDiningFlowTest"]),

    ("TC-ACPT-003", "Order acceptance before kitchen", "Critical",
     "With staff confirmation required, accept a pending QR order; then reject another.",
     "pending QR orders",
     "permission:orders.approve",
     "Accept -> accepted + kitchen ticket + staff recorded; reject -> order voided and stock reversed; accept is idempotent.",
     [F + "Qr\\QrOrderAcceptanceTest"]),

    ("TC-KIT-003", "Kitchen display - preparation status flow", "High",
     "Move a ticket new->accepted->preparing->ready->handed_over->served; try an invalid jump.",
     "1 ticket with 2 items",
     "feature:kitchen; permission:kitchen.manage",
     "Valid transitions applied with timestamps and order sync; invalid transitions rejected.",
     [F + "Kitchen\\KitchenDisplayTest"]),

    ("TC-POS-003", "POS billing - sale, shift & settlement", "Critical",
     "Open a shift; add items and take payment to complete a sale; close the shift with counted cash.",
     "cart 2 x 180 = 360; counted=5,360",
     "permission:pos.use + orders.update; open shift",
     "Order completed with server-calculated totals; duplicate shift blocked; close shows expected/over/short.",
     [F + "POS\\PosSaleTest", F + "POS\\ShiftTest", F + "POS\\SaleCalculatorTest"]),

    ("TC-POS-006", "POS - void order with manager PIN", "Critical",
     "Void a completed/open order supplying a manager PIN.",
     "reason; manager PIN",
     "permission:orders.void",
     "Stock reversed, cash refunded, payments refunded, kitchen ticket cancelled, status Voided; PIN action audited.",
     [F + "POS\\VoidOrderTest"]),

    ("TC-BILL-001", "Bill request -> invoice -> partial payment/outstanding", "High",
     "From the QR session request the bill; open the linked invoice (staff); take a partial payment and check outstanding.",
     "allow_bill_request on; partial payment",
     "active session; staff invoices.view",
     "Bill request created and invoice linked; partial payment updates status to partially_paid and outstanding correctly.",
     [F + "Qr\\QrBillingTest", F + "Billing\\OrderInvoiceTest"]),

    ("TC-SALES-001", "Sales reports & dashboard", "High",
     "Run the sales report for a period and open the dashboard; compare totals with settled orders.",
     "period = this month",
     "permission:reports.view; active subscription",
     "Report and dashboard totals reconcile with the underlying completed orders (gross/discounts/net/tax).",
     [F + "Reporting\\ReportTest", F + "Dashboard\\OverviewDashboardTest"]),
]

STATUS_OPTIONS = "Not Tested,Passed,Failed,Blocked,Partially Tested,Not Applicable,Requires Investigation"
SEV_FILL = {"Critical": "F4B6B6", "High": "F8CBAD", "Medium": "FFF2CC", "Low": "E2EFDA"}
STATUS_FILL = {"Passed": "C6EFCE", "Failed": "FFC7CE", "Not Tested": "FFF2CC",
               "Blocked": "FCE4D6", "Requires Investigation": "DDEBF7"}
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
HEADER_FILL = PatternFill("solid", fgColor="1F4E78")


def parse_results():
    """Parse the JUnit XML produced by the subset run.

    Returns (dict fqcn -> {failed, tests, errors, failures, env, msg}, summary).
    """
    import xml.etree.ElementTree as ET

    results = {}
    summary = "Automated run log not found - statuses left Not Tested."
    if not os.path.exists(JUNIT):
        return results, summary

    root = ET.parse(JUNIT).getroot()
    overall = root.find("testsuite")
    if overall is not None:
        summary = "PHPUnit subset: %s tests, %s assertions, %s errors, %s failures." % (
            overall.get("tests"), overall.get("assertions"),
            overall.get("errors"), overall.get("failures"))

    for suite in root.iter("testsuite"):
        fqcn = suite.get("name", "")
        if not fqcn.startswith("Tests\\") or not suite.get("file"):
            continue
        errors = int(suite.get("errors", "0"))
        failures = int(suite.get("failures", "0"))
        msg = ""
        env = False
        for bad in list(suite.iter("error")) + list(suite.iter("failure")):
            full = "%s\n%s" % (bad.get("message") or "", bad.text or "")
            for line in full.splitlines():
                if "Exception:" in line:
                    msg = line.strip()
                    break
            if not msg:
                msg = (full.strip().splitlines() or [""])[0].strip()
            if "GD extension" in full or "package missing" in full:
                env = True
            break
        results[fqcn] = {
            "failed": (errors + failures) > 0,
            "tests": int(suite.get("tests", "0")),
            "errors": errors, "failures": failures,
            "env": env, "msg": msg,
        }
    return results, summary


def evaluate(classes, results):
    present = [c for c in classes if c in results]
    missing = [c for c in classes if c not in results]
    failed = [c for c in present if results[c]["failed"]]
    if not present:
        return "Not Tested", "No automated coverage executed for this case in the subset run."
    if failed:
        if all(results[c]["env"] for c in failed):
            names = ", ".join(c.split("\\")[-1] for c in failed)
            why = results[failed[0]]["msg"]
            return ("Blocked",
                    "Environment blocked (%s): %s. Not a confirmed product defect - re-run where the GD extension is enabled."
                    % (names, why))
        names = ", ".join(c.split("\\")[-1] for c in failed)
        return "Failed", "Automated FAILED in: " + names + ". " + results[failed[0]]["msg"]
    n = sum(results[c]["tests"] for c in present)
    actual = "Automated PASSED: %s (%d tests)." % (", ".join(c.split("\\")[-1] for c in present), n)
    if missing:
        actual += " Not covered by subset: " + ", ".join(c.split("\\")[-1] for c in missing) + "."
    return "Passed", actual


def fill(ws, r, c, v, bold=False, size=10, color=None, bg=None, wrap=True, halign="left"):
    cell = ws.cell(r, c, v)
    cell.font = Font(bold=bold, size=size, color=color)
    cell.alignment = Alignment(vertical="top", wrap_text=wrap, horizontal=halign)
    if bg:
        cell.fill = PatternFill("solid", fgColor=bg)
    cell.border = BORDER
    return cell


def style_header(ws, ncols, height=30):
    for c in range(1, ncols + 1):
        cell = ws.cell(1, c)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = BORDER
    ws.row_dimensions[1].height = height
    ws.freeze_panes = "A2"


def main():
    results, summary = parse_results()

    wb = Workbook()
    wb.remove(wb.active)

    # ---------- main sheet ----------
    ws = wb.create_sheet("Complete Test Cases")
    for c, h in enumerate(HEADERS, 1):
        ws.cell(1, c, h)
    widths = [16, 40, 56, 40, 34, 58, 40, 14, 12, 26, 26, 14, 12, 20]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    r = 2
    for cid, name, sev, steps, data, pre, expected, classes in CASES:
        status, actual = evaluate(classes, results)
        values = [cid, name, steps, data, pre, expected, actual, status, sev, "Automated verification (PHPUnit subset).", "", TESTED_IN, "", RESOLVED_BY]
        for c, v in enumerate(values, 1):
            fill(ws, r, c, v)
        ws.cell(r, 1).font = Font(size=10, bold=True)
        fill(ws, r, 8, status, bg=STATUS_FILL.get(status, "FFF2CC"), halign="center")
        fill(ws, r, 9, sev, bg=SEV_FILL[sev], halign="center")
        fill(ws, r, 12, TESTED_IN, halign="center")
        fill(ws, r, 14, RESOLVED_BY, halign="center")
        r += 1
    last = r - 1
    ws.auto_filter.ref = "A1:N%d" % last
    style_header(ws, len(HEADERS))
    dv_status = DataValidation(type="list", allow_blank=True, formula1='"%s"' % STATUS_OPTIONS)
    dv_sev = DataValidation(type="list", allow_blank=True, formula1='"Critical,High,Medium,Low"')
    ws.add_data_validation(dv_status)
    ws.add_data_validation(dv_sev)
    dv_status.add("H2:H%d" % last)
    dv_sev.add("I2:I%d" % last)

    # ---------- module summary ----------
    ms = wb.create_sheet("Module Summary")
    ms.column_dimensions["A"].width = 6
    ms.column_dimensions["B"].width = 42
    ms.column_dimensions["C"].width = 14
    ms.column_dimensions["D"].width = 60
    ms.cell(1, 2, "Restaurant POS SaaS - Focused Test Case Workbook").font = Font(bold=True, size=14, color="1F4E78")
    counts = {}
    stat = {}
    for cid, name, sev, steps, data, pre, expected, classes in CASES:
        s, _ = evaluate(classes, results)
        stat[s] = stat.get(s, 0) + 1
    rr = 3
    for label, val in [("Total test cases", len(CASES)),
                       ("Passed", stat.get("Passed", 0)),
                       ("Failed", stat.get("Failed", 0)),
                       ("Not Tested", stat.get("Not Tested", 0))]:
        fill(ms, rr, 2, label, bold=True)
        fill(ms, rr, 3, val, bold=True)
        rr += 1
    rr += 1
    fill(ms, rr, 2, "Automated run result", bold=True)
    fill(ms, rr, 3, summary)
    ms.merge_cells(start_row=rr, start_column=3, end_row=rr, end_column=4)
    rr += 2

    fill(ms, rr, 2, "Critical workflow coverage", bold=True, size=12, color="1F4E78")
    rr += 1
    for item in [
        "Customer scans table QR -> dining session (TC-QR-002)",
        "Order reaches the correct restaurant/branch/table (TC-CORD-003, TC-BRCH-008, TC-SEC-001)",
        "Order accepted before kitchen (TC-ACPT-003, TC-KIT-003)",
        "Kitchen staff update preparation status (TC-KIT-003)",
        "Table staff manage assigned tables (TC-TSTF-001, TC-TABLE-005)",
        "Customer requests the bill (TC-BILL-001)",
        "Cashier generates bill & accepts payment (TC-POS-003, TC-BILL-001)",
        "Partial payments update outstanding (TC-BILL-001)",
        "Data isolated between restaurants/branches (TC-SEC-001, TC-BRCH-008)",
    ]:
        fill(ms, rr, 2, item)
        ms.merge_cells(start_row=rr, start_column=2, end_row=rr, end_column=4)
        rr += 1

    # ---------- carry over Bugs & Incomplete sheets from the full audit file ----------
    bugs, incomplete = load_support_sheets()

    bs = wb.create_sheet("Bugs & Issues")
    b_headers = ["#", "Title", "Type", "Severity", "Status", "Evidence / Location", "Notes"]
    for i, w in enumerate([6, 40, 16, 12, 12, 52, 70], 1):
        bs.column_dimensions[get_column_letter(i)].width = w
    for c, h in enumerate(b_headers, 1):
        bs.cell(1, c, h)
    for i, row in enumerate(bugs, 1):
        fill(bs, i + 1, 1, i, bold=True)
        for c, v in enumerate(row, 2):
            fill(bs, i + 1, c, v)
        fill(bs, i + 1, 4, row[2], bg=SEV_FILL.get(row[2]))
    style_header(bs, len(b_headers), height=24)
    bs.auto_filter.ref = "A1:G%d" % (len(bugs) + 1)

    fs = wb.create_sheet("Incomplete Features")
    f_headers = ["#", "Feature / Module", "Status", "Evidence / Detail", "Recommended Action"]
    for i, w in enumerate([6, 34, 24, 78, 40], 1):
        fs.column_dimensions[get_column_letter(i)].width = w
    for c, h in enumerate(f_headers, 1):
        fs.cell(1, c, h)
    for i, row in enumerate(incomplete, 1):
        fill(fs, i + 1, 1, i, bold=True)
        for c, v in enumerate(row, 2):
            fill(fs, i + 1, c, v)
    style_header(fs, len(f_headers), height=24)
    fs.auto_filter.ref = "A1:E%d" % (len(incomplete) + 1)
    dv_f = DataValidation(type="list", allow_blank=True,
                          formula1='"Not Implemented,Backend Not Ready,Frontend Not Implemented,Partially Implemented,Requires Investigation"')
    fs.add_data_validation(dv_f)
    dv_f.add("C2:C%d" % (len(incomplete) + 1))

    wb.save(OUT)
    print("Saved: %s" % OUT)
    print(summary)
    print("Cases: %d | %s" % (len(CASES), stat))


def load_support_sheets():
    """Read Bugs & Issues / Incomplete Features rows from the existing full workbook, if present."""
    bugs, incomplete = [], []
    if not os.path.exists(OUT):
        return bugs, incomplete
    try:
        old = load_workbook(OUT)
        if "Bugs & Issues" in old.sheetnames:
            w = old["Bugs & Issues"]
            for row in w.iter_rows(min_row=2, values_only=True):
                if row[1]:
                    bugs.append([row[1], row[2], row[3], row[4], row[5], row[6]])
        if "Incomplete Features" in old.sheetnames:
            w = old["Incomplete Features"]
            for row in w.iter_rows(min_row=2, values_only=True):
                if row[1]:
                    incomplete.append([row[1], row[2], row[3], row[4]])
    except Exception as exc:  # noqa: BLE001
        print("Could not read support sheets:", exc)
    return bugs, incomplete


if __name__ == "__main__":
    main()
