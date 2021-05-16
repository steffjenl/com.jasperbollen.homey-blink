'use strict';

const Homey = require('homey');
const Promise = require('promise');
const BlinkAPI = require('./lib/blinkapi');

class BlinkApp extends Homey.App {
    async onInit() {

        this.api = new BlinkAPI();

        if (!Homey.ManagerSettings.get('BlinkUid')) {
            Homey.ManagerSettings.set('BlinkUid', this.api.generate_uid(16))
        }
        if (!Homey.ManagerSettings.get('BlinkNotificationKey')) {
            Homey.ManagerSettings.set('BlinkNotificationKey', this.api.generate_uid(152))
        }

        // Enable remote debugging, if applicable
        if (Homey.env.DEBUG === "true") {
            // eslint-disable-next-line global-require
            require('inspector').open(9229, '0.0.0.0');
        }

        this.log('App is running...');
        this.GetToken().then(response => {
            this.CheckMotion().catch(error => this.error(error));
            this.MotionLoop();
            this.RefreshAuthToken();
        }).catch(error => this.error(error));

        let ArmNetwork = new Homey.FlowCardAction('arm_network');
        ArmNetwork
            .register()
            .registerRunListener((args, state) => {
                this.Arm().catch(error => this.error(error));
                return true;
            })

        let DisArmNetwork = new Homey.FlowCardAction('disarm_network');
        DisArmNetwork
            .register()
            .registerRunListener((args, state) => {

                this.Disarm().catch(error => this.error(error));
                return true;
            })
    }

    getBlinkUid() {
        return Homey.ManagerSettings.get('BlinkUid');
    }

    getBlinkNotificationKey() {
        return Homey.ManagerSettings.get('BlinkNotificationKey');
    }


    //Login
    GetToken() {
        return new Promise((resolve, reject) => {
            let username = Homey.ManagerSettings.get('BlinkUsername');
            let password = Homey.ManagerSettings.get('BlinkPassword');
            let uid = Homey.ManagerSettings.get('BlinkUid');
            let notificationKey = Homey.ManagerSettings.get('BlinkNotificationKey');

            if (username == null) {
                this.log("No username has been set");
            } else {
               this.api.login(username, password, uid, notificationKey).then(data => {
                   const authtoken = data.auth.token;
                   const accountId = data.account.id;
                   const regionCode = data.account.tier;
                   Homey.ManagerSettings.set('authtoken', authtoken);
                   Homey.ManagerSettings.set('accountId', accountId);
                   Homey.ManagerSettings.set('region', regionCode);
                   return resolve(data);
               }).catch(error => reject(error));
            }
        });
    }

    async GetAuthToken() {
        let authtoken = Homey.ManagerSettings.get('authtoken');
        const parent = this;

        if (!authtoken) {
            return new Promise(function (fulfill, reject) {
                authtoken = parent.GetToken();
                fulfill(authtoken);
            });
        } else {
            return new Promise(function (fulfill, reject) {
                fulfill(authtoken);
            });
        }
    }

    async GetAccountId() {
        let accountId = Homey.ManagerSettings.get('accountId');

        if (!accountId) {
            return new Promise(function (fulfill, reject) {
                fulfill(accountId);
            });
        } else {
            return new Promise(function (fulfill, reject) {
                fulfill(accountId);
            });
        }
    }

    async GetRegion() {
        let region = Homey.ManagerSettings.get('region');
        const parent = this;

        if (!region) {
            return new Promise(function (fulfill, reject) {
                fulfill(region);
            });
        } else {
            return new Promise(function (fulfill, reject) {
                fulfill(region);
            });
        }
    }

    //Get info about sync network
    async GetNetworks() {
        return new Promise(function (resolve, reject) {

            const payload = {
            }

            let endpoint = "/networks";
            Homey.app.api._get(endpoint, payload).then(response => {
                const result = JSON.parse(response);
                if (result == null) {
                    reject("Error during deserialization: " + response);
                } else {
                    var networkID = result.networks[0];
                    resolve(networkID);
                    Homey.ManagerSettings.set('network', networkID);
                }
            }).catch(error => reject(error));
        });
    }

