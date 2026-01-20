# GitHub Secrets Auto Configuration Script
# For CopilotKit CI/CD Pipeline

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "CopilotKit GitHub Secrets Setup" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check GitHub CLI
Write-Host "Checking GitHub CLI..." -ForegroundColor Yellow
$ghInstalled = gh --version 2>$null
if (-not $ghInstalled) {
    Write-Host "ERROR: GitHub CLI not installed" -ForegroundColor Red
    Write-Host "Please install it: winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: GitHub CLI installed: $ghInstalled" -ForegroundColor Green
Write-Host ""

# Verify login status
Write-Host "Checking GitHub login status..." -ForegroundColor Yellow
$loginCheck = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not logged in to GitHub" -ForegroundColor Red
    Write-Host "Please run: gh auth login" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Logged in to GitHub" -ForegroundColor Green
Write-Host ""

# Get repository info
Write-Host "Getting repository info..." -ForegroundColor Yellow
$repoName = gh repo view --json name -q 2>$null
$owner = gh repo view --json owner -q 2>$null
if (-not $repoName) {
    Write-Host "ERROR: Cannot get repository info" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Repository: $owner/$repoName" -ForegroundColor Green
Write-Host ""

# Configuration items
$secrets = @{
    "ALIYUN_REGISTRY_USERNAME" = "Aliyun Container Registry username"
    "ALIYUN_REGISTRY_PASSWORD" = "Aliyun Container Registry password"
    "ANTHROPIC_API_KEY" = "Anthropic API key"
    "ANTHROPIC_API_URL" = "Anthropic API URL (e.g., https://claude.mk8s.cn/)"
    "LANGSMITH_TRACING" = "LangSmith Tracing (true/false, optional)"
    "LANGSMITH_ENDPOINT" = "LangSmith API endpoint (optional)"
    "LANGSMITH_API_KEY" = "LangSmith API key (optional)"
    "LANGSMITH_PROJECT" = "LangSmith project name (optional)"
    "DEPLOY_SSH_KEY" = "SSH private key (for deployment, optional)"
    "DEPLOY_HOST" = "Deployment server address (optional)"
    "DEPLOY_USER" = "SSH username (optional)"
    "DEPLOY_PATH" = "Deployment path (optional)"
    "DEPLOY_URL" = "Frontend URL (optional)"
    "API_URL" = "API URL (optional)"
    "LHCI_GITHUB_APP_TOKEN" = "Lighthouse CI Token (optional)"
}

# Required items
$required = @(
    "ALIYUN_REGISTRY_USERNAME",
    "ALIYUN_REGISTRY_PASSWORD",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_API_URL"
)

# Optional items
$optional = @(
    "LANGSMITH_TRACING",
    "LANGSMITH_ENDPOINT",
    "LANGSMITH_API_KEY",
    "LANGSMITH_PROJECT",
    "DEPLOY_SSH_KEY",
    "DEPLOY_HOST",
    "DEPLOY_USER",
    "DEPLOY_PATH",
    "DEPLOY_URL",
    "API_URL",
    "LHCI_GITHUB_APP_TOKEN"
)

$configuredSecrets = @{}
$skippedSecrets = @()

# Configure required secrets
Write-Host "========== REQUIRED ITEMS ==========" -ForegroundColor Magenta
Write-Host ""
foreach ($secret in $required) {
    $description = $secrets[$secret]
    Write-Host "[$secret]" -ForegroundColor Cyan
    Write-Host "  Description: $description" -ForegroundColor Gray
    
    $value = Read-Host "  Enter value (or Ctrl+C to exit)"
    
    if ([string]::IsNullOrWhiteSpace($value)) {
        Write-Host "  ERROR: This item is required" -ForegroundColor Red
        $value = Read-Host "  Please enter again"
    }
    
    $configuredSecrets[$secret] = $value
    Write-Host ""
}

# Ask about optional items
Write-Host ""
Write-Host "========== OPTIONAL ITEMS ==========" -ForegroundColor Magenta
Write-Host ""
$configOptional = Read-Host "Configure optional items? (y/n, default: n)"

if ($configOptional -eq 'y' -or $configOptional -eq 'Y') {
    foreach ($secret in $optional) {
        $description = $secrets[$secret]
        Write-Host "[$secret]" -ForegroundColor Cyan
        Write-Host "  Description: $description" -ForegroundColor Gray
        
        $value = Read-Host "  Enter value (press Enter to skip)"
        
        if (-not [string]::IsNullOrWhiteSpace($value)) {
            $configuredSecrets[$secret] = $value
        } else {
            $skippedSecrets += $secret
        }
        Write-Host ""
    }
} else {
    $skippedSecrets = $optional
}

# Show confirmation
Write-Host "========== CONFIRMATION ==========" -ForegroundColor Magenta
Write-Host ""
Write-Host "Will configure $($configuredSecrets.Count) Secrets:" -ForegroundColor Yellow
foreach ($key in $configuredSecrets.Keys) {
    $value = $configuredSecrets[$key]
    # Hide sensitive info
    if ($value.Length -gt 20) {
        $display = $value.Substring(0, 10) + "..." + $value.Substring($value.Length - 5)
    } else {
        $display = "*" * $value.Length
    }
    Write-Host "  OK $key = $display" -ForegroundColor Green
}

if ($skippedSecrets.Count -gt 0) {
    Write-Host ""
    Write-Host "Skipped $($skippedSecrets.Count) optional items:" -ForegroundColor Yellow
    foreach ($key in $skippedSecrets) {
        Write-Host "  - $key" -ForegroundColor Gray
    }
}

Write-Host ""
$confirm = Read-Host "Confirm to start configuration? (y/n, default: n)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "CANCELLED" -ForegroundColor Yellow
    exit 0
}

# Execute configuration
Write-Host ""
Write-Host "========== STARTING CONFIGURATION ==========" -ForegroundColor Magenta
Write-Host ""

$successCount = 0
$failCount = 0

foreach ($key in $configuredSecrets.Keys) {
    $value = $configuredSecrets[$key]
    Write-Host "Configuring $key..." -NoNewline -ForegroundColor Cyan
    
    try {
        $value | gh secret set $key --body "-" 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " OK" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host " ERROR" -ForegroundColor Red
            $failCount++
        }
    }
    catch {
        Write-Host " ERROR: $_" -ForegroundColor Red
        $failCount++
    }
}

# Show results
Write-Host ""
Write-Host "========== CONFIGURATION COMPLETE ==========" -ForegroundColor Magenta
Write-Host ""
Write-Host "Success: $successCount OK" -ForegroundColor Green
Write-Host "Failed: $failCount ERROR" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "DONE: All Secrets configured successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Push code to main or develop branch to activate CI/CD"
    Write-Host "2. Check build progress in GitHub Actions"
    Write-Host "3. View logs: gh run list"
    Write-Host ""
    Write-Host "GitHub Secrets page:" -ForegroundColor Gray
    Write-Host "https://github.com/$owner/$repoName/settings/secrets/actions" -ForegroundColor Gray
} else {
    Write-Host "WARNING: Some Secrets failed to configure" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
