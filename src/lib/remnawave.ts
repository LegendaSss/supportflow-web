export class RemnaWaveService {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = process.env.REMNAWAVE_URL || '';
        this.apiKey = process.env.REMNAWAVE_API_KEY || '';
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        if (!this.baseUrl || !this.apiKey) {
            throw new Error('RemnaWave configuration missing in .env');
        }

        const { spawnSync } = require('child_process');
        const url = `${this.baseUrl}${endpoint}`;
        const method = options.method || 'GET';

        const fs = require('fs');
        const path = require('path');
        const os = require('os');

        let tempFilePath = null;
        if (options.body) {
            tempFilePath = path.join(os.tmpdir(), `rw_request_${Date.now()}.json`);
            fs.writeFileSync(tempFilePath, options.body);
        }

        const scriptPath = path.join(os.tmpdir(), `rw_script_${Date.now()}.ps1`);
        const psScript = `
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$headers = @{
    "Authorization" = "Bearer ${this.apiKey}"
    "X-Api-Key" = "${this.apiKey}"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    "Accept" = "application/json"
}
$body = $null
if ("${tempFilePath ? tempFilePath.replace(/\\/g, '/') : ''}") {
    $body = Get-Content -Path "${tempFilePath ? tempFilePath.replace(/\\/g, '/') : ''}" -Raw -Encoding UTF8
}
try {
    $params = @{
        Uri = "${url}"
        Method = "${method}"
        Headers = $headers
    }
    if ($body) {
        $params.Body = $body
        $params.ContentType = "application/json"
    }
    $response = Invoke-RestMethod @params
    if ($null -eq $response) { 
        Write-Output "" 
    } else {
        $response | ConvertTo-Json -Depth 10 | Write-Output
    }
} catch {
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorResponse = $_.Exception.Response.GetResponseStream() 
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $out = $reader.ReadToEnd()
        Write-Output "---API_ERROR_START---"
        Write-Output $out
        Write-Output "---API_ERROR_END---"
        Write-Error "[RemnaWave-PSBridge API-Error $statusCode] $out"
    } else {
        Write-Error "[RemnaWave-PSBridge Network-Error] $($_.Exception.Message)"
    }
    exit 1
} finally {
    if ("${tempFilePath ? tempFilePath.replace(/\\/g, '/') : ''}") { 
        Remove-Item -Path "${tempFilePath ? tempFilePath.replace(/\\/g, '/') : ''}" -ErrorAction SilentlyContinue 
    }
}
`;
        fs.writeFileSync(scriptPath, psScript, { encoding: 'utf8' });

        console.log(`[RemnaWave-PSBridge] ${method} ${url}`);

        const result = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { encoding: 'utf8' });

        // Clean up script
        try { fs.unlinkSync(scriptPath); } catch (e) { }

        if (result.status !== 0) {
            let errorBody = 'No error body';
            const logOut = result.stdout || '';
            if (logOut.includes('---API_ERROR_START---')) {
                errorBody = logOut.split('---API_ERROR_START---')[1].split('---API_ERROR_END---')[0].trim();
            }

            console.error(`[RemnaWave-PSBridge Fatal Error]:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}\nBODY: ${errorBody}`);
            throw new Error(`RemnaWave API Bridge Error: ${result.stderr} | Body: ${errorBody}`);
        }

        if (!result.stdout || result.stdout.trim() === '') {
            return null;
        }

        try {
            const cleanStdout = result.stdout.split('---API_ERROR_START---')[0].trim();
            const parsed = JSON.parse(cleanStdout);
            if (parsed && typeof parsed === 'object' && 'response' in parsed) {
                return parsed.response;
            }
            return parsed;
        } catch (e) {
            return result.stdout.trim() || null;
        }
    }



    async createUser(telegramId: string, trafficLimitGb: number = 0, expiryDate: Date | null = null, description: string = '', squadIds: string[] = []) {
        // Use a very far future date if no expiry is provided, as it seems to be required
        const finalExpiry = expiryDate || new Date('2099-12-31T23:59:59Z');

        // Including Z and milliseconds just in case
        const isoString = finalExpiry.toISOString();

        const data: any = {
            username: `user_${telegramId}`,
            status: 'ACTIVE',
            trafficLimitBytes: trafficLimitGb > 0 ? Math.floor(trafficLimitGb * 1073741824) : 0,
            trafficLimitStrategy: 'NO_RESET',
            telegramId: parseInt(telegramId),
            description: description,
            expireAt: isoString
        };

        if (squadIds && squadIds.length > 0) {
            data.activeInternalSquads = squadIds;
        }

        const user = await this.request('/api/users', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        return user;
    }

    async getSquads() {
        const squads = await this.request('/api/internal-squads');
        if (squads && Array.isArray(squads.internalSquads)) {
            return squads.internalSquads;
        }
        return [];
    }


    async linkSquadsToUser(userUuid: string, squadIds: string[]) {
        return this.updateUser(userUuid, {
            activeInternalSquads: squadIds
        });
    }

    async updateUser(uuid: string, data: any) {
        return this.request('/api/users', {
            method: 'PATCH',
            body: JSON.stringify({
                uuid: uuid,
                ...data
            }),
        });
    }

    async getUserByTelegramId(telegramId: string) {
        try {
            const resp = await this.request(`/api/users/by-telegram-id/${telegramId}`);
            if (resp && Array.isArray(resp) && resp.length > 0) {
                return resp[0]; // Return the first matched user 
            }
            return null;
        } catch (error: any) {
            if (error.message && error.message.includes('404')) {
                return null;
            }
            throw error;
        }
    }

    async getUserSubscriptionUrl(userUuid: string, publicUrl: string = '', shortUuid?: string) {
        let finalShortUuid = shortUuid;

        // If shortUuid is not provided, fetch the user to get it
        if (!finalShortUuid) {
            const user = await this.getUserByUuid(userUuid);
            if (user && user.shortUuid) {
                finalShortUuid = user.shortUuid;
            } else {
                return null;
            }
        }

        const envPublicUrl = process.env.REMNAWAVE_PUBLIC_URL || '';
        const base = publicUrl || envPublicUrl || this.baseUrl;

        // If base is NOT the same as our panel API URL, assume it's a dedicated sub domain
        // Dedicated sub domains typically don't need /api/sub/ prefix
        if (base && base !== this.baseUrl && !base.includes('go.ooo.limo')) {
            return `${base.replace(/\/$/, '')}/${finalShortUuid}`;
        }

        // For the main panel domain, we MUST use /api/sub/ to bypass Cloudflare 403
        return `${base.replace(/\/$/, '')}/api/sub/${finalShortUuid}`;
    }

    async getUserByUuid(uuid: string) {
        return this.request(`/api/users/${uuid}`);
    }

    async getUsers() {
        return this.request('/api/users');
    }

    async deleteUser(uuid: string) {
        return this.request(`/api/users/${uuid}`, {
            method: 'DELETE'
        });
    }

    async resetUserTraffic(uuid: string) {
        return this.request(`/api/users/${uuid}/reset-traffic`, {
            method: 'POST'
        });
    }

    async resetUserHwid(uuid: string) {
        return this.request(`/api/hwid/devices/delete-all`, {
            method: 'POST',
            body: JSON.stringify({ userUuid: uuid })
        });
    }
}

export const remnawave = new RemnaWaveService();
