# Digital Balance - Verification Script
# This script verifies that all required files and configurations are in place

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Digital Balance - Project Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

function Check-File {
    param($path, $description)
    if (Test-Path $path) {
        Write-Host "[✓] $description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[✗] $description" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

function Check-FileContent {
    param($path, $pattern, $description)
    if (Test-Path $path) {
        $content = Get-Content $path -Raw
        if ($content -match $pattern) {
            Write-Host "[✓] $description" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[!] $description" -ForegroundColor Yellow
            $script:warnings++
            return $false
        }
    } else {
        Write-Host "[✗] $description - File not found" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

Write-Host "1. Checking Core Files..." -ForegroundColor Yellow
Write-Host ""

Check-File "docker-compose.yml" "Docker Compose configuration"
Check-File ".env.example" "Environment example file"
Check-File "README.md" "Main documentation"
Check-File "QUICKSTART.md" "Quick start guide"
Check-File "ARCHITECTURE.md" "Architecture documentation"
Check-File "PROJECT_SUMMARY.md" "Project summary"
Check-File "FINAL_CHECKLIST.md" "Final checklist"

Write-Host ""
Write-Host "2. Checking Backend Structure..." -ForegroundColor Yellow
Write-Host ""

Check-File "backend/package.json" "Backend package.json"
Check-File "backend/Dockerfile" "Backend Dockerfile"
Check-File "backend/tsconfig.json" "Backend TypeScript config"
Check-File "backend/jest.config.js" "Backend Jest config"
Check-File "backend/src/index.ts" "Backend entry point"
Check-File "backend/prisma/schema.prisma" "Prisma schema"

Write-Host ""
Write-Host "3. Checking Backend Routes..." -ForegroundColor Yellow
Write-Host ""

Check-File "backend/src/routes/files.ts" "Files route (upload)"
Check-File "backend/src/routes/kpi.ts" "KPI route"
Check-File "backend/src/routes/vat.ts" "VAT route"
Check-File "backend/src/routes/recon.ts" "Reconciliation route"
Check-File "backend/src/routes/quality.ts" "Quality route"
Check-File "backend/src/routes/chat.ts" "Chat route"

Write-Host ""
Write-Host "4. Checking Backend Services..." -ForegroundColor Yellow
Write-Host ""

Check-File "backend/src/services/database.ts" "Database service"
Check-File "backend/src/services/fileService.ts" "File service"
Check-File "backend/src/services/llmService.ts" "LLM service"

Write-Host ""
Write-Host "5. Checking Parsers..." -ForegroundColor Yellow
Write-Host ""

Check-File "backend/src/parsers/excelParser.ts" "Excel parser"
Check-File "backend/src/parsers/pdfParser.ts" "PDF parser"

Write-Host ""
Write-Host "6. Checking Tests..." -ForegroundColor Yellow
Write-Host ""

Check-File "backend/src/parsers/__tests__/excelParser.test.ts" "Excel parser tests"
Check-File "backend/src/parsers/__tests__/pdfParser.test.ts" "PDF parser tests"
Check-File "backend/src/__tests__/integration.test.ts" "Integration test"

Write-Host ""
Write-Host "7. Checking Frontend Structure..." -ForegroundColor Yellow
Write-Host ""

Check-File "frontend/package.json" "Frontend package.json"
Check-File "frontend/Dockerfile" "Frontend Dockerfile"
Check-File "frontend/tsconfig.json" "Frontend TypeScript config"
Check-File "frontend/tailwind.config.js" "Tailwind config"
Check-File "frontend/next.config.js" "Next.js config"

Write-Host ""
Write-Host "8. Checking Frontend App..." -ForegroundColor Yellow
Write-Host ""

Check-File "frontend/src/app/page.tsx" "Main page"
Check-File "frontend/src/app/layout.tsx" "Layout"
Check-File "frontend/src/app/globals.css" "Global styles"

Write-Host ""
Write-Host "9. Checking Frontend Components..." -ForegroundColor Yellow
Write-Host ""

Check-File "frontend/src/components/UploadTab.tsx" "Upload tab"
Check-File "frontend/src/components/DashboardTab.tsx" "Dashboard tab"
Check-File "frontend/src/components/ReconciliationTab.tsx" "Reconciliation tab"
Check-File "frontend/src/components/ChatTab.tsx" "Chat tab"
Check-File "frontend/src/lib/api.ts" "API client"

Write-Host ""
Write-Host "10. Checking Configuration Content..." -ForegroundColor Yellow
Write-Host ""

Check-FileContent "docker-compose.yml" "services:.*db:.*api:.*fe:" "Docker Compose has all 3 services"
Check-FileContent ".env.example" "OPENAI_API_KEY" ".env.example has LLM config"
Check-FileContent ".env.example" "POSTGRES_USER" ".env.example has database config"
Check-FileContent "backend/prisma/schema.prisma" "model Sale" "Prisma schema has Sale model"
Check-FileContent "backend/prisma/schema.prisma" "model BankTransaction" "Prisma schema has BankTransaction model"
Check-FileContent "backend/prisma/schema.prisma" "model DailyReconciliation" "Prisma schema has DailyReconciliation model"

Write-Host ""
Write-Host "11. Checking Sample Data Files..." -ForegroundColor Yellow
Write-Host ""

$hasExcel = Check-File "VENDAS SETEMBRO.xlsx" "Sample Excel file (optional)"
$hasPDF = Check-File "Extracto Bai 02 - Setembro 2025.pdf" "Sample PDF file (optional)"

if (-not $hasExcel -or -not $hasPDF) {
    Write-Host "    Note: Sample files are optional but recommended for testing" -ForegroundColor Gray
    $script:errors -= 2  # Don't count these as errors
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (($errors -eq 0) -and ($warnings -eq 0)) {
    Write-Host "[OK] All checks passed! Project is ready to launch." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Copy .env.example to .env and configure your LLM API key"
    Write-Host "2. Run: docker-compose up --build"
    Write-Host "3. Access: http://localhost:3000"
    Write-Host ""
    exit 0
} elseif ($errors -eq 0) {
    Write-Host "[WARN] $warnings warnings found, but project should work." -ForegroundColor Yellow
    Write-Host "Review warnings above and fix if necessary." -ForegroundColor Yellow
    Write-Host ""
    exit 0
} else {
    Write-Host "[ERROR] $errors errors found!" -ForegroundColor Red
    if ($warnings -gt 0) {
        Write-Host "[WARN] $warnings warnings found." -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Please fix the errors above before launching." -ForegroundColor Red
    Write-Host ""
    exit 1
}

