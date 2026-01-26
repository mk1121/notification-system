const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class TeletalkSmsClient {
    constructor(config) {
        this.user = this.requireNonEmpty(config.user, 'user');
        this.userId = config.userId;
        this.encrKey = this.requireNonEmpty(config.encrKey, 'encrKey');
        this.baseUrl = config.baseUrl;
        
        // Check if password is already MD5 (32 hex chars) or plain text
        const password = this.requireNonEmpty(config.password, 'password');
        if (/^[0-9a-f]{32}$/i.test(password)) {
            this.passMd5 = password.toLowerCase();
        } else {
            this.passMd5 = this.md5Hex(password);
        }
        
        console.log('TeletalkSmsClient (JSON) initialized');
    }

    /**
     * Send SMS with auto-generated p_key
     */
    async sendSms(msisdn, text, smsClass = 'GENERAL') {
        const pKey = this.generatePKey16();
        return await this.sendSmsWithAKey(msisdn, text, smsClass, pKey);
    }

    /**
     * Send SMS with specific p_key
     */
    async sendSmsWithAKey(msisdn, text, smsClass, fixedPKey) {
        const charset = this.isAscii(text) ? 'ASCII' : 'UTF-8';
        const pKey = this.requireNonEmpty(fixedPKey, 'p_key');
        const aKey = this.computeAKey(pKey);

        const params = {
            op: 'SMS',
            user: this.user,
            pass: this.passMd5,
            p_key: pKey,
            a_key: aKey,
            mobile: msisdn,
            charset: charset,
            sms: text
        };

        if (smsClass && smsClass.trim()) {
            params.smsclass = smsClass;
        }

        const json = JSON.stringify(params);
        console.log('REQ JSON:', json);
        
        return await this.postJson(this.baseUrl, json);
    }

    /**
     * Get account balance
     */
    async getBalance() {
        const params = {
            op: 'BALANCE',
            user: this.user,
            pass: this.passMd5
        };

        const json = JSON.stringify(params);
        console.log('BALANCE JSON:', json);
        
        return await this.postJson(this.baseUrl, json);
    }

    /**
     * Generate 16-digit p_key
     */
    generatePKey16() {
        const base = 1000000000000000n; // 10^15
        const span = 9000000000000000n; // 9 * 10^15
        const random = BigInt(Math.floor(Math.random() * Number(span)));
        const n = base + random;
        return n.toString().padStart(16, '0');
    }

    /**
     * Compute a_key from p_key
     */
    computeAKey(pKey16) {
        const p = BigInt(this.requireNonEmpty(pKey16, 'p_key'));
        const sum = p + BigInt(this.userId);
        const source = sum.toString() + this.encrKey;
        return this.md5Hex(source);
    }

    /**
     * Calculate MD5 hash
     */
    md5Hex(str) {
        if (str == null) {
            throw new Error('md5Hex: input is null');
        }
        return crypto.createHash('md5').update(str, 'utf8').digest('hex');
    }

    /**
     * Check if string is ASCII only
     */
    isAscii(str) {
        if (!str) return true;
        for (let i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) > 0x7F) return false;
        }
        return true;
    }

    /**
     * Validate non-empty string
     */
    requireNonEmpty(value, name) {
        if (!value || value.toString().trim().length === 0) {
            throw new Error(`Missing required value: ${name}`);
        }
        return value;
    }

    /**
     * HTTP POST with JSON body
     */
    postJson(urlStr, jsonBody) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(urlStr);
            const protocol = parsedUrl.protocol === 'https:' ? https : http;

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
                path: parsedUrl.pathname + parsedUrl.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Accept': 'application/json, */*;q=0.8',
                    'Content-Length': Buffer.byteLength(jsonBody)
                },
                timeout: 20000
            };

            const req = protocol.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    console.log('Response Status:', res.statusCode);
                    console.log('Response Body:', data);
                    resolve(data);
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(jsonBody);
            req.end();
        });
    }
}

module.exports = TeletalkSmsClient;
