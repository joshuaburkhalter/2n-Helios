// imports
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import { logSub, logPull, fingerEnroll, fingerResult, userAccess, userDetails } from './helpers.js';

// import configs
dayjs.extend(utc);

// class constructor and methods
interface Helios {
    ip: string,
    user: string,
    pass: string,
    baseURL: string,
    httpsAgent: https.Agent,
    auth: {username: string, password: string},
    ax: AxiosInstance
}

class Helios {
    constructor(params: {ip: string, user: string, pass: string}) {
        this.ip = params.ip || '127.0.0.1',
        this.user = params.user || 'admin',
        this.pass = params.pass || 'admin',
        this.baseURL = `https://${this.ip}/api`,
        this.httpsAgent = new https.Agent({rejectUnauthorized: false}),
        this.auth = {username: this.user, password: this.pass},
        this.ax = axios.create({auth: this.auth, httpsAgent: this.httpsAgent, baseURL: this.baseURL})
    }

    /** Gets a log of successful entries within the specified days. */
    log = async (days=7)=> {
        const { subSuccess, id } = await logSub(days, this.ax);
        if (subSuccess) {
            const { pullSuccess, result } = await logPull(id, this.ax);
            if (pullSuccess) {
                return result.events.map((e: any) => {
                    return { name: e.params.name, date: dayjs.unix(e.utcTime).format('YYYY-MM-DD HH:mm')}
                });
            }
        }
    }

    /** Gets the status of the specified entry switch. */
    status = async (sw=1)=> {
        const { data } = await this.ax({ 
            url: `/switch/status`,
            method: 'get',
            params: {
                switch: sw
            }
        });
        if (data.success) {
            const target = data.result.switches[0];
            if (target.active && !target.held) {
                return 'Temporarily Opened'
            } else if (target.active && target.held) {
                return 'Unlocked'
            } else if (!target.active) {
                return 'Locked'
            }
        }
    }

    /** Opens, locks or unlocks the specified entry switch. */
    switch = async (action: "open" | "lock" | "unlock", sw=1)=> {
        let act = '';
        let msg = '';
        switch (action) {
            case 'lock':
                act = 'release';
                msg = 'locked';
                break;
            case 'unlock':
                act = 'hold';
                msg = 'unlocked';
                break;
            case 'open':
                act = 'trigger';
                msg = 'opened';
        };
        const { data } = await this.ax({ 
            url: `/switch/ctrl`,
            method: 'get',
            params: {
                switch: sw,
                action: act
            }
        });
        if (data.success) {
            console.log(`Switch ${sw} ${msg}.`)
            return true
        }
    }

    /** Gets all users. */
    getUsers = async ()=> {
        const formData = new FormData();
        formData.append('blob-json', JSON.stringify({fields:['name', 'access.pin']}))
        const { data } = await this.ax({
            method: 'post',
            url: '/dir/query',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        if (data.success) {
            return data.result.users
        };
    }

    /** Gets a specified user based on it's uuid. */
    getUser = async (id: string)=> {
        const details = await userDetails(id, this.ax);
        return details;
    }

    removeUser = async (id: string)=> {
        const formData = new FormData();
        formData.append('blob-dir_new', JSON.stringify({users:[{uuid:id}]}));
        const { data } = await this.ax({
            method: 'put',
            url: '/dir/delete',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        if (data.success) {
            console.log('User deleted.');
            return true
        };
    }

    /** Updates a specified user's access pin or fingerprint. */
    updateUserAccess = async (id: string, params: {pin: number, fpt: string})=> {
        const didUpdate = await userAccess(id, params, this.ax);
        if (didUpdate) {
            console.log('User access updated.')
            return true
        }
    }

    /** Adds a new user. */
    addUser = async (name: string, email: string, pin: number)=> {
        const formData = new FormData();
        formData.append('blob-dir_new', JSON.stringify({users:[{name, email, access:{pin}}]}));
        const { data } = await this.ax({
            method: 'put',
            url: '/dir/create',
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        if (data.success) {
            console.log('User added.');
            return true
        };
    }

    /** Starts fingerprint enrollment and updates the specified user if successful. */
    enrollBio = async (id: string, finger=6, reader=2)=> {
        const { session }  = await fingerEnroll(reader, this.ax);
        if (session) {
            const intervalID = setInterval(async ()=> {
                const { success, result } = await fingerResult(session, this.ax);
                if (!success) {
                    if (result === 12) {
                        clearInterval(intervalID);
                        console.log('Finger enrollment failed.');
                        return false
                    }
                } else if (success) {
                    clearInterval(intervalID);
                    let fingerprint = result + '#fid=' + finger;
                    const details = await userDetails(id, this.ax);
                    if (details.access.fpt) {
                        fingerprint = fingerprint + ';' + details.access.fpt
                    }
                    const fingerUpdated = await userAccess(id, { fpt: fingerprint}, this.ax);
                    if (fingerUpdated) {
                        console.log('Fingerprint added.')
                    } else {
                        console.log('There was a problem updating.  Possible duplicate fingerprint.');
                    }
                }
            }, 3000);
        }
    }
}

export default Helios;