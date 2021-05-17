const Homey = require('homey');
const https = require('https');

let LOGIN_SERVER = 'rest-prod.immedia-semi.com';
let HTTPS_PORT = 443;

class BlinkAPI {
    constructor() {
        this._region = null;
        this._autToken = null;
        this._apiServer = null;
        this._clientId = null;
        this._account = null;
        this._pinCode = null;
        this._region = 'prde';
        this._autToken = '';
        this._client = { id: 782299, verification_required: true };
    }

    generate_uid(length) {
        //edit the token allowed characters
        var a = "abcdef1234567890".split("");
        var b = [];
        for (var i=0; i<length; i++) {
            var j = (Math.random() * (a.length-1)).toFixed(0);
            b[i] = a[j];
        }
        return b.join("");
    }

    _post(endpoint, payload, json = true, ignoreError = false, dontLogin = false) {
        return new Promise((resolve, reject) => {

            if (!dontLogin && this._autToken === '')
            {
                reject('[_get] Not logged in yet!');
            }

            if (json) {
                payload = JSON.stringify(payload);
            }

            const options = {
                host: (this._apiServer ? this._apiServer : LOGIN_SERVER),
                port: HTTPS_PORT,
                path: endpoint,
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                maxRedirects: 20,
                //rejectUnauthorized: false,
                keepAlive: false,
               //secureProtocol: 'TLSv1_2_method',
            };

            if (this._autToken) {
                options.headers['TOKEN_AUTH'] = this._autToken;
            }

            const req = https.request(options, res => {
                if (!ignoreError && res.statusCode !== 200) {
                    return reject(`Failed to POST to url: ${options.host}${options.path} (status code: ${res.statusCode})`);
                }
                res.setEncoding('utf8');
                const data = [];

                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    return resolve(data.join(''));
                });
            });

            req.on('error', (error) => reject(error));
            req.write(payload);
            req.end();
        });
    }

    _get(endpoint, payload, json = true) {
        return new Promise((resolve, reject) => {

            if (this._autToken === '')
            {
                reject('[_get] Not logged in yet!');
            }

            if (json) {
                payload = JSON.stringify(payload);
            }

            const options = {
                host: (this._apiServer ? this._apiServer : LOGIN_SERVER),
                port: HTTPS_PORT,
                path: `${endpoint}${this._toQueryString(payload)}`,
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                maxRedirects: 20,
                //rejectUnauthorized: false,
                keepAlive: false,
                //secureProtocol: 'TLSv1_2_method',
            };

            if (this._autToken) {
                options.headers['TOKEN_AUTH'] = this._autToken;
            }

            const req = https.request(options, res => {
                if (res.statusCode !== 200) {
                    return reject(`Failed to GET to url: ${options.host}${options.path} (status code: ${res.statusCode})`);
                }
                res.setEncoding('utf8');
                const data = [];

                res.on('data', chunk => data.push(chunk));
                res.on('end', () => {
                    return resolve(data.join(''));
                });
            });

            req.on('error', (error) => reject(error));
            req.end();
        });
    }

    _toQueryString(obj) {
        if (obj === null || typeof obj === 'undefined' || Object.keys(obj).length === 0) {
            return '';
        }
        return `?${Object.keys(obj)
            .map(k => `${k}=${encodeURIComponent(obj[k])}`)
            .join('&')}`;
    }

    login(username, password, uid, notification_key) {
        return new Promise((resolve, reject) => {
            const payload = {
 //               app_version: '6.0.7 (520300) #afb0be72a',
                client_name: 'Homey',
 //               client_type: 'android',
                device_identifier: 'Homey Blink App',
                email: username,
                notification_key: notification_key,
 //               os_version: '5.1.1',
                password: password,
                reauth: true,
                unique_id: uid
            }

            this._post('/api/v5/account/login', payload, true, false, true).then(response => {
                const result = JSON.parse(response);
                this._region = result.account.tier;
                this._autToken = result.auth.token;
                this._account = result.account;
                this._clientId = result.account.client_id;
                this._apiServer = "rest-" + this._region + ".immedia-semi.com";
                return resolve(result);
            }).catch(error => reject(error));
        });
    }

    verfy(pinCode) {
        return new Promise((resolve, reject) => {
            const payload = {
                pin: pinCode,
            }
            this._post(`/api/v4/account/${this._account.account_id}/client/${this._clientId}/pin/verify`, payload, true, true).then(response => {
                const result = JSON.parse(response);
               if (result.valid) {
                   return resolve(result);
               }
               console.log(result);
               return reject(new Error('Invalid pin'));
            }).catch(error => reject(error));
        });
    }

    user() {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            this._get(`/user`, payload).then(response => {
                const result = JSON.parse(response);
                return resolve(result);
            }).catch(error => reject(error));
        });
    }

    usage() {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            this._get(`/api/v1/camera/usage`, payload).then(response => {
                const result = JSON.parse(response);
                return resolve(result);
            }).catch(error => reject(error));
        });
    }

    camera(networkId, cameraId) {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            this._get(`/network/${networkId}/camera/${cameraId}`, payload).then(response => {
                const result = JSON.parse(response);
                return resolve(result);
            }).catch(error => reject(error));
        });
    }

    changed(since = '-999999999-01-01T00:00:00+18:00', page = '1') {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            this._get(`/api/v1/accounts/${this._account.account_id}/media/changed?since=${since}&page=${page}`, payload).then(response => {
                const result = JSON.parse(response);
                return resolve(result);
            }).catch(error => reject(error));
        });
    }

    networks() {
        return new Promise((resolve, reject) => {
            const payload = {
            }
            this._get(`/networks`, payload).then(response => {
                const result = JSON.parse(response);
                return resolve(result);
            }).catch(error => reject(error));
        });
    }



}

module.exports = BlinkAPI;
