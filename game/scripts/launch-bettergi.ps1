<#
.SYNOPSIS
  BetterGI 一键启动封装脚本
  由 Omega desktop pet 的 Electron 主进程调用。
.DESCRIPTION
  查找 BetterGI 可执行文件，启动并监控进程生命周期。
  如果 BetterGI 已安装则启动，否则输出错误信息。
#>

param(
  [Parameter(Mandatory = $false)]
  [string]$BetterGIPath = "",

  [Parameter(Mandatory = $false)]
  [switch]$Wait = $false,

  [Parameter(Mandatory = $false)]
  [switch]$Silent = $false
)

# 搜索优先级：参数 > 项目内目录 > 常见安装路径
$searchPaths = @()
if ($BetterGIPath -and (Test-Path $BetterGIPath)) {
  $searchPaths = @($BetterGIPath)
}
else {
  # 项目内目录
  $projectDir = Split-Path -Parent $PSScriptRoot
  $searchPaths = @(
    "$projectDir\bettergi",
    "$projectDir\bettergi\BetterGI"
  )
  # 常见安装路径
  $searchPaths += @(
    "$env:LOCALAPPDATA\BetterGI",
    "$env:ProgramFiles\BetterGI",
    "${env:ProgramFiles(x86)}\BetterGI"
  )
}

$exeName = "BetterGI.exe"
$found = $null

foreach ($dir in $searchPaths) {
  $candidate = Join-Path $dir $exeName
  if (Test-Path $candidate) {
    $found = $candidate
    break
  }
  # 也可能是 BetterGenshinImpact.exe
  $candidate2 = Join-Path $dir "BetterGenshinImpact.exe"
  if (Test-Path $candidate2) {
    $found = $candidate2
    break
  }
}

# 检查 7z 压缩包是否存在（未解压状态）
if (-not $found) {
  $projectDir = Split-Path -Parent $PSScriptRoot
  $sevenZPath = Join-Path $projectDir "bettergi\BetterGI_v0.62.0.7z"
  if (Test-Path $sevenZPath) {
    Write-Error "BetterGI 压缩包已下载但未解压。请运行: powershell -ExecutionPolicy Bypass .\scripts\extract-bettergi.ps1"
    exit 2
  }
}

if (-not $found) {
  Write-Error "BetterGI 未找到。请下载 BetterGI 并放置在以下任一目录：`n$($searchPaths -join "`n")"
  exit 1
}

Write-Output "[BetterGI] 启动: $found"

try {
  if ($Silent) {
    $process = Start-Process -FilePath $found -WindowStyle Hidden -PassThru
  }
  else {
    $process = Start-Process -FilePath $found -PassThru
  }

  if ($Wait) {
    $process | Wait-Process
    Write-Output "[BetterGI] 进程已退出 (PID: $($process.Id))"
  }
  else {
    Write-Output "[BetterGI] 已启动 (PID: $($process.Id))"
  }

  # 返回进程信息 JSON
  $result = @{
    success  = $true
    pid      = $process.Id
    exePath  = $found
    exeName  = Split-Path -Leaf $found
    time     = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  }
  return $result | ConvertTo-Json -Compress
}
catch {
  Write-Error "[BetterGI] 启动失败: $_"
  $result = @{
    success = $false
    error   = $_.ToString()
  }
  return $result | ConvertTo-Json -Compress
  exit 2
}
