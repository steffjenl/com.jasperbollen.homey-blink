'use strict';

const Homey = require('homey');
const request = require('request');
const Promise = require('promise');

class BlinkApp extends Homey.App {


    async onInit() {
        this.log('App is running...');

        //this.GetAuthToken();
        this.CheckMotion();

        //this.MotionLoop();

        let ArmNetwork = new Homey.FlowCardAction('arm_network');
        ArmNetwork
            .register()
            .registerRunListener((args, state) => {
                //trigger camera FlowCardTriggerDevice

                this.Arm();
                return true;

            })

        let DisArmNetwork = new Homey.FlowCardAction('disarm_network');
        DisArmNetwork
            .register()
            .registerRunListener((args, state) => {

                this.Disarm();
                return true;

            })
    }


    //Login
    GetToken() {
        return new Promise(function(fulfill, reject) {
            var headers = {
                "Host": "prod.immedia-semi.com",
                "Content-Type": "application/json"
            };
            let username = Homey.ManagerSettings.get('BlinkUsername');
            let password = Homey.ManagerSettings.get('BlinkPassword');
            var loginBody = "{ \"password\" : \"" + password + "\", \"client_specifier\" : \"iPhone 9.2 | 2.2 | 222\", \"email\" : \"" + username + "\" }";

            var options = {
                url: "https://rest.prod.immedia-semi.com/login",
                method: "POST",
                headers: headers,
                body: loginBody
            };

            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var jsonData = JSON.parse(body);
                    var authtoken = jsonData.authtoken.authtoken;
                    if (authtoken == null || authtoken == "") {
                        reject("Token not in response: " + body);
                    } else {
                        //Store authtoken in ManagerSettings
                        Homey.set('authtoken', authtoken);
                        fulfill(authtoken);
                        console.log("authtoken has been set");
                    }
            });
        });
    }

    async GetAuthToken(){
      let authtoken =  Homey.ManagerSettings.get('authtoken');
      if (authtoken = ""){
        console.log("Authtoken not available, authtoken requested");
        authtokenf = away this.GetToken();
        authtoken =  Homey.ManagerSettings.get('authtoken');
        fulfill(authtoken);
      }
      else{
        console.log("Authtoken available");
        fulfill(authtoken);
      }

    }

    //Get info about sync network
    async GetNetworks() {
        var authtoken = await this.GetAuthToken();
        return new Promise(function(fulfill, reject) {

            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/networks",
                headers: headers
            };

            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var NetworkData = JSON.parse(body);
                    var NetworkID = NetworkData.networks[0];
                    if (NetworkData == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill(NetworkID);
                        Homey.set('network', NetworkID);
                    }
                }
            });
        });
    }

    //Get info as displayed on Homescreen
    async GetHomescreen(authtoken) {
        var authtoken = await this.GetAuthToken();
        return new Promise(function(fulfill, reject) {

            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/homescreen",
                headers: headers
            };

            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var HomescreenData = JSON.parse(body);
                    if (HomescreenData == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        homescreen = HomescreenData;
                        fulfill(homescreen);
                    }
                }
            });
        });
    }

    //Get latest video
    async LatestVideo() {
        var authtoken = await this.GetAuthToken();
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/api/v2/videos/page/0",
                method: "GET",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                    console.log("Error in request: "+err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                    console.log("Error in return: "+body);
                } else {
                    var latestvideo = JSON.parse(body);
                    var latestvideo = latestvideo[0];
                    if (latestvideo == null) {
                        fulfill(latestvideo);
                    } else {
                        console.log("Last video has been retrieved");
                        fulfill(latestvideo);
                    }
                }

            });
        });
    }

    //Get Events's
    async GetEvents() {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/events/network/" + networkID,
                method: "GET",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var eventlist = JSON.parse(body);
                    if (eventlist == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill(eventlist);
                        console.log(eventlist);
                    }
                }
            });
        });
    }

    //Get Camera's
    async GetCameras() {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/cameras",
                method: "GET",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var GetCamerasResponse = JSON.parse(body);
                    if (GetCamerasResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        var devices = [];
                        for (var prop in GetCamerasResponse.devicestatus) {
                            let device_list = GetCamerasResponse.devicestatus[prop];
                            //console.log(device_list);
                            var device = {
                                "name": device_list.name,
                                "data": {
                                    "id": device_list.id
                                }
                            }
                            devices.push(device);
                        }
                        fulfill(devices);
                    }
                }

            });
        });
    }

    //Get Camera info
    async GetCamera(CameraID) {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/cameras",
                method: "GET",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var GetCamerasResponse = JSON.parse(body);
                    if (GetCamerasResponse == null) {
                        fulfill(body);
                    } else {
                        for (var prop in GetCamerasResponse.devicestatus) {
                            let Camera_info = GetCamerasResponse.devicestatus[prop];
                            if (CameraID === Camera_info.id) {
                                fulfill(Camera_info);
                            }
                        }
                    }
                }
            });
        });
    }

    //Enable Motion for cam
    async EnableMotion(CameraID) {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        var cameraID = CameraID;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "rest.prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/camera/" + cameraID + "/enable",
                method: "POST",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var DisarmResponse = JSON.parse(body);
                    if (DisarmResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill();
                    }
                }
            });
        });
    }

    //Disable motion for cam
    async DisableMotion(CameraID) {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        var cameraID = CameraID;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "rest.prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/camera/" + cameraID + "/disable",
                method: "POST",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var DisarmResponse = JSON.parse(body);
                    if (DisarmResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill();
                    }
                }
            });
        });
    }

    //Disarm the system
    async Disarm() {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "rest.prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/disarm",
                method: "POST",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                    //console.log(err);
                } else if (res.statusCode !== 200) {
                    console.log(body);
                    //reject("API Response not valid: " + body);
                } else {
                    var DisarmResponse = JSON.parse(body);
                    if (DisarmResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill();
                    }
                }
            });
        });
    }

    //Arm the system
    async Arm() {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "rest.prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/arm",
                method: "POST",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var ArmResponse = JSON.parse(body);
                    if (ArmResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill();
                    }
                }
            });
        });
    }

    //Capture a videos
    async Capture_vid(CamID) {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        var Camera = CamID;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "rest.prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/camera/" + Camera + "/clip",
                method: "POST",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var ArmResponse = JSON.parse(body);
                    if (ArmResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill();
                    }
                }
            });
        });
    }

    //Update settings for motion detection
    async CheckMotion() {
        //Get Last Motion
        let vid = await this.LatestVideo();

        //Save motion info
        if (typeof vid !== "undefined") {
            let EventDate = Date.parse(vid.updated_at);
            let EventCamID = vid.camera_id;

            Homey.ManagerDrivers.getDriver('BlinkIndoorCamera').ParseTriggerData(EventCamID, EventDate);
        } else {
            let EventDate = Date.parse("01-01-1900");
            let EventCamID = "00000";

            Homey.ManagerDrivers.getDriver('BlinkIndoorCamera').ParseTriggerData(EventCamID, EventDate);
        }
    }

    //Change camera setting
    async ChangeCamSetting(CameraID, Setting, Value) {
        var authtoken = await this.GetAuthToken();
        var networkID = await this.GetNetworks();
        var networkID = networkID.id;
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };


            var updateBody = "{ \"" + Setting + "\" : \"" + Value + "\", \"client_specifier\" : \"iPhone 9.2 | 2.2 | 222\" }";

            var options = {
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/camera/" + CameraID + "/update",
                method: "POST",
                headers: headers,
                body: updateBody
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var GetCamerasResponse = JSON.parse(body);
                    if (GetCamerasResponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {

                    }
                    console.log(GetCamerasResponse);
                }
            });
        });
    }

    MotionLoop() {
        setInterval(() => {
            this.CheckMotion();
        }, 1000);
    }

}

module.exports = BlinkApp;
