#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "Downloading Stitch screens to $DIR..."

download_screen() {
  local num="$1"
  local id="$2"
  local slug="$3"
  local img_url="$4"
  local html_url="$5"

  echo "[$num/8] Downloading $slug ($id)..."
  curl -L -s -S --fail "$img_url" -o "${slug}.png"
  curl -L -s -S --fail "$html_url" -o "${slug}.html"

  # Also create copies or symlinks with the exact screen ID
  cp "${slug}.png" "${id}.png"
  cp "${slug}.html" "${id}.html"
  echo "✓ Completed $slug"
}

# 1. Homepage
download_screen "1" "b1ec9ba9ef794984948a24c0e58813d4" "01_homepage" \
  "https://lh3.googleusercontent.com/aida/AEtjO1VKfi5W0shXyiNUDcmQeLzNEO6E6VfDAebGX3fHUKc6pKodx_9jpbRvP8pxPmN6XEHnnxwTO1ApJ172n_UTgcMZFqgRFzm2zUQZCkHPUW-CgWiXCMRRnu9sxVLnCm7Vpc24rT5MQFY19GqajDAgigz0o_9rI5VmSKXC6LWPvZ2V2hJdCBx8tKBtlvAMBjfKQqh-_H976FHbG0IKXg2r1uPGpuWPSU3BvlgSEF-XGT32zulBlnvzLVYOUg" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk2ZTFmM2MwZTMwMWE2MDk1NGYyM2I2MjZkEgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 2. Pricing & Plans
download_screen "2" "1d92708c0f364112a54d00c650913083" "02_pricing_and_plans" \
  "https://lh3.googleusercontent.com/aida/AEtjO1XpZZ85eSW08OXjrvxPhnTfN5jYk2T0iEfcFjKfRuUMv5vUfwCYM6Cmt0FkPg-CvShiTBf2K-iSwTN_Hd-il5AU82YG6c75jtTVxO2JR1Rjocjtud4BN2S8gfwmiAtbNtMdvxVM8hr3YEf1U8McIsWn8JTaVj5RMHHzRJIWuNusSTNeGGzXOZ49KaWH4_ogqcDMI-8dpNH2G4P5Dg3B9cQoUVXkYxYc4N8oMAavLKeyocZ-NFbEG3x07rU" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk2ZTEwMjM2YmIwOTEwNGY0ZTgxMzJlZDc4EgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 3. Core Terminal Engine
download_screen "3" "481fb31ed7844961963bf18ea11f043f" "03_core_terminal_engine" \
  "https://lh3.googleusercontent.com/aida/AEtjO1V9-m-g8X7_e3ru9xO1axbxeN-ft15WItfZ8hvE92vP29CBpHypkjWxUJnV8j8B1zTal_tt5uj-WBWGD9IQDUqGGXaMhoYPgSfKU1eVQqtLemizaHrxzHSerK1aO8pjMVe-QxMBYYWio7YZ-eq88RrMh6W0TYJ2U1PjDzgpEx0FpxXKKiOMEYkhAlc7GV58JGVYphgViK1pnS1MG4ZGZEngxicUNrKPiqC_ibo0Tv9iKI_wk2FOQd2KXkI" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk2ZWU5MWNhNDMwNzc5ODM4Y2FmMmQ4MDAxEgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 4. Kitchen Display System (KDS)
download_screen "4" "f215ad745f5644e19fc3c51edf7a9fee" "04_kitchen_display_system" \
  "https://lh3.googleusercontent.com/aida/AEtjO1X-MoITJGa0fkVcCZSpIlEfwKsXGPtdudjJ__wSvIK7Iyaj04IFfPsCUB7cpYYNqwssSBMC7OjIzild0-A02tVVb5yfAzt6muBwGQ-D-1DbJrO9dTNwvn_S9Zenz6Pvnoi5tPeOpry5alPld7IPeM8U4LuKOFCf5up1QMIqkluXMsG6BNzqqRn9pmojiuyPOAM7ZXRDpcVvIxq1RlSo3c85PJ4iwdqwgMxTT-1cnOBZdOsyQ7hqDolMrw" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk2ZjgyNWRmNmIwODlhZjcyNjIyMTdmZjQ5EgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 5. Inventory & Recipe Ledger
