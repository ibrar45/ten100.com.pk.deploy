# Seeds 20 hostels, 60 rooms, 70 total beds (sum of totalSeats) using curl.exe.
# Requires: API running (default http://127.0.0.1:5000), MongoDB, JWT_SECRET in .env
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\seed-20-hostels-curl.ps1
# Optional: $env:API_BASE = "http://127.0.0.1:5000"

$ErrorActionPreference = "Stop"
$base = if ($env:API_BASE) { $env:API_BASE.TrimEnd("/") } else { "http://127.0.0.1:5000" }
$jar = Join-Path $PSScriptRoot "seed_bulk_cookies.txt"
Remove-Item $jar -ErrorAction SilentlyContinue

$suffix = [DateTime]::UtcNow.Ticks
$email = "bulkseed$suffix@test.local"
$user = "bulkseed$suffix"
$pass = "BulkSeed123!"

# curl on Windows + PowerShell -d can send UTF-16; Express JSON fails. Use UTF-8 file + --data-binary.
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
$bodyFile = Join-Path $env:TEMP "railway-seed-body.json"

function Invoke-SeedCurl {
  param([string[]]$CurlArgs)
  $o = & curl.exe @CurlArgs 2>&1
  if ($LASTEXITCODE -ne 0) { throw "curl failed ($LASTEXITCODE): $o" }
  return [string]$o
}

function Invoke-JsonPost {
  param(
    [string]$Url,
    [string]$Json,
    [ValidateSet("JarOut", "JarInOut")]
    [string]$JarMode
  )
  [System.IO.File]::WriteAllText($bodyFile, $Json, $utf8NoBom)
  $at = "@$($bodyFile -replace '\\', '/')"
  if ($JarMode -eq "JarOut") {
    $curlArgs = @("-s", "-c", $jar, "-X", "POST", $Url, "-H", "Content-Type: application/json; charset=utf-8", "--data-binary", $at)
  }
  else {
    $curlArgs = @("-s", "-b", $jar, "-c", $jar, "-X", "POST", $Url, "-H", "Content-Type: application/json; charset=utf-8", "--data-binary", $at)
  }
  return Invoke-SeedCurl -CurlArgs $curlArgs
}

Write-Host "Registering $user ..."
$regJson = (@{ username = $user; email = $email; password = $pass } | ConvertTo-Json -Compress)
$regResp = Invoke-JsonPost -Url "$base/api/auth/register" -Json $regJson -JarMode JarOut
$regObj = $regResp | ConvertFrom-Json
if (-not $regObj.success) { throw "Register failed: $regResp" }

$ownerJson = (@{
    firstName    = "Bulk"
    lastName     = "Seed"
    phoneNumber  = "03001234567"
    gender       = "male"
    dateOfBirth  = "1990-01-15"
    address      = @{
      street  = "1 Seed Street"
      city    = "Lahore"
      state   = "Punjab"
      zipCode = "54000"
    }
  } | ConvertTo-Json -Compress -Depth 5)

Write-Host "Becoming owner (profile + role) ..."
$ownResp = Invoke-JsonPost -Url "$base/api/profile/me/become-hostel-owner" -Json $ownerJson -JarMode JarInOut
$ownObj = $ownResp | ConvertFrom-Json
if (-not $ownObj.success) { throw "become-hostel-owner failed: $ownResp" }

$totalBeds = 0
for ($h = 1; $h -le 20; $h++) {
  $code = "BH{0:D2}" -f $h
  $createBody = (@{
      name         = "Bulk Hostel $h"
      code         = $code
      genderPolicy = "boys"
      totalFloors  = 3
      contact      = @{ phone = "03001234567"; email = "bulk$h@example.com" }
      address      = @{ city = "Lahore"; area = "Gulberg"; street = "Block $h" }
      amenities    = @("wifi")
      rules        = @("No smoking")
    } | ConvertTo-Json -Compress -Depth 6)

  $resp = Invoke-JsonPost -Url "$base/api/hostels/create" -Json $createBody -JarMode JarInOut
  $jid = $resp | ConvertFrom-Json
  if (-not $jid.success) { throw "Hostel create failed ($h): $resp" }
  $hid = [string]$jid.data._id

  # 60 rooms, 70 beds: hostels 1-10 -> totalSeats (1+1+2)=4 each -> 40 beds; 11-20 -> (1+1+1)=3 each -> 30 beds.

  $seatPattern = if ($h -le 10) { @(1, 1, 2) } else { @(1, 1, 1) }

  $ri = 0
  foreach ($seats in $seatPattern) {
    $ri++
    $totalBeds += $seats
    $roomNo = "{0}{1:D2}" -f $h, $ri
    $roomBody = (@{
        roomNo          = $roomNo
        floorNumber     = 1
        totalSeats      = $seats
        availableSeats  = $seats
        rentPerBed      = 10000
      } | ConvertTo-Json -Compress)

    $rresp = Invoke-JsonPost -Url "$base/api/hostels/$hid/rooms" -Json $roomBody -JarMode JarInOut
    $rj = $rresp | ConvertFrom-Json
    if (-not $rj.success) { throw "Room add failed (hostel $h room $ri): $rresp" }
  }
  Write-Host "  Hostel $h / 20 ($hid)"
}

Write-Host ""
Write-Host "Done."
Write-Host "  Hostels: 20"
Write-Host "  Rooms:   60 (3 per hostel)"
Write-Host "  Beds:    $totalBeds (sum of totalSeats; expected 70)"
Write-Host "  Cookie jar: $jar"