    //Get latest video
    LatestVideo() {
        var accountId = this.GetAccountId().catch(error => this.error(error));
        return new Promise(function (resolve, reject) {

            const payload = {
                since: '2011-06-23',
                page: 0
            }

            let endpoint = "/api/v1/accounts/" + accountId + "/media/changed";
            Homey.app.api._get(endpoint, payload).then(response => {
                const result = JSON.parse(response);
                const latestvideo = result.media[0];
                if (latestvideo == null) {
                    resolve(latestvideo);
                } else {
                    resolve(latestvideo);
                }

            }).catch(error => reject(error));
        });
    }

    //Get Camera's
    GetCameras() {
        // const accountId = Homey.app.GetAccountId().catch(error => this.error(error));
        const accountId = Homey.ManagerSettings.get('accountId');
        return new Promise(function (resolve, reject) {

            let endpoint = "/api/v3/accounts/" + accountId + "/homescreen";
            Homey.app.api._get(endpoint, null, false).then(response => {
                const result = JSON.parse(response);
                if (result == null) {
                     reject("Error during deserialization: " + result);
                } else {
                        var devices = [];
                        var networks = [];
                        for (var i = 0; i < result.networks.length; i++) {
                            networks[result.networks[i].id] = result.networks[i].name;
                        }
                        for (var i = 0; i < result.cameras.length; i++) {
                            let device_list = result.cameras[i];
                            //if (device_list.device_type !== 'camera') continue;
                            //console.log(device_list);
                            var device = {
                                "name": device_list.name + ' (' + networks[device_list.network_id] + ')',
                                "data": {
                                    "id": device_list.id
                                }
                            }
                            devices.push(device);
                        }
                        resolve(devices);
                    }
            }).catch(error => reject(error));
        });
    }

    //Get Camera info
    GetCamera(CameraID) {
        const accountId = Homey.ManagerSettings.get('accountId');
        return new Promise(function (resolve, reject) {

            let endpoint = "/api/v3/accounts/" + accountId + "/homescreen";
            Homey.app.api._get(endpoint, null, false).then(response => {
                const result = JSON.parse(response);
                if (result == null) {
                    reject("Error during deserialization: " + result);
                } else {
                    let cameraFound = false;
                    if (result == null) {
                        resolve(body);
                    } else {
                        let networkNames = [];
                        let networkArmed = []
                        for (var i = 0; i < result.networks.length; i++) {
                            networkNames[result.networks[i].id] = result.networks[i].name;
                            networkArmed[result.networks[i].id] = result.networks[i].armed;
                        }

                        for (var i = 0; i < result.cameras.length; i++) {
                            let Camera_info = result.cameras[i];
                            //if (Camera_info.device_type !== 'camera') continue;
                            if (CameraID === Camera_info.id) {
                                cameraFound = true;
                                Camera_info.armed = networkArmed[Camera_info.network_id];
                                Camera_info.network_name = networkNames[Camera_info.network_id];
                                resolve(Camera_info);
                            }
                        }
                    }
                    if (!cameraFound) {
                        reject("Camera not found: " + response);
                    }
                    resolve();
                }
            }).catch(error => reject(error));
        });
    }

    GetOwls() {
        // const accountId = Homey.app.GetAccountId().catch(error => this.error(error));
        const accountId = Homey.ManagerSettings.get('accountId');
        return new Promise(function (resolve, reject) {

            let endpoint = "/api/v3/accounts/" + accountId + "/homescreen";
            Homey.app.api._get(endpoint, null, false).then(response => {
                const result = JSON.parse(response);
                if (result == null) {
                    reject("Error during deserialization: " + result);
                } else {
                    var devices = [];
                    var networks = [];
                    for (var i = 0; i < result.networks.length; i++) {
                        networks[result.networks[i].id] = result.networks[i].name;
                    }
                    for (var i = 0; i < result.owls.length; i++) {
                        let device_list = result.owls[i];
                        //if (device_list.device_type !== 'camera') continue;
                        //console.log(device_list);
                        var device = {
                            "name": device_list.name + ' (' + networks[device_list.network_id] + ')',
                            "data": {
                                "id": device_list.id
                            }
                        }
                        devices.push(device);
                    }
                    resolve(devices);
                }
            }).catch(error => reject(error));
        });
    }

