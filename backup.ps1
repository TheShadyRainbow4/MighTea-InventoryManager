[CmdletBinding()]
param(
    [string]$BackupName = "MighTea-InventoryManager_Backup.cab",
    [string]$Version,
    [string]$Description
)

# Strict Mode
$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
if (-not $projectRoot) {
    $projectRoot = Get-Location
}

$cabPath = Join-Path $projectRoot $BackupName
$indexHtml = Join-Path $projectRoot "index.html"
$ledgerPath = Join-Path $projectRoot "ledger.md"

# Verify source file exists
if (-not (Test-Path $indexHtml)) {
    Write-Error "index.html not found. The boba universe is empty. How can we backup an inventory system without its main frontend index? Please ensure you are in the project root."
    exit 1
}

# 1. Version Extraction
if ([string]::IsNullOrEmpty($Version)) {
    try {
        if (Test-Path $indexHtml) {
            $content = Get-Content -Raw -Path $indexHtml
            if ($content -match 'Version\s+([\d\.]+)') {
                $Version = $Matches[1]
            } else {
                $Version = "1.0.0.0"
            }
        } else {
            $Version = "1.0.0.0"
        }
    } catch {
        $Version = "1.0.0.0"
    }
}

# 2. Change Description Collection
if ([string]::IsNullOrEmpty($Description) -or [string]::IsNullOrWhiteSpace($Description)) {
    if ([Environment]::UserInteractive) {
        $Description = ""
        while ([string]::IsNullOrWhiteSpace($Description)) {
            $Description = Read-Host "Enter backup change description"
        }
    } else {
        $Description = "Automated backup (Non-interactive)"
    }
}

# Sanitize description
$Description = $Description.Trim() -replace "\r?\n", " "

# 3. Dynamic DDF & makecab Packaging
$tempDdfPath = Join-Path $projectRoot "backup_temp.ddf"
$infPath = Join-Path $projectRoot "setup.inf"
$rptPath = Join-Path $projectRoot "setup.rpt"

try {
    # Discover all files recursively in the project root
    $allFiles = Get-ChildItem -Path $projectRoot -Recurse -File
    
    $excludedDirs = @('.git', '.agents', '.venv', '__pycache__')
    $excludedExts = @('.pyc', '.cab')
    
    $ddfLines = @(
        ".OPTION EXPLICIT",
        ".Set CabinetNameTemplate=$BackupName",
        ".Set DiskDirectoryTemplate=$projectRoot",
        ".Set Cabinet=on",
        ".Set Compress=on",
        ".Set InfFileName=NUL",
        ".Set RptFileName=NUL"
    )
    
    foreach ($file in $allFiles) {
        $fullName = $file.FullName
        
        # Exclude the output backup name itself
        if ($fullName -ieq $cabPath) {
            continue
        }
        
        # Exclude extensions
        $ext = [System.IO.Path]::GetExtension($fullName)
        if ($excludedExts -contains $ext.ToLower()) {
            continue
        }
        
        # Calculate relative path
        $relPath = $fullName.Substring($projectRoot.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        
        # Exclude directories
        $segments = $relPath.Split([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
        $isExcludedDir = $false
        foreach ($seg in $segments) {
            if ($excludedDirs -contains $seg.ToLower()) {
                $isExcludedDir = $true
                break
            }
        }
        if ($isExcludedDir) {
            continue
        }
        
        # Method B: write absolute source path and relative target path per line
        $ddfLines += "`"$fullName`" `"$relPath`""
    }
    
    # Write the temporary DDF file
    [System.IO.File]::WriteAllLines($tempDdfPath, $ddfLines)
    
    # Execute makecab.exe
    $process = Start-Process -FilePath "makecab.exe" -ArgumentList "/F", "`"$tempDdfPath`"" -NoNewWindow -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        throw "makecab.exe failed with exit code $($process.ExitCode)"
    }
} catch {
    Write-Error "Failed to generate CAB file: $_. Even makecab.exe could not handle compressing your masterpiece. Please ensure you are not out of disk space, that makecab.exe exists in your PATH, and that no other process is holding a lock on the cabinet file."
    exit 1
} finally {
    # Clean up intermediate files
    if (Test-Path $tempDdfPath) {
        Remove-Item $tempDdfPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $infPath) {
        Remove-Item $infPath -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $rptPath) {
        Remove-Item $rptPath -Force -ErrorAction SilentlyContinue
    }
}

# 4. Concurrent Lock-Safe Ledger Write
$timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
$logEntry = "* [$timestamp] [v$Version] Backup created: $BackupName - $Description"

$maxRetries = 15
$success = $false
$lastError = $null

for ($i = 1; $i -le $maxRetries; $i++) {
    $fs = $null
    $writer = $null
    try {
        $fs = [System.IO.File]::Open($ledgerPath, [System.IO.FileMode]::OpenOrCreate, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
        
        $needsNewline = $false
        if ($fs.Length -gt 0) {
            $fs.Position = $fs.Length - 1
            $lastByte = $fs.ReadByte()
            if ($lastByte -ne 10 -and $lastByte -ne 13) {
                $needsNewline = $true
            }
        }
        
        # Seek stream before constructing StreamWriter
        $fs.Seek(0, [System.IO.SeekOrigin]::End) | Out-Null
        
        $encoding = New-Object System.Text.UTF8Encoding($false)
        $writer = New-Object System.IO.StreamWriter($fs, $encoding)
        
        if ($fs.Length -eq 0) {
            $writer.Write("# MighTea Inventory Change Ledger`r`n`r`n")
        } elseif ($needsNewline) {
            $writer.Write("`r`n")
        }
        
        $writer.WriteLine($logEntry)
        $writer.Flush()
        $success = $true
        break
    } catch {
        $lastError = $_
        $sleepMs = Get-Random -Minimum 100 -Maximum 201
        Start-Sleep -Milliseconds $sleepMs
    } finally {
        if ($writer) { $writer.Dispose() }
        if ($fs) { $fs.Dispose() }
    }
}

if (-not $success) {
    Write-Error "Failed to update ledger.md: $lastError. After 15 attempts, the ledger remains stubborn and refused to accept the new entry. It seems a lock-happy concurrent actor won the race, or the file has vanished into the binary void."
    exit 1
}

Write-Host "Backup completed successfully."
exit 0
