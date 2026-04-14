param(
  [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

function Call-Api {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Url,
    [string]$Body = $null
  )
  try {
    if ($Method -eq "GET") {
      $resp = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 30
    }
    elseif ($null -ne $Body) {
      $resp = Invoke-RestMethod -Uri $Url -Method $Method -ContentType "application/json" -Body $Body -TimeoutSec 30
    }
    else {
      $resp = Invoke-RestMethod -Uri $Url -Method $Method -TimeoutSec 30
    }
    Write-Host "[PASS] $Name" -ForegroundColor Green
    return $resp
  }
  catch {
    $msg = $_.Exception.Message
    Write-Host "[FAIL] $Name -> $msg" -ForegroundColor Red
    if ($_.Exception.Response) {
      try {
        $reader = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        if ($body) { Write-Host "       Body: $body" -ForegroundColor DarkRed }
      } catch {}
    }
    throw
  }
}

function Call-FileApi {
  param(
    [string]$Name,
    [string]$Url
  )
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 30 -UseBasicParsing
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) {
      Write-Host "[PASS] $Name" -ForegroundColor Green
      return $resp
    }
    throw "$Name returned status code $($resp.StatusCode)"
  }
  catch {
    $msg = $_.Exception.Message
    Write-Host "[FAIL] $Name -> $msg" -ForegroundColor Red
    throw
  }
}

Write-Host "Running backend smoke flow against $BaseUrl" -ForegroundColor Cyan

$health = Call-Api -Name "Health" -Method "GET" -Url "$BaseUrl/health"
$hostel = Call-Api -Name "Create Hostel" -Method "POST" -Url "$BaseUrl/api/v1/hostels" -Body (@{
  name = "Boys Hostel A"
  location = "Main Campus"
  blocks = 2
  floors = 4
} | ConvertTo-Json)

$hostelId = $hostel.id
if (-not $hostelId) { throw "hostel id missing in response" }

Call-Api -Name "Add Student Count" -Method "POST" -Url "$BaseUrl/api/v1/hostels/$hostelId/student-count" -Body (@{
  student_count = 420
  effective_date = "2026-04-14T00:00:00Z"
} | ConvertTo-Json) | Out-Null

Call-Api -Name "Add Consumption" -Method "POST" -Url "$BaseUrl/api/v1/hostels/$hostelId/consumption" -Body (@{
  timestamp = "2026-04-14T10:30:00Z"
  bath_l = 3200
  laundry_l = 1100
  drinking_l = 450
  kitchen_l = 700
  other_l = 120
} | ConvertTo-Json) | Out-Null

Call-Api -Name "Run Calculation" -Method "POST" -Url "$BaseUrl/api/v1/calculations/run/$hostelId" | Out-Null
Call-Api -Name "Dashboard Summary" -Method "GET" -Url "$BaseUrl/api/v1/dashboard/$hostelId/summary" | Out-Null
Call-Api -Name "Reuse Suggestions" -Method "POST" -Url "$BaseUrl/api/v1/reuse/suggestions/$hostelId" | Out-Null
Call-Api -Name "Daily Chart" -Method "GET" -Url "$BaseUrl/api/v1/charts/$hostelId/daily?days=7" | Out-Null
Call-Api -Name "Weekly Chart" -Method "GET" -Url "$BaseUrl/api/v1/charts/$hostelId/weekly?weeks=4" | Out-Null
Call-Api -Name "Category Breakdown" -Method "GET" -Url "$BaseUrl/api/v1/charts/$hostelId/category-breakdown" | Out-Null
Call-FileApi -Name "Report XLSX" -Url "$BaseUrl/api/v1/reports/$hostelId.xlsx" | Out-Null
Call-FileApi -Name "Report PDF" -Url "$BaseUrl/api/v1/reports/$hostelId.pdf" | Out-Null

Write-Host "All smoke checks passed." -ForegroundColor Green
