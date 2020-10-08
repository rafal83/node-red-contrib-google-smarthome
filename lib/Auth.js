/**
 * NodeRED Google SmartHome
 * Copyright (C) 2018 Michael Jacobsen.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const storage        = require('node-persist');
const fs             = require('fs');
const TokenGenerator = require('uuid-token-generator');

/******************************************************************************************************************
 * Auth
 *
 */
class Auth {
    constructor() {
        this._clientId     = "";
        this._clientSecret = "";
        this._username     = "";
        this._password     = "";
        this._authCode     = null;
        this._auth         = null;
        this._authFilename = null;
        this._tokenGen     = new TokenGenerator(256, TokenGenerator.BASE58);
    }
    //
    //
    //
    loadAuth(nodeId, userDir) {
        let me = this;

        try {
            me._authFilename = userDir + '/google-smarthome-auth-' + nodeId + '.json';

            me._migrateOldStorageLocation();

            let authFile = fs.readFileSync(me._authFilename);
            me._auth = JSON.parse(authFile);

            if (typeof me._auth === 'undefined') {
                me.debug('Auth:loadAuth(): data not persisted, create new');

                me._auth = {
                    accessToken: this.genRandomString(),
                    refreshToken: this.genRandomString(),
                };

                me._persistAuth();

                me.debug('Auth:loadAuth(): new auth data created = ' + JSON.stringify(me._auth));
            } else {
                me.debug('Auth:loadAuth(): data already persisted');
                this._migrateOldStorageFormat();
                me.debug('Auth:loadAuth(): me._auth = ' + JSON.stringify(me._auth));
            }
        }
        catch (err) {
            me.debug('Auth:loadAuth(): err: ' + err);
            process.nextTick(() => {
                me.emitter.emit('auth', 'error', err);
            });
        }
    }
    //
    //
    //
    setJwtKey(jwtkey) {
        let jk       = fs.readFileSync(jwtkey);
        this._jwtkey = JSON.parse(jk.toString());
    }
    //
    //
    //
    setClientIdSecret(clientid, clientsecret) {
        this._clientId     = clientid;
        this._clientSecret = clientsecret;
    }
    //
    //
    //
    setUsernamePassword(username, password) {
        this._username = username;
        this._password = password;
    }
    //
    //
    //
    isValidUser(username, password) {
        if (this._username !== username) {
            this.debug('Auth:isValidUser(): username does not match!');
            return false;
        }

        if (this._password !== password) {
            this.debug('Auth:isValidUser(): password does not match!');
            return false;
        }

        return true;
    }
    //
    //
    //
    generateAuthCode() {
        let authCode = this.genRandomString();

        this._authCode = {
            authCode: authCode,
            expiresAt: new Date(Date.now() + (60 * 10000)),
        };

        return authCode;
    }
    //
    //
    //
    isValidClient(clientId, clientSecret) {
        if (this._clientId !== clientId) {
            this.debug('Auth:isValidClient(): clientId does not match!');
            return false;
        }

        if (arguments.length == 2 && this._clientSecret !== clientSecret) {
            this.debug('Auth:isValidClient(): clientSecret does not match!');
            return false;
        }

        return true;
    }
    //
    //
    //
    exchangeAuthCode(code) {
        let authCode = this._authCode;

        if (!authCode || authCode.authCode !== code) {
            throw 'invalid code ' + code;
        }

        if (new Date(authCode.expiresAt) < Date.now()) {
            throw 'expired code; authCode = ' + JSON.stringify(authCode);
        }

        let accessToken = this._auth.accessToken;
        let refreshToken = this._auth.refreshToken;

        if (!accessToken || !refreshToken) {
            throw 'could not find accessToken and refreshToken';
        }

        this._authCode = null;

        return {
            token_type: 'bearer',
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }
    //
    //
    //
    isValidAccessToken(accessToken) {
        if (this._auth.accessToken === accessToken) {
            return true;
        } else {
            this.debug('Auth:isValidAccessToken(): accessToken = ' + JSON.stringify(accessToken));
            this.debug('Auth:isValidAccessToken(): this._auth = ' + JSON.stringify(this._auth));
            this.debug('Auth:isValidAccessToken(): invalid accessToken');
            return false;
        }
    }
    //
    //
    //
    isValidRefreshToken(refreshToken) {
        if (this._auth.refreshToken === refreshToken) {
            return true;
        } else {
            this.debug('Auth:isValidRefreshToken(): refreshToken = ' + JSON.stringify(refreshToken));
            this.debug('Auth:isValidRefreshToken(): this._auth = ' + JSON.stringify(this._auth));
            this.debug('Auth:isValidRefreshToken(): invalid refreshToken');
            return false;
        }
    }
    //
    //
    //
    getJwtClientEmail() {
        return this._jwtkey.client_email;
    }
    //
    //
    //
    getJwtPrivateKey() {
        return this._jwtkey.private_key;
    }
    //
    //
    //
    genRandomString() {
        return this._tokenGen.generate();
    }
    /******************************************************************************************************************
     * private methods
     *
     */
    _persistAuth() {
        try {
            fs.writeFileSync(this._authFilename, JSON.stringify(this._auth))
        }
        catch (err) {
            this.debug('Failed to write auth file: ' + err)
        }
    }
    //
    _migrateOldStorageLocation() {
        // In v0.0.32 we switched from node-persist to a plain file as auth storage. Migrate data to the new file if necessary.

        if(!fs.existsSync(this._authFilename)) {
            storage.initSync();
            this._auth = storage.getItemSync('auth_auth');

            if(this._auth) {
                this._persistAuth();
                storage.removeItem('auth_auth');

                this.debug('Auth:_migrateOldStorageLocation(): data migrated to new location');
            }
        }

    }
    //
    _migrateOldStorageFormat() {
        // Prior to v0.0.32 auth data was saved in another format. Migrate to new format if needed.

        if(typeof this._auth.tokens != 'undefined' && typeof this._auth.accessToken == 'undefined') {
            this._auth.accessToken = this._auth.tokens[Object.keys(this._auth.tokens)[0]].accessToken;
            this._auth.refreshToken = this._auth.tokens[Object.keys(this._auth.tokens)[0]].refreshToken;
            delete this._auth.tokens;
            this._persistAuth();
            this.debug('Auth:_migrateOldStorageFormat(): data migrated to new format');
        }

    }
}

module.exports = Auth;
