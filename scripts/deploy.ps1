# deploy.ps1
# Skrip otomasi build & deploy G-Form Orkestrator ke VPS Nginx

$ErrorActionPreference = "Stop"

Write-Host "[DEPLOY] Memulai Proses Build & Deploy..." -ForegroundColor Cyan

# 1. Type Check
Write-Host "[DEPLOY] Menjalankan pemeriksaan tipe data (Type Check)..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "[DEPLOY] Type check gagal! Proses deploy dibatalkan." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[DEPLOY] Type check lulus!" -ForegroundColor Green

# 2. Build Expo Web
Write-Host "[DEPLOY] Membangun bundle aplikasi Expo Web (Metro)..." -ForegroundColor Yellow
npx expo export --clear --platform web
if ($LASTEXITCODE -ne 0) {
    Write-Host "[DEPLOY] Build gagal! Proses deploy dibatalkan." -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[DEPLOY] Build Expo Web sukses!" -ForegroundColor Green

# 3. Copy Static Assets (Aman dari bentrokan index.html)
Write-Host "[DEPLOY] Menyalin dan menata berkas statis dari public/..." -ForegroundColor Yellow
Copy-Item -Path .\public\contact.html -Destination .\dist\ -Force
Copy-Item -Path .\public\privacy.html -Destination .\dist\ -Force
Copy-Item -Path .\public\refund.html -Destination .\dist\ -Force
Copy-Item -Path .\public\terms.html -Destination .\dist\ -Force
Copy-Item -Path .\public\logo.png -Destination .\dist\ -Force
Copy-Item -Path .\public\BTI-compact-logo.png -Destination .\dist\ -Force
# Copy public/landing.html (landing) agar tidak menimpa dist/index.html (app)
Copy-Item -Path .\public\landing.html -Destination .\dist\landing.html -Force
Copy-Item -Path .\public\platform_ujian.html -Destination .\dist\platform_ujian.html -Force
Copy-Item -Path .\public\platform_mustahiq.html -Destination .\dist\platform_mustahiq.html -Force
Write-Host "[DEPLOY] Berkas statis disalin & landing.html dipisahkan dengan aman!" -ForegroundColor Green

# 4. Compressing
Write-Host "[DEPLOY] Mengompres berkas build menjadi ZIP..." -ForegroundColor Yellow
if (Test-Path .\dist.zip) { 
    Remove-Item .\dist.zip -Force 
}
Compress-Archive -Path .\dist\* -DestinationPath .\dist.zip -Force
Write-Host "[DEPLOY] Kompresi selesai (dist.zip)." -ForegroundColor Green

# 5. Upload to VPS
Write-Host "[DEPLOY] Mengunggah dist.zip ke VPS..." -ForegroundColor Yellow
scp -i nginxonly.pem -o StrictHostKeyChecking=no dist.zip asepsuryadi@103.129.148.127:/home/asepsuryadi/dist.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "[DEPLOY] Gagal mengunggah ke VPS!" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[DEPLOY] File berhasil diunggah!" -ForegroundColor Green

# 6. Extract on VPS
Write-Host "[DEPLOY] Mengekstrak berkas di VPS dan menyetel kepemilikan folder..." -ForegroundColor Yellow
ssh -i nginxonly.pem -o StrictHostKeyChecking=no asepsuryadi@103.129.148.127 "sudo unzip -o /home/asepsuryadi/dist.zip -d /var/www/absenta.id/ ; sudo chown -R asepsuryadi:asepsuryadi /var/www/absenta.id/ ; sudo chmod -R +rX /var/www/absenta.id/ ; rm -f /home/asepsuryadi/dist.zip"
Write-Host "[DEPLOY] Ekstraksi VPS selesai!" -ForegroundColor Green

# 7. Clean up local zip
if (Test-Path .\dist.zip) {
    Remove-Item -Path .\dist.zip -Force
}

Write-Host "[DEPLOY] DEPLOY BERHASIL & LIVE!" -ForegroundColor Green
