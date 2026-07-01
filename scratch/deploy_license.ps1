# scratch/deploy_license.ps1
# Skrip otomatisasi build & deploy License Server ke VPS

$ErrorActionPreference = "Stop"

Write-Host "[DEPLOY-LICENSE] Memulai proses deploy License Server..." -ForegroundColor Cyan

# 1. Bersihkan folder build sementara jika ada
$BuildDir = ".\scratch\license_build"
if (Test-Path $BuildDir) {
    Remove-Item $BuildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $BuildDir | Out-Null

# 2. Salin folder dan file yang diperlukan
Write-Host "[DEPLOY-LICENSE] Menyalin file-file server..." -ForegroundColor Yellow
$FoldersToCopy = @("config", "public", "routes", "utils", "views")
foreach ($folder in $FoldersToCopy) {
    if (Test-Path ".\license-server\$folder") {
        New-Item -ItemType Directory -Path "$BuildDir\$folder" | Out-Null
        Copy-Item -Path ".\license-server\$folder\*" -Destination "$BuildDir\$folder\" -Recurse -Force
    }
}

$FilesToCopy = @("server.js", "package.json")
foreach ($file in $FilesToCopy) {
    if (Test-Path ".\license-server\$file") {
        Copy-Item -Path ".\license-server\$file" -Destination "$BuildDir\" -Force
    }
}

# 3. Kompresi menjadi ZIP
Write-Host "[DEPLOY-LICENSE] Mengompres berkas menjadi ZIP..." -ForegroundColor Yellow
$ZipFile = ".\scratch\license_build.zip"
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile -Force
}
Compress-Archive -Path "$BuildDir\*" -DestinationPath $ZipFile -Force
Write-Host "[DEPLOY-LICENSE] Kompresi selesai ($ZipFile)." -ForegroundColor Green

# 4. Unggah ke VPS
Write-Host "[DEPLOY-LICENSE] Mengunggah license_build.zip ke VPS..." -ForegroundColor Yellow
scp -i nginxonly.pem -o StrictHostKeyChecking=no $ZipFile asepsuryadi@103.103.22.144:/home/asepsuryadi/license_build.zip
if ($LASTEXITCODE -ne 0) {
    Write-Host "[DEPLOY-LICENSE] Gagal mengunggah ke VPS!" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[DEPLOY-LICENSE] Berhasil diunggah ke VPS!" -ForegroundColor Green

# 5. Ekstraksi dan instalasi di VPS
Write-Host "[DEPLOY-LICENSE] Mengekstrak di VPS, install dependency, dan restart PM2..." -ForegroundColor Yellow
$SSHCommand = @"
sudo unzip -o /home/asepsuryadi/license_build.zip -d /var/www/licensing-server/ ;
sudo chown -R asepsuryadi:asepsuryadi /var/www/licensing-server/ ;
cd /var/www/licensing-server/ ;
npm install --production ;
sudo pm2 restart licensing-server ;
rm -f /home/asepsuryadi/license_build.zip
"@

ssh -i nginxonly.pem -o StrictHostKeyChecking=no asepsuryadi@103.103.22.144 $SSHCommand
if ($LASTEXITCODE -ne 0) {
    Write-Host "[DEPLOY-LICENSE] Gagal menjalankan perintah di VPS!" -ForegroundColor Red
    exit $LASTEXITCODE
}
Write-Host "[DEPLOY-LICENSE] Ekstraksi & restart PM2 selesai!" -ForegroundColor Green

# 6. Bersihkan temporary files di lokal
Remove-Item $BuildDir -Recurse -Force
Remove-Item $ZipFile -Force

Write-Host "[DEPLOY-LICENSE] DEPLOY LICENSE SERVER SUKSES DAN ONLINE!" -ForegroundColor Green
