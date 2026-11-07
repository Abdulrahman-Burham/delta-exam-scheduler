$KEY = "C:\Users\abdul\Downloads\arg model\ar_key.pem"
$VM = "azureuser@20.46.50.255"
$REMOTE_BACKEND = "/home/azureuser/delta-exam-scheduler/backend"

Write-Host "1. Uploading backend files..." -ForegroundColor Cyan
scp -i $KEY -o StrictHostKeyChecking=no backend/app/api/students.py ${VM}:${REMOTE_BACKEND}/app/api/students.py
scp -i $KEY -o StrictHostKeyChecking=no backend/app/services/export_service.py ${VM}:${REMOTE_BACKEND}/app/services/export_service.py

Write-Host "2. Packaging and uploading frontend dist..." -ForegroundColor Cyan
if (Test-Path "frontend_dist.tar.gz") { Remove-Item "frontend_dist.tar.gz" }
tar -czf frontend_dist.tar.gz -C frontend/dist .
scp -i $KEY -o StrictHostKeyChecking=no frontend_dist.tar.gz ${VM}:/home/azureuser/frontend_dist.tar.gz

Write-Host "3. Extracting frontend and restarting service on VM..." -ForegroundColor Cyan
ssh -i $KEY -o StrictHostKeyChecking=no $VM "sudo tar -xzf /home/azureuser/frontend_dist.tar.gz -C /var/www/delta-exam-scheduler/frontend/dist/ && sudo systemctl restart delta-scheduler.service"

Write-Host "4. Checking service status..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
ssh -i $KEY -o StrictHostKeyChecking=no $VM "sudo systemctl status delta-scheduler.service --no-pager | head -15"

Write-Host "Deployment completed!" -ForegroundColor Green
