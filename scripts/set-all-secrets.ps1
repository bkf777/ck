# Set all required GitHub Secrets non-interactively
# Reads values from apps/agent/.env and current environment variables

param(
  [string]$EnvFilePath = "apps/agent/.env"
)

Write-Host "======== CopilotKit Secrets Setup (non-interactive) ========" -ForegroundColor Cyan

# Ensure gh CLI is available
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Host "ERROR: gh CLI not found in PATH. Please add C:\\Program Files\\GitHub CLI to PATH." -ForegroundColor Red
  exit 1
}

# Ensure authenticated
Write-Host "Checking GitHub auth status..." -ForegroundColor Yellow
$null = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Not authenticated. Please run 'gh auth login' first." -ForegroundColor Red
  exit 1
}

function Parse-EnvFile([string]$path) {
  $result = @{}
  if (-not (Test-Path $path)) { return $result }
  Get-Content -Path $path | ForEach-Object {
    $line = $_.Trim()
    if ([string]::IsNullOrWhiteSpace($line)) { return }
    if ($line.StartsWith('#')) { return }
    if ($line.StartsWith('export ')) { $line = $line.Substring(7) }
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
      $key = $matches[1]
      $val = $matches[2]
      $result[$key] = $val
    }
  }
  return $result
}

function GetValueOrEnv([string]$key, $envMap) {
  if ($envMap.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($envMap[$key])) { return $envMap[$key] }
  $envVal = [Environment]::GetEnvironmentVariable($key, 'Process')
  if (-not $envVal) { $envVal = [Environment]::GetEnvironmentVariable($key, 'User') }
  if (-not $envVal) { $envVal = [Environment]::GetEnvironmentVariable($key, 'Machine') }
  return $envVal
}

$envMap = Parse-EnvFile $EnvFilePath

# Collect secrets
$secrets = @{}

# Required: Anthropic from .env or OS env
$secrets['ANTHROPIC_API_KEY'] = GetValueOrEnv 'ANTHROPIC_API_KEY' $envMap
$secrets['ANTHROPIC_API_URL'] = GetValueOrEnv 'ANTHROPIC_API_URL' $envMap

# Required: Aliyun registry from OS env (prompt fallback via Read-Host if missing)
$aliyunUser = GetValueOrEnv 'ALIYUN_REGISTRY_USERNAME' $envMap
$aliyunPass = GetValueOrEnv 'ALIYUN_REGISTRY_PASSWORD' $envMap
if ([string]::IsNullOrWhiteSpace($aliyunUser)) { $aliyunUser = Read-Host 'Enter ALIYUN_REGISTRY_USERNAME' }
if ([string]::IsNullOrWhiteSpace($aliyunPass)) { $aliyunPass = Read-Host 'Enter ALIYUN_REGISTRY_PASSWORD' }
$secrets['ALIYUN_REGISTRY_USERNAME'] = $aliyunUser
$secrets['ALIYUN_REGISTRY_PASSWORD'] = $aliyunPass

# Optional: LangSmith
foreach ($k in @('LANGSMITH_TRACING','LANGSMITH_ENDPOINT','LANGSMITH_API_KEY','LANGSMITH_PROJECT')) {
  $val = GetValueOrEnv $k $envMap
  if (-not [string]::IsNullOrWhiteSpace($val)) { $secrets[$k] = $val }
}

# Optional: Deploy
foreach ($k in @('DEPLOY_SSH_KEY','DEPLOY_HOST','DEPLOY_USER','DEPLOY_PATH','DEPLOY_URL','API_URL')) {
  $val = GetValueOrEnv $k $envMap
  if (-not [string]::IsNullOrWhiteSpace($val)) { $secrets[$k] = $val }
}

# Optional: Lighthouse
$lhci = GetValueOrEnv 'LHCI_GITHUB_APP_TOKEN' $envMap
if (-not [string]::IsNullOrWhiteSpace($lhci)) { $secrets['LHCI_GITHUB_APP_TOKEN'] = $lhci }

# Validate required keys
$missing = @()
foreach ($req in @('ALIYUN_REGISTRY_USERNAME','ALIYUN_REGISTRY_PASSWORD','ANTHROPIC_API_KEY','ANTHROPIC_API_URL')) {
  if (-not $secrets.ContainsKey($req) -or [string]::IsNullOrWhiteSpace($secrets[$req])) { $missing += $req }
}
if ($missing.Count -gt 0) {
  Write-Host "ERROR: Missing required values: $($missing -join ', ')" -ForegroundColor Red
  exit 1
}

# Set secrets
$success = 0
$fail = 0
foreach ($name in $secrets.Keys) {
  $value = $secrets[$name]
  Write-Host ("Setting secret {0}..." -f $name) -NoNewline
  $proc = Start-Process -FilePath $gh.Source -ArgumentList @('secret','set',$name,'--body',$value) -NoNewWindow -Wait -PassThru -RedirectStandardOutput ([System.IO.Path]::GetTempFileName()) -RedirectStandardError ([System.IO.Path]::GetTempFileName())
  if ($proc.ExitCode -eq 0) {
    Write-Host " OK" -ForegroundColor Green
    $success++
  } else {
    Write-Host " FAILED" -ForegroundColor Red
    $fail++
  }
}

Write-Host "Done. Success: $success, Failed: $fail" -ForegroundColor Cyan

# Verify
Write-Host "Listing secrets..." -ForegroundColor Yellow
$null = gh secret list