download_screen "5" "dce9c5d5e3304eadb280d4f65cde8ef9" "05_inventory_recipe_ledger" \
  "https://lh3.googleusercontent.com/aida/AEtjO1V6VdrZUEfWk3a9pn7wxh9xJe7bqm4gYXNMnoySBcJs0MQrWaXlYdiJYrd9xi-sIkGzO1fmpp0jDaTwhxUpG4Ld7_F_Ythi4Z5e85MYnUX8tgp4PYULVsZaRXlB0BrmwM4RTLVsyTtZRqR0n-TG4b1iGH0OkwIhL4p4_D1h6onNUzJco843CJM3ViFIoV2LQeh_LeeqbrdD6BmW3I7LidHhvSbYmba6Sc7BpqKEo-m3SJjOncGmVIz6U7I" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk3MjMyYjYwNzQwOTEwNGY3MGU2MGNlZjQzEgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 6. Multi-Branch Management
download_screen "6" "7c28d57f429a491abcf573e066a5fa3f" "06_multi_branch_management" \
  "https://lh3.googleusercontent.com/aida/AEtjO1XmoKgqnfm4cmlcFXu4S4kXmf0UAYsXab-jZh9O403jxqEkY-gtKKkvKIrFRRBjgXDBNTTeMzrDhJyDM8eSEM8X0A_vyjZxCTwVyL1f7yeepcTiDJ36JWXaaNMq5QYTN10PZdVkKGvSSsyx12Y93-fnar28T5dwf2q1AiYbldqm8_GQNg572opsU7o0ULhzoddbXT9pUDXdvnv7e6l0QXFcduVegsIgWykgN0zKOeb_FoSncdXK7XvbhA" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk3MmM5MjJjZGEwMmE5OWZhOGZkMTIzMGI3EgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 7. Cash & Expense Management
download_screen "7" "442ae0146e3a4b8697b0e29bccaf3dab" "07_cash_expense_management" \
  "https://lh3.googleusercontent.com/aida/AEtjO1Xjk4mX7SHmKp2Hi0moopNWm8YMLr6cqEI45zfIuJYLsNO_dydH8IzoOSUrnjbOpEpYoeqJ_-f7gxf8eBS-Yjj8xvEJyZmVXTONNIS9jqeZBj8O3A_uKDLQfoGcn881zVtA8ZVGpJ7eWvZ6XdM1xf0x2iRjMlXCzKcG_xQB3KU38s4LzCBfAdkmVINgMCsrBqEoG3-KBDgmfgbdf25X0_3U_bx1zP4KIjX5T9TU9b1kPK3SnkzXjvuDmZY" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDk3M2U5ZDU0NzAwMWI0ZDk3MDM0MDdhMmFmEgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

# 8. Mobile & Handheld Ordering
download_screen "8" "d575643d88e7450093d2a00b584a214d" "08_mobile_handheld_ordering" \
  "https://lh3.googleusercontent.com/aida/AEtjO1W5vGxa5SwUXE4uyTAjhGe0OGNNCqEqzgG41PnbvmGg9YWg9EYxsvanbdxdQ2mb0o9iaZsMNvTAYYnbIZ7tMLy4JwZgPekFo4p38uPXwo39SqunEf8x5bAGbDf4ZMZJW6Bk-_ObXvC9lrWuF21Cj9w9NiPe9X0aH9Zgmi72RsTjFtzCIK2i3i1dduA2KAeF_zJijInOPVPUNKadNbN5X5L2tK_P5ckXol2KHnPfWdU2CrPVX6GSxaTA9zE" \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1ZDliODM4OGUzODIwNTAzYzFmOGQzMTdmYTIyEgsSBxDHgbGruAsYAZIBIwoKcHJvamVjdF9pZBIVQhM1MjgyNDc5NjgyODUyMzk1MTMz&filename=&opi=89354086"

echo "All 8 screens downloaded successfully!"