    //Get Owl info
    GetOwl(CameraID) {
        const accountId = Homey.ManagerSettings.get('accountId');
        return new Promise(function (resolve, reject) {

            let endpoint = "/api/v3/accounts/" + accountId + "/homescreen";
            Homey.app.api._get(endpoint, null, false).then(response => {
                const result = JSON.parse(response);
                if (result == null) {
                    reject("Error during deserialization: " + result);
                } else {
                    let cameraFound = false;
                    if (result == null) {
                        resolve(body);
                    } else {
                        let networkNames = [];
                        let networkArmed = []
                        for (var i = 0; i < result.networks.length; i++) {
                            networkNames[result.networks[i].id] = result.networks[i].name;
                            networkArmed[result.networks[i].id] = result.networks[i].armed;
                        }

                        for (var i = 0; i < result.owls.length; i++) {
                            let Camera_info = result.owls[i];
                            //if (Camera_info.device_type !== 'camera') continue;
                            if (CameraID === Camera_info.id) {
                                cameraFound = true;
                                Camera_info.armed = networkArmed[Camera_info.network_id];
                                Camera_info.network_name = networkNames[Camera_info.network_id];
                                resolve(Camera_info);
                            }
                        }
                    }
                    if (!cameraFound) {
                        reject("Camera not found: " + response);
                    }
                    resolve();
                }
            }).catch(error => reject(error));
        });
    }

    //Enable Motion for cam
    EnableMotion(cameraID) {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/enable";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Disable motion for cam
    DisableMotion(cameraID) {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/disable";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Disarm the system
    Disarm() {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/network/" + networkID + "/disarm";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Network disarmed');
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Arm the system
    Arm() {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/network/" + networkID + "/arm";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Network armed');
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Capture a video
    Capture_vid(Camera) {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/network/" + networkID + "/camera/" + Camera + "/clip";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
     }

    //Capture a snapshot
    Capture_snap(Camera) {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/network/" + networkID + "/camera/" + Camera + "/thumbnail";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Created snapshot for camera ' + Camera);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Capture a snapshot
    CaptureOwl_snap(Camera) {
        const self = this;
        return new Promise(function (resolve, reject) {
            const networks = self.GetNetworks().then(networks => {
                const networkID = networks.id;

                const payload = {

                }

                let endpoint = "/api/v1/accounts/" + Homey.app.api._account.id +"/networks/" + networkID + "/owls/" + Camera + "/thumbnail";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Created snapshot for camera ' + Camera);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Update settings for motion detection
    CheckMotion() {
        return new Promise((resolve, reject) => {
            //Get Last Motion
            let vid = this.LatestVideo().catch(error => reject(error));;
            //Save motion info
            if (typeof vid !== "undefined") {
                let EventDate = Date.parse(vid.updated_at);
                let EventCamID = vid.device_id;

                Homey.ManagerDrivers.getDriver('BlinkIndoorCamera').ParseTriggerData(EventCamID, EventDate);
            } else {
                let EventDate = Date.parse("01-01-1900");
                let EventCamID = "00000";

                Homey.ManagerDrivers.getDriver('BlinkIndoorCamera').ParseTriggerData(EventCamID, EventDate);
            }
            resolve(vid);
        });
    }

    MotionLoop() {
        setInterval(() => {
            this.CheckMotion().catch(error => this.error(error));
            //console.log("Motion check has ran");
        }, 5000);
    }

    RefreshAuthToken() {
        setInterval(() => {
            this.GetToken().catch(error => this.error(error));
            this.log("A new authtoken has been requested");
        }, 43200000);
    }
}

module.exports = BlinkApp;
