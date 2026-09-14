<#
.SYNOPSIS
    Upload a Companies Office bulk data zip and import it into https://companies.aicloud.co.nz.

.DESCRIPTION
    Copies the zip to the server, then runs deploy/import-bulk-data.sh there. The site keeps
    serving the current data until each table has been rebuilt. Needs SSH access to the server.

.EXAMPLE
    .\deploy\import-bulk-data.ps1 "$HOME\Downloads\Companies Office Bulk Data September 2026.zip"
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$ZipPath,

    [string]$Server = 'ubuntu@223.165.71.59'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ZipPath)) {
    throw "Zip not found: $ZipPath"
}
$sizeMb = [math]::Round((Get-Item -LiteralPath $ZipPath).Length / 1MB)
$remoteZip = "bizinsight-data/upload-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"

Write-Host "Uploading $sizeMb MB to $Server ..."
ssh $Server 'mkdir -p ~/bizinsight-data'
scp $ZipPath "${Server}:$remoteZip"
if ($LASTEXITCODE -ne 0) { throw 'Upload failed.' }

Write-Host 'Importing - takes a few minutes; the site keeps serving the current data meanwhile ...'
ssh $Server "bash /opt/webApp/bizinsight/deploy/import-bulk-data.sh ~/$remoteZip && rm -f ~/$remoteZip"
if ($LASTEXITCODE -ne 0) { throw 'Import failed - see the output above. The uploaded zip was kept on the server.' }

Write-Host 'Done: https://companies.aicloud.co.nz'
