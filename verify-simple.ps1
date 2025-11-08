# Simple Project Verification Script

Write-Host "Digital Balance - Quick Verification" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "docker-compose.yml",
    ".env.example",
    "README.md",
    "QUICKSTART.md",
    "backend/package.json",
    "backend/Dockerfile",
    "backend/src/index.ts",
    "backend/prisma/schema.prisma",
    "frontend/package.json",
    "frontend/Dockerfile",
    "frontend/src/app/page.tsx",
    "frontend/src/components/DashboardTab.tsx"
)

$missing = 0
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "[OK] $file" -ForegroundColor Green
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
        $missing++
    }
}

Write-Host ""
if ($missing -eq 0) {
    Write-Host "All critical files present! Ready to launch." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: docker-compose up --build" -ForegroundColor Yellow
} else {
    Write-Host "$missing files missing!" -ForegroundColor Red
}

