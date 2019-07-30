'use strict';

const Homey = require('homey');
const request = require('request');
const Promise = require('promise');

class BlinkApp extends Homey.App {


    async onInit() {
        this.log('App is running...');
        this.GetToken();
        this.CheckMotion();
        this.MotionLoop();
        this.RefreshAuthToken();

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
        const parent = this;

        return new Promise(function(fulfill, reject) {
            var headers = {
                "Host": "prod.immedia-semi.com",
                "Content-Type": "application/json"
            };
            let username = Homey.ManagerSettings.get('BlinkUsername');
            let password = Homey.ManagerSettings.get('BlinkPassword');
            if(username == null){
              console.log("No username has been set");
            }
            else{
              //console.log("username: "+username);
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
                    var accountId = jsonData.account.id;
                    if (authtoken == null || authtoken == "") {
                        reject("Token not in response: " + body);
                    } else {
                        //Store authtoken in ManagerSettings
                        parent.log("storing authtoken");
                        Homey.ManagerSettings.set('authtoken', authtoken);
                        Homey.ManagerSettings.set('accountId', accountId);
                        fulfill(authtoken);
                    }
                }
            });

          }
        });
    }

    async GetAuthToken(){
      let authtoken =  Homey.ManagerSettings.get('authtoken');
      const parent = this;

      if (!authtoken){
        return new Promise(function(fulfill, reject) {
            authtoken =  parent.GetToken();
            fulfill(authtoken);
          });
      }
      else{
        return new Promise(function(fulfill, reject) {
          fulfill(authtoken);
          });
      }


    }

    async GetAccountId(){
        let accountId =  Homey.ManagerSettings.get('accountId');

        if (!accountId){
            return new Promise(function(fulfill, reject) {
                fulfill(accountId);
            });
        }
        else{
            return new Promise(function(fulfill, reject) {
                fulfill(accountId);
            });
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
                        Homey.ManagerSettings.set('network', NetworkID);
                    }
                }
            });
        });
    }

    //Get info as displayed on Homescreen
    async GetHomescreen(CameraID) {
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
                        var homescreen = HomescreenData;

                        fulfill(homescreen);

                    }
                }
            });
        });
    }

    //Get latest video
    async LatestVideo() {
        var authtoken = await this.GetAuthToken();
        var accountId = await this.GetAccountId();
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/api/v1/accounts/" + accountId + "/media/changed?since=2011-06-23&page=0",
                method: "GET",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                    console.log("Error in request: "+err);
                } else if (res.statusCode !== 200) {
                    reject("LatestVideo API Response not valid: " + body);
                    console.log("Error in return: "+body);
                } else {
                    var latestvideo = JSON.parse(body);
                    var latestvideo = latestvideo.media[0];
                    if (latestvideo == null) {
                        fulfill(latestvideo);
                    } else {
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
        var accountId = await this.GetAccountId();
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/api/v3/accounts/" + accountId + "/homescreen",
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
                        var networks = [];
                        for (var i = 0; i < GetCamerasResponse.networks.length; i++) {
                            networks[GetCamerasResponse.networks[i].id] = GetCamerasResponse.networks[i].name;
                        }
                        for (var i = 0; i < GetCamerasResponse.cameras.length; i++) {
                            let device_list = GetCamerasResponse.cameras[i];
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
                        fulfill(devices);
                    }
                }

            });
        });
    }

    //Get Camera info
    async GetCamera(CameraID) {
        var authtoken = await this.GetAuthToken();
        var accountId = await this.GetAccountId();
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/api/v3/accounts/" + accountId + "/homescreen",
                method: "GET",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    let cameraFound = false;
                    var GetCamerasResponse = JSON.parse(body);
                    if (GetCamerasResponse == null) {
                        fulfill(body);
                    } else {
                        let networkNames = [];
                        let networkArmed = []
                        for (var i = 0; i < GetCamerasResponse.networks.length; i++) {
                            networkNames[GetCamerasResponse.networks[i].id] = GetCamerasResponse.networks[i].name;
                            networkArmed[GetCamerasResponse.networks[i].id] = GetCamerasResponse.networks[i].armed;
                        }

                        for (var i = 0; i < GetCamerasResponse.cameras.length; i++) {
                            let Camera_info = GetCamerasResponse.cameras[i];
                            //if (Camera_info.device_type !== 'camera') continue;
                            if (CameraID === Camera_info.id) {
                                cameraFound = true;
                                Camera_info.armed = networkArmed[Camera_info.network_id];
                                Camera_info.network_name = networkNames[Camera_info.network_id];
                                fulfill(Camera_info);
                            }
                        }
                    }
                    if (!cameraFound)
                    {
                        reject("Camera not found: " + body);
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

    //Capture a video
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

    //Capture a snapshot
    async Capture_snap(CamID) {
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
                url: "https://rest.prde.immedia-semi.com/network/" + networkID + "/camera/" + Camera + "/thumbnail",
                method: "POST",
                headers: headers
            };
            request(options, function(err, res, body) {
                if (err) {
                    reject("Request Error: " + err);
                } else if (res.statusCode !== 200) {
                    reject("API Response not valid: " + body);
                } else {
                    var Snapresponse = JSON.parse(body);
                    if (Snapresponse == null) {
                        reject("Error during deserialization: " + body);
                    } else {
                        fulfill(Snapresponse);
                    }
                }
            });
        });
    }

    //GetImage
    async GetImg(url) {
        var authtoken = await this.GetAuthToken();
        return new Promise(function(fulfill, reject) {
            var headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            var options = {
                url: "https://rest.prde.immedia-semi.com/" + url + ".jpg",
                method: "GET",
                encoding: null,
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
                    var MyImage = body;
                    if (MyImage == null) {
                        reject("No Image Data found");
                    } else {
                        fulfill(MyImage);
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
            let EventCamID = vid.device_id;

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
            //console.log("Motion check has ran");
        }, 5000);
    }

    RefreshAuthToken() {
        setInterval(() => {
            this.GetToken();
            console.log("A new authtoken has been requested");
        }, 43200000);
    }



}

module.exports = BlinkApp;
