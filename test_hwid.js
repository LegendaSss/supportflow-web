const { spawnSync } = require('child_process');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const uuid = 'feb47c80-6817-406d-8f23-0714a323c053';

function doReq(endpoint) {
    const scriptPath = path.join(os.tmpdir(), `rw_test_${Date.now()}.ps1`);
    const psScript = `
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$headers = @{ "Authorization" = "Bearer ${process.env.REMNAWAVE_API_KEY}"; "User-Agent" = "Mozilla/5.0" }
try {
    $res = Invoke-RestMethod -Uri "${process.env.REMNAWAVE_URL}${endpoint}" -Method GET -Headers $headers
    $res | ConvertTo-Json -Depth 5 | Write-Output
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
`;
    fs.writeFileSync(scriptPath, psScript);
    const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { encoding: 'utf8' });
    console.log('ENDPOINT:', endpoint);
    console.log(result.stdout.trim().substring(0, 1000));
}

doReq(`/api/users/${uuid}/hwid`);
doReq(`/api/users/${uuid}/devices`);
doReq(`/api/hwid`);
