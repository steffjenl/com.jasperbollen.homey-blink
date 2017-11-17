'use strict';

const Homey = require('homey');
const request = require('request');
const Promise = require('promise');

class BlinkApp extends Homey.App {
    

        async onInit() {
            this.log('App is running...');
            this.CheckMotion();
            this.MotionLoop();
        }

         
        //Login
        GetToken(username, password) {
            return new Promise(function (fulfill, reject) {
                var headers = {
                    "Host": "prod.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var loginBody = "{ \"password\" : \"" + password + "\", \"client_specifier\" : \"iPhone 9.2 | 2.2 | 222\", \"email\" : \"" + username + "\" }";

                var options = {
                    url: "https://prod.immedia-semi.com/login",
                    method: "POST",
                    headers: headers,
                    body: loginBody
                };

                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var jsonData = JSON.parse(body);
                        var authtoken = jsonData.authtoken.authtoken;
                        if (authtoken == null || authtoken == "") { reject("Token not in response: " + body); }
                        else { fulfill(authtoken); }
                    }
                });
            });
        }

        //Get info about sync network
        async GetNetworks() {
            var authtoken = await this.GetToken("username", "password");
            return new Promise(function (fulfill, reject) {

                var headers = {
                    "TOKEN_AUTH": authtoken,
                    "Host": "prde.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var options = {
                    url: "https://prde.immedia-semi.com/networks",
                    headers: headers
                };

                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var NetworkData = JSON.parse(body);
                        var NetworkID = NetworkData.networks[0];
                        if (NetworkData == null) { reject("Error during deserialization: " + body); }
                        else { fulfill(NetworkID); }
                    }
                });
            });
        }

        //Get info as displayed on Homescreen
        async GetHomescreen(authtoken) {
            var authtoken = await this.GetToken("username", "password");
            return new Promise(function (fulfill, reject) {

                var headers = {
                    "TOKEN_AUTH": authtoken,
                    "Host": "prde.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var options = {
                    url: "https://prde.immedia-semi.com/homescreen",
                    headers: headers
                };

                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var HomescreenData = JSON.parse(body);
                        if (HomescreenData == null) { reject("Error during deserialization: " + body); }
                        else { homescreen = HomescreenData; fulfill(homescreen); }
                    }
                });
            });
        }

        //Get latest video
        async LatestVideo() {
            var authtoken = await this.GetToken("username", "password");
            return new Promise(function (fulfill, reject) {
                var headers = {
                    "TOKEN_AUTH": authtoken,
                    "Host": "prde.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var options = {
                    url: "https://prde.immedia-semi.com/api/v2/videos/page/0",
                    method: "GET",
                    headers: headers
                };
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var latestvideo = JSON.parse(body);
                        var latestvideo = latestvideo[0];
                        if (latestvideo == null) { fulfill(latestvideo); }
                        else {
                            fulfill(latestvideo);
                        }
                    }

                });
            });
        }

        //Get Events's
        async GetEvents() {
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            return new Promise(function (fulfill, reject) {
                var headers = {
                    "TOKEN_AUTH": authtoken,
                    "Host": "prde.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var options = {
                    url: "https://prde.immedia-semi.com/events/network/" + networkID,
                    method: "GET",
                    headers: headers
                };
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var eventlist = JSON.parse(body);
                        if (eventlist == null) { reject("Error during deserialization: " + body); }
                        else { fulfill(eventlist); console.log(eventlist); }
                    }
                });
            });
        }

        //Get Camera's
        async GetCameras() {
            
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            return new Promise(function (fulfill, reject) {
                var headers = {
                    "TOKEN_AUTH": authtoken,
                    "Host": "prde.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var options = {
                    url: "https://prde.immedia-semi.com/network/" + networkID + "/cameras",
                    method: "GET",
                    headers: headers
                };
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var GetCamerasResponse = JSON.parse(body);
                        if (GetCamerasResponse == null) { reject("Error during deserialization: " + body); }

                        else {
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
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            return new Promise(function (fulfill, reject) {
                var headers = {
                    "TOKEN_AUTH": authtoken,
                    "Host": "prde.immedia-semi.com",
                    "Content-Type": "application/json"
                };

                var options = {
                    url: "https://prde.immedia-semi.com/network/" + networkID + "/cameras",
                    method: "GET",
                    headers: headers
                };
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var GetCamerasResponse = JSON.parse(body);
                        if (GetCamerasResponse == null) { fulfill(body); }

                        else {
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
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            var cameraID = CameraID;
            return new Promise(function (fulfill, reject) {
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
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var DisarmResponse = JSON.parse(body);
                        if (DisarmResponse == null) { reject("Error during deserialization: " + body); }
                        else { fulfill(); console.log(DisarmResponse); }
                    }
                });
            });
        }

        //Disable motion for cam
        async DisableMotion(CameraID) {
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            var cameraID = CameraID;
            return new Promise(function (fulfill, reject) {
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
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var DisarmResponse = JSON.parse(body);
                        if (DisarmResponse == null) { reject("Error during deserialization: " + body); }
                        else { fulfill(); console.log(DisarmResponse); }
                    }
                });
            });
        }

        //Disarm the system
        async Disarm() {
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            return new Promise(function (fulfill, reject) {
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
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var DisarmResponse = JSON.parse(body);
                        if (DisarmResponse == null) { reject("Error during deserialization: " + body); }
                        else { fulfill(); console.log(DisarmResponse); }
                    }
                });
            });
        }

        //Arm the system
        async Arm() {
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            return new Promise(function (fulfill, reject) {
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
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var ArmResponse = JSON.parse(body);
                        if (ArmResponse == null) { reject("Error during deserialization: " + body); }
                        else { fulfill(); console.log(ArmResponse); }
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
                Homey.ManagerSettings.set('Latest_vid_DateTime', Date.parse(vid.updated_at));
                Homey.ManagerSettings.set('Latest_vid_Cam', vid.camera_id);
            }      
            //console.log(Homey.ManagerSettings.get('Latest_vid_DateTime'));
            //console.log(Homey.ManagerSettings.get('Latest_vid_Cam'));
        }

        //Change camera setting
        async ChangeCamSetting(CameraID, Setting, Value) {
            var authtoken = await this.GetToken("username", "password");
            var networkID = await this.GetNetworks();
            var networkID = networkID.id;
            return new Promise(function (fulfill, reject) {
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
                request(options, function (err, res, body) {
                    if (err) {
                        reject("Request Error: " + err);
                    } else if (res.statusCode !== 200) {
                        reject("API Response not valid: " + body);
                    } else {
                        var GetCamerasResponse = JSON.parse(body);
                        if (GetCamerasResponse == null) { reject("Error during deserialization: " + body); }

                        else {

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