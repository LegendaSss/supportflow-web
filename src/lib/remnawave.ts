// Bypass strict SSL for internal/self-signed VPN panel certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

        const url = `${this.baseUrl}${endpoint}`;
        const method = options.method || 'GET';

        const headers: Record<string, string> = {
            "Authorization": `Bearer ${this.apiKey}`,
            "X-Api-Key": this.apiKey,
            "User-Agent": "SupportFlow-Native/1.0",
            "Accept": "application/json",
            ...((options.headers as Record<string, string>) || {})
        };

        if (options.body) {
            headers["Content-Type"] = "application/json";
        }

        console.log(`[RemnaWave API] ${method} ${url}`);

        try {
            const fetchOptions: RequestInit = {
                ...options,
                method,
                headers,
                // In Next.js App Router, we usually want no-store for admin API calls unless explicitly cached
                cache: 'no-store'
            };

            const response = await fetch(url, fetchOptions);
            const text = await response.text();

            if (!response.ok) {
                console.error(`[RemnaWave API Error ${response.status}]:\nBODY: ${text}`);
                throw new Error(`RemnaWave API Error ${response.status}: ${text}`);
            }

            if (!text || text.trim() === '') {
                return null;
            }

            try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed === 'object' && 'response' in parsed) {
                    return parsed.response;
                }
                return parsed;
            } catch (e) {
                return text;
            }
        } catch (error: any) {
            console.error(`[RemnaWave Network Error]: ${error.message}`);
            throw error;
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
