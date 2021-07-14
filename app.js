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
                   const accountId = data.account.account_id;
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
                    //var networkID = result.networks[0];
                    var networkID = result.networks;
                    resolve(networkID);
                    Homey.ManagerSettings.set('network', networkID);
                }
            }).catch(error => reject(error));
        });
    }

    //Get info about sync network
    async GetCameraNetwork() {
        return new Promise(function (resolve, reject) {

            const payload = {
            }

            let endpoint = "/networks";
            Homey.app.api._get(endpoint, payload).then(response => {
                const result = JSON.parse(response);
                if (result == null) {
                    reject("Error during deserialization: " + response);
                } else {
                    //var networkID = result.networks[0];
                    var networkID = result.networks;
                    resolve(networkID);
                    Homey.ManagerSettings.set('network', networkID);
                }
            }).catch(error => reject(error));
        });
    }
    
    //Get latest video
    LatestVideo() {
        // var accountId = this.GetAccountId().catch(error => this.error(error));
        const accountId = Homey.ManagerSettings.get('accountId');
        return new Promise(function (resolve, reject) {

            const payload = {
                since: '2011-06-23',
                page: 0
            }

            let endpoint = "/api/v1/accounts/" + accountId + "/media/changed";
            Homey.app.api._get(endpoint, payload, false).then(response => {
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
            self.GetCamera(cameraID).then(camera => {
                const networkID = camera.network_id;

                const payload = {

                }
                self.log("EnableMotion() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/enable";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Motion ensabled for camera '+cameraID);
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
            self.GetCamera(cameraID).then(camera => {
                const networkID = camera.network_id;

                const payload = {

                }
                self.log("DisableMotion() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/disable";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Motion disabled for camera '+cameraID);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    /** 
     * Enable Motion for cam BlinkMini
     * Currently, no API endpoint is known
     */
    EnableMotionOwl(cameraID) {
        const accountId = Homey.ManagerSettings.get('accountId');
        const self = this;
        return new Promise(function (resolve, reject) {
            self.GetOwl(cameraID).then(camera => {
                const networkID = camera.network_id;

                const payload = {
                    
                }
                self.log("EnableMotionOwl() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/enable";
                //let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/arm";

                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Motion enabled for camera '+cameraID);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    /** 
     * Disanable Motion for cam BlinkMini
     * Currently, no API endpoint is known
     */
     DisableMotionOwl(cameraID) {
        const accountId = Homey.ManagerSettings.get('accountId');
        const self = this;
        return new Promise(function (resolve, reject) {
            self.GetOwl(cameraID).then(camera => {
                const networkID = camera.network_id;

                const payload = {
                   
                }

                self.log("DisableMotionOwl() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/disable";
                //let endpoint = "/api/v1/accounts/" + accountId + "/network/" + networkID + "/owls/" + cameraID + "/config";
                
                Homey.app.api._post(endpoint), payload.then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Motion disabled for camera '+cameraID);
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
            self.GetNetworks().then(networks => {
                networks.forEach( network =>{
                    const networkID = network.id;
                    const payload = {

                    }

                    self.log('Disarm Network ' + networkID);
                    let endpoint = "/network/" + networkID + "/disarm";
                    Homey.app.api._post(endpoint, payload).then(response => {
                        const result = JSON.parse(response);
                        if (result == null) {
                            reject("Error during deserialization: " + response);
                        } else {
                            self.log('Network '+networkID+' disarmed');
                            resolve();
                        }
                    }).catch(error => reject(error));
                });
            }).catch(error => reject(error));
        });
    }

    //Arm the system
    Arm() {
        const self = this;
        return new Promise(function (resolve, reject) {
           self.GetNetworks().then(networks => {
                networks.forEach( network =>{
                    const networkID = network.id;
                    const payload = {

                    }

                    self.log('Arm Network ' + networkID);
                    let endpoint = "/network/" + networkID + "/arm";
                    Homey.app.api._post(endpoint, payload).then(response => {
                        const result = JSON.parse(response);
                        if (result == null) {
                            reject("Error during deserialization: " + response);
                        } else {
                            self.log('Network '+networkID+' armed');
                            resolve();
                        }
                    }).catch(error => reject(error));
                });
            }).catch(error => reject(error));
        });
    }

    //Capture a video
    Capture_vid(cameraID) {
        const self = this;
        return new Promise(function (resolve, reject) {
            self.GetCamera(cameraID).then(camera => {
                const networkID = camera.network_id;

                const payload = {

                }
                self.log("Capture_vid() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/clip";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Created video for camera ' + cameraID);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
     }

    //Capture a video (BlinkMini)
    CaptureOwl_vid(cameraID) {
        const accountId = Homey.ManagerSettings.get('accountId');
        const self = this;
        return new Promise(function (resolve, reject) {
            self.GetOwl(cameraID).then(camera => {
                const networkID = camera.network_id;
                const payload = {

                }
                self.log("CaptureOwl_vid() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/api/v1/accounts/" + accountId +"/networks/" + networkID + "/owls/" + cameraID + "/clip";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Created video for camera ' + cameraID);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
     }

    //Capture a snapshot
    Capture_snap(cameraID) {
        const self = this;
        return new Promise(function (resolve, reject) {
            self.GetCamera(cameraID).then(camera => {
                const networkID = camera.network_id;
                const payload = {

                }
                self.log("Capture_snap() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/network/" + networkID + "/camera/" + cameraID + "/thumbnail";
                Homey.app.api._post(endpoint, payload).then(response => {
                    //self.log(response);
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Created snapshot for camera ' + cameraID);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Capture a snapshot (BlinkMini)
    CaptureOwl_snap(cameraID) {
        const accountId = Homey.ManagerSettings.get('accountId');
        const self = this;
        return new Promise(function (resolve, reject) {
            self.GetOwl(cameraID).then(camera => {
                const networkID = camera.network_id;
                const payload = {

                }
                self.log("CaptureOwl_snap() => CameraID "+cameraID+" NetworkID "+networkID);
                let endpoint = "/api/v1/accounts/" + accountId +"/networks/" + networkID + "/owls/" + cameraID + "/thumbnail";
                Homey.app.api._post(endpoint, payload).then(response => {
                    const result = JSON.parse(response);
                    if (result == null) {
                        reject("Error during deserialization: " + response);
                    } else {
                        self.log('Created snapshot for camera ' + cameraID);
                        resolve();
                    }
                }).catch(error => reject(error));
            }).catch(error => reject(error));
        });
    }

    //Update settings for motion detection
    // CheckMotion() {
    //     return new Promise((resolve, reject) => {
    //         //Get Last Motion
    //         let vid = this.LatestVideo().catch(error => reject(error));;
    //         //Save motion info
    //         if (typeof vid !== "undefined") {
    //             let EventDate = Date.parse(vid.updated_at);
    //
    //             //TEST
    //             console.log("CheckMotion:");
    //             console.log("vid:");
    //             console.log(vid);
    //             console.log("vid.updated_at:" + vid.updated_at);
    //             console.log("EventDate: " + EventDate);
    //             //TEST
    //
    //             let EventCamID = vid.device_id;
    //
    //             Homey.ManagerDrivers.getDriver('BlinkIndoorCamera').ParseTriggerData(EventCamID, EventDate);
    //         } else {
    //             let EventDate = Date.parse("01-01-1900");
    //             let EventCamID = "00000";
    //
    //             Homey.ManagerDrivers.getDriver('BlinkIndoorCamera').ParseTriggerData(EventCamID, EventDate);
    //         }
    //         resolve(vid);
    //     });
    // }
    CheckMotion() {
        return new Promise((resolve, reject) => {
            //Get Last Motion
            this.LatestVideo()
                .then((vid) => {
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
                })
                .catch(error => reject(error));
        });
    }

    MotionLoop() {
        setInterval(() => {
            this.CheckMotion().catch(error => this.error(error));
            //this.log("Motion check has ran");
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
