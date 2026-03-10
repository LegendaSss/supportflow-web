const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

const baseUrl = process.env.REMNAWAVE_URL || 'https://go.ooo.limo';
const apiKey = process.env.REMNAWAVE_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiOGQxNzQ1MGMtZjA4MS00MGRkLTgwNjQtMzE3M2QyMzkzM2JkIiwidXNlcm5hbWUiOm51bGwsInJvbGUiOiJBUEkiLCJpYXQiOjE3NzIwNDgwMjIsImV4cCI6MTA0MTE5NjE2MjJ9.9Q6DdMUhL7K7eyaMWIkoKe9iYasWX9aNZJO1-Z7Xt3M';

const scriptPath = path.join(os.tmpdir(), `rw_script_${Date.now()}.ps1`);
const psScript = `
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$headers = @{
    "Authorization" = "Bearer ${apiKey}"
    "X-Api-Key" = "${apiKey}"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    "Accept" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "${baseUrl}/api/users/by-telegram-id/1495719377" -Method GET -Headers $headers
    $response | ConvertTo-Json -Depth 10 | Write-Output
} catch {
    Write-Output "---Error caught by catch block---"
    Write-Output $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Output "---API_ERROR_START---"
        Write-Output $reader.ReadToEnd()
        Write-Output "---API_ERROR_END---"
    }
    exit 1
}
`;

fs.writeFileSync(scriptPath, psScript, { encoding: 'utf8' });
console.log('Running:', scriptPath);
const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { encoding: 'utf8' });
console.log('STDOUT:', result.stdout);
console.log('STDERR:', result.stderr);
console.log('STATUS:', result.status);
