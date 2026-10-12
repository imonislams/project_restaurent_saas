<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Restaurant branding: the tenant logo shown in the admin shell, receipts and
 * the customer QR experience.
 */
class TenantBrandingController extends Controller
{
    public function updateLogo(Request $request): RedirectResponse
    {
        $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $tenant = $request->user()->tenant;
        abort_if($tenant === null, 403);

        $previous = $tenant->logo_path;
        $path = $request->file('logo')->store('logos/'.$tenant->getKey(), 'public');

        $tenant->forceFill(['logo_path' => $path])->save();

        if ($previous && $previous !== $path) {
            Storage::disk('public')->delete($previous);
        }

        return back()->with('success', 'Restaurant logo updated.');
    }

    public function destroyLogo(Request $request): RedirectResponse
    {
        $tenant = $request->user()->tenant;
        abort_if($tenant === null, 403);

        if ($tenant->logo_path) {
            Storage::disk('public')->delete($tenant->logo_path);
            $tenant->forceFill(['logo_path' => null])->save();
        }

        return back()->with('success', 'Restaurant logo removed.');
    }
}
