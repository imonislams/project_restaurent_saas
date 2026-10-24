# Custom Roles & Permissions

Tenant-defined roles let a restaurant owner tailor access to their own business: create a
role (Waiter, Cashier, Branch Manager, Kitchen Staff, …), tick the permissions it should
hold, and assign it to staff — without touching the platform's fixed role catalog.

**Related docs:** [SECURITY.md](./SECURITY.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) ·
[DATABASE.md](./DATABASE.md)

---

## 1. What was reused (no parallel system)

This feature extends the existing RBAC; it does **not** introduce a second role or
permission system.

| Concern | Reused |
|---------|--------|
| Tables | `roles`, `permissions`, `permission_role`, `role_user` (unchanged) |
| Models | `App\Domain\Identity\Models\{Role,Permission}` |
| Authorization | `HasRoles` trait, `Gate::before`, `permission:` middleware |
| Permission catalog | `App\Domain\Identity\Permissions` (source of truth) |
| Role list / assignment | Staff page + `StaffService` / `InvitationService` |
| Audit | `App\Domain\Auditing\AuditLogger` (`audit_logs`) |
| UI | shadcn/UI kit (`Card`, `Drawer`, `ConfirmDialog`, `Badge`, fields) |

`roles.tenant_id` was already defined as *"NULL for global/system roles; set for
tenant-defined roles"*, so the schema **already supported** custom roles. **No structural
migration was needed.**

---

## 2. Data model

- **Global/system roles** — `tenant_id = NULL`, `is_system = true`. Seeded by
  `RolePermissionSeeder`; fixed and read-only in the tenant UI.
- **Custom roles** — `tenant_id = <tenant>`, `is_system = false`. Created/edited/deleted by
  the tenant.
- **Unique** `(tenant_id, slug)`. A custom role's slug is generated from its name and kept
  free of collisions with the global roles and the tenant's own roles.
- Permissions are attached through `permission_role`; users through `role_user`
  (unique `(user_id, role_id)` — no duplicate assignments).

### Migration

`database/migrations/2026_10_24_000001_add_role_management_permissions.php` — additive,
idempotent. It inserts the `roles.view` / `roles.manage` permission rows and grants them to
the `tenant_owner` / `tenant_admin` system roles. On a fresh `migrate --seed` the seeder
already covers this, so the migration is a no-op there.

Apply on an existing database:

```
php artisan migrate --path=database/migrations/2026_10_24_000001_add_role_management_permissions.php
```

---

## 3. Permissions

Two tenant permissions were added to the registry (`Permissions::map()`):

| Slug | Meaning |
|------|---------|
| `roles.view` | View roles and their permissions |
| `roles.manage` | Create/edit/delete custom roles |

They mirror the platform-side `platform.roles.manage`. They are granted to Tenant
Owner/Admin only; other roles are unaffected. `orders.approve` already existed and was
**not** re-added.

The permission picker groups the **tenant** catalog by functional area (Orders, Tables,
Menu, Kitchen, Customers, Inventory, Payments/Cash, Reports, Branch Management, Staff,
Roles, Settings, …). Only permissions that exist in the registry are shown — no invented
slugs.

---

## 4. Server-side rules

1. **Tenant isolation** — every query is scoped to `tenant_id ∈ {NULL, own}`. A
   non-own/non-custom role is rejected by `RolePolicy::ownsRole` (403); a foreign role id
   bound by URL fails closed.
2. **System-critical protection** — global roles (`tenant_id = NULL`) and every platform
   role are never listed for editing and cannot be updated or deleted
   (`RoleService::guardManaged` → 404/403). Super Admin / Owner / Admin definitions stay
   platform-managed.
3. **No privilege escalation** — a manager may only grant permissions they themselves hold
   (`RoleService::allowedPermissionSlugs`); granting anything else raises a validation error.
4. **Registry validation** — `permissions.*` must be in `Permissions::tenant()` (FormRequest
   `Rule::in`); `platform.*` is rejected.
5. **Unique names** — role names are unique within the global + own-tenant scope.
6. **Safe deletion** — a custom role still assigned to users cannot be deleted (validation
   error; no users, orders or records are touched).
7. **No duplicate assignments** — `roles()->sync()` + the `role_user` unique index.
8. **Branch rules preserved** — roles carry no branch identity; branch access stays on
   `branch_user` (`accessibleBranchIds`) and the fail-closed `branch` scope. A custom role
   never widens branch access.
9. **Audited** — `role.created`, `role.permissions_updated`, `role.deleted` record actor,
   target and timestamp.

Frontend visibility (hiding Create/Save/Delete) is **not** the security boundary; routes
(`permission:roles.view` / `roles.manage`) and the policy enforce it.

---

## 5. Routes & screens

| Method | URI | Name | Middleware |
|--------|-----|------|------------|
| GET | `/roles` | `roles.index` | `permission:roles.view` |
| POST | `/roles` | `roles.store` | `permission:roles.manage` |
| PATCH | `/roles/{role}` | `roles.update` | `permission:roles.manage` |
| DELETE | `/roles/{role}` | `roles.destroy` | `permission:roles.manage` |

- **Screen:** `resources/js/Pages/Roles/Index.tsx` (`Roles/Index`).
- **Navigation:** `Roles & Permissions` in the tenant sidebar (Business section), gated on
  `roles.view`. The existing `Staff & Roles` entry was relabeled `Staff` to keep the nav
  de-duplicated.
- **Features:** searchable role list, create drawer, inline edit, grouped permission
  checkboxes with per-group and global **Select all / Clear**, assigned-users list, delete
  confirmation, and a clear "in use" explanation when a role cannot be deleted.

Custom roles appear automatically in the Staff page's role picker, so owners assign them
with the existing staff workflow.

---

## 6. Integration with existing features

Because authorization still resolves through the same `HasRoles::allPermissions()` path
(frontend nav + backend `permission:` middleware + `Gate`/policies), a custom role takes
effect everywhere at once: POS, Orders, Tables, Kitchen, Inventory, Payments, Reports. For
example, a role granted only `orders.view` + `orders.create` gives order-taking alone —
order **approval** still needs the dedicated `orders.approve` permission.

---

## 7. File map

```
app/Domain/Identity/RoleService.php                  custom-role CRUD + validation + audit
app/Domain/Identity/Policies/RolePolicy.php          ownsRole / system-role guard
app/Http/Requests/Identity/{Store,Update}RoleRequest.php
app/Http/Controllers/Tenant/RoleController.php       roles.index/store/update/destroy
app/Domain/Identity/Permissions.php                  + roles group
app/Domain/Identity/{StaffService,InvitationService}.php   accept tenant custom roles
app/Http/Controllers/Staff/StaffController.php       role options include custom roles
app/Http/Requests/Staff/{UpdateStaff,StoreInvitation}Request.php
app/Providers/AppServiceProvider.php                 RolePolicy registration
routes/web.php                                       roles.* routes
database/migrations/2026_10_24_000001_add_role_management_permissions.php
resources/js/Pages/Roles/Index.tsx
resources/js/Layouts/AuthenticatedLayout.tsx         nav entry
resources/js/i18n/translations.ts                    nav.roles
tests/Feature/Identity/CustomRoleManagementTest.php
```

---

## 8. Known limitations

- `role_user.branch_id` remains unused (pre-existing); permissions are resolved tenant-wide
  and combined with branch access. Per-branch permission grants are not implemented.
- Role management is **not** a plan feature — it is core RBAC. (Registering it would hide it
  from every existing plan whose `features` JSON lacks the key.)
- The feature test is written but has **not** been executed (MySQL was offline; testing is
  deferred until explicitly authorized).
