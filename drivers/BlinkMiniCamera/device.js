// Device.js
'use strict';

const Homey = require('homey');
const Promise = require('promise');
const fetch = require('node-fetch');

class BlinkCamera extends Homey.Device {
    onInit() {
        this.camera = this.getData();
        this.device = this;

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        let today = new Date()
        today = Date.parse(today);
        this.setCapabilityValue("last_vid", today);
        this.updateDevice(this.camera, this.device).catch(error => this.error(error));
        this.start_update_loop();

        // Register images
        this._registerSnapshotImage().catch(error => this.error(error));

    }

    onAdded() {
        this.log('device added');
    }

    onDeleted() {
        this.log('device deleted');
    }

    async onCapabilityOnoff(value, opts) {
        //if value = true, it's on.. else off'
        if (value) {
            this.log('Motion Enabled');
            this.setCapabilityValue("onoff", true);
            Homey.app.EnableMotionOwl(this.getData().id).catch(error => this.error(error));
        } else {
            this.log('Motion Disabled');
            this.setCapabilityValue("onoff", false);
            Homey.app.DisableMotionOwl(this.getData().id).catch(error => this.error(error));
        }
    }

    onFlowCardIndoorCamera_on() {
        this.setCapabilityValue("onoff", true);
        Homey.app.EnableMotionOwl(this.getData().id).catch(error => this.error(error));

        return true;
    }

    onFlowCardIndoorCamera_off() {
        this.setCapabilityValue("onoff", false);
        Homey.app.DisableMotionOwl(this.getData().id).catch(error => this.error(error));

        return true;
    }

    onFlowCardCapture_vid() {
        this.log("onFlowCardCapture_vid() -> Capturing Video");
        Homey.app.CaptureOwl_vid(this.getData().id).catch(error => this.error(error));
        return true;
    }

    async onFlowCardCapture_snap() {
        const self = this;
        return new Promise(function (resolve, reject) {

            const imageGrabbed = new Homey.FlowCardTriggerDevice('snapshot_created')
                .register()
                .registerRunListener((args, state) => {

                    return Promise.resolve(true);

                });

            const snapshotImage = new Homey.Image();
            self.log('onFlowCardCapture_snap()');
            snapshotImage.setStream(async stream => {
                self.log('onFlowCardCapture_snap() -> setStream -> CaptureOwl_snap');
                self._getNewSnapshotUrl().then(async url => {
                    // get AuthToken
                    const authtoken = await Homey.app.GetAuthToken();
                    const regionCode = await Homey.app.GetRegion();
                    //
                    if (!url) {
                        reject('onFlowCardCapture_snap() -> setStream ->', 'failed no image url available');
                    }
                    //
                    const fullUrl = "https://rest-" + regionCode + ".immedia-semi.com" + url + ".jpg";
                    //
                    const headers = {
                        "TOKEN_AUTH": authtoken,
                        "Accept": "image/jpeg",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Content-type": "image/jpeg",
                        "User-Agent": "PostmanRuntime/7.26.8",
                        "Cache-Control": "no-cache"
                    };

                    const options = {
                        host: "rest-".regionCode + ".immedia-semi.com",
                        port: 443,
                        method: "GET",
                        headers: headers,
                        maxRedirects: 20,
                        rejectUnauthorized: false,
                        keepAlive: false,
                        secureProtocol: 'TLSv1_2_method',
                    };

                    // Fetch image from url and pipe
                    const res = await fetch(fullUrl, options);
                    if (!res.ok) {
                        reject('onFlowCardCapture_snap() -> setStream -> failed', res.statusText);
                    }

                    self.log('onFlowCardCapture_snap() -> setStream ->', "https://rest-" + regionCode + ".immedia-semi.com" + url + ".jpg");

                    res.body.pipe(stream);
                })
                .catch((error) => {
                    self.log("onFlowCardCapture_snap() -> _getNewSnapshotUrl() error: "+error)
                    self.log("Close the stream to prevent the app waiting for timeout.");
                    stream.end();
                    //throw new Error('Camera is busy');
                });
            });

            snapshotImage.register()
                .then(() => {

                    // ' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
                    // create a token & register it
                    let myImageToken = new Homey.FlowToken('image-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15), {
                        type: 'image',
                        title: 'Image'
                    })

                    myImageToken
                        .register()
                        .then(() => {
                            myImageToken.setValue(snapshotImage)
                                .then(self.log('setValue'))
                        })
                        .catch(self.error)

                    // trigger a Flow
                    imageGrabbed
                        .trigger(self, {
                            image: snapshotImage,
                            device: self.getName()
                        })
                        //.then(self.log("Image grabbed"))
                        .then(() => {
                            self.log("Image grabbed");
                            resolve();
                        })
                        .catch(self.error)
                })
        }).catch(error => self.error(error));
     }

    startMotionTrigger() {
        let MotionDetectedTrigger = new Homey.FlowCardTriggerDevice('motion_trigger');
        let device = this;
        let tokens = {};
        let state = {};
        MotionDetectedTrigger
            .register()
            .trigger(device, tokens, state)
            .catch(this.error);
    }

    start_update_loop() {
        setInterval(() => {
            this.updateDevice(this.camera, this.device);
        }, 300000); //5 min
    }

    updateDevice(camera, device) {
        const self = this;
        return new Promise(function (resolve, reject) {
            Homey.app.GetOwl(camera.id).then(Camerainfo => {
                if (Camerainfo == null) {
                    reject("Error during deserialization: " + Camerainfo);
                } else {
                    //Homey.app.log(Camerainfo);
                    resolve(camera);
                }

            }).catch(error => reject(error));
        });
    }

    async MotionDetected(DateString) {
        let Event_date = DateString;
        let Current_date = this.getCapabilityValue("last_vid");
        //Check if the event date is newer
        if (Event_date > Current_date) {
            Homey.app.log("new motion detected on camera: " + this.getData().id);
            this.setCapabilityValue("last_vid", Event_date).catch(this.error);
            /** 
             * No snapshot capturing on motion event!
             * The camera is recording and a new snapshot can't be captured in time.
             * Trigger motion event without capture to get the flow directly started.
             * Capturing should be done individually in the flow using the "capture snapshot"
             * flow action.
            */
            //await this.onFlowCardCapture_snap()
            //    .then(() => {
                    this.setCapabilityValue('alarm_motion', true).catch(this.error);
                    this.startMotionTrigger();
            //    })
            //    .catch((error) => {
            //        self.log('MotionDetected() -> onFlowCardCapture_snap error: '+error);
            //    });
        } else {
            this.setCapabilityValue('alarm_motion', false).catch(this.error);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Method that makes a call to the API to generate a new snapshot and returns the new url.
     * @private
     */
    _getNewSnapshotUrl() {
        const self = this;
        return new Promise(function (resolve, reject) {
            /**
             * 10-try retrival of camera image with wait time of 1 sec between
             * 1) Read old snapshot URL
             * 2) Call the Blink API to generate a snapshot
             * 3) Try to get a new (different) snapshot URL
             * 4a) Take the new URL to read the image
             * 4b) If no new URL is available, a exceptiomn in thrown to show an error 
             *      in Homey app and clear the stream/image 
             */
             self.log("_getNewSnapshotUrl -> GetOwl()");
             Homey.app.GetOwl(self.getData().id)
            .then(response => {
                if (!response) {
                    reject('_getNewSnapshotUrl() -> GetOwl() ->', 'failed get url from new snapshot');
                }
                let oldURL = response.thumbnail;
                self.log('old URL: ' + oldURL);

                self.log("_getNewSnapshotUrl -> CaptureOwl_snap()");
                Homey.app.CaptureOwl_snap(self.getData().id)
                .then(() => {
                    self._getOwlSequential(0, self.getData().id, oldURL)
                        .then(response => {
                            resolve(response.thumbnail);
                        })
                        .catch(error => reject(error));
                    })
                    //}).catch(error => reject(error));
                .catch(error => reject('_getNewSnapshotUrl() -> CaptureOwl_snap -> failed create new snapshot -> ' + error));
            })
            .catch(error => reject(error));

            /**
             * 1-try retrival of camera image with fixed wait time (3 sec)
             * 1) Call the Blink API to generate a snapshot
             * 2) Wait 2sec for generation
             * 3) Read the snapshot URL 
             */
            //  self.log("_getNewSnapshotUrl -> Capture_snap()");
            //  Homey.app.CaptureOwl_snap(self.getData().id)
            //  .then(() => {
            //      self.log("_getNewSnapshotUrl -> GetOwl()");
            //      self.device.sleep(3000).then(sleep => {
            //          Homey.app.GetOwl(self.getData().id).then(response => {
            //              if (!response) {
            //                  reject('_getNewSnapshotUrl() -> GetOwl ->', 'failed get url from new snapshot');
            //              }
            //              self.log("_getNewSnapshotUrl -> resolve(response.thumbnail)");
            //              resolve(response.thumbnail);
            //          }).catch(error => reject(error));
            //      }).catch(error => reject(error));
            //  })
            //  .catch(error => reject('_getNewSnapshotUrl() -> CaptureOwl_snap -> failed create new snapshot -> ' + error));

            /**
             * Original version
             */
            //  Homey.app.CaptureOwl_snap(self.getData().id)
            //  self.device.sleep(2500).then(sleep => {
                // Homey.app.GetOwl(self.getData().id).then(response => {
                //     if (!response) {
                //         reject('_getNewSnapshotUrl() -> GetOwl ->', 'failed get url from new snapshot');
                //     }
                //     resolve(response.thumbnail);
                // }).catch(error => reject(error));
            //}).catch(error => reject(error));

        });
    }

    /**
     * Method that reads the snapshot URL comparing the last one up to 10 times
     * @private
     */
     _getOwlSequential(count, CameraID, compareURL) {
        const self = this;
        return new Promise(function (resolve, reject) {
            if (count == undefined) {count = 0}
            count++;
            self.log('_getOwlSequential - Step ['+count+'] -> GetOwl()');
            Homey.app.GetOwl(self.getData().id)
                .then(response => {
                    if (!response) {
                        reject('_getOwlSequential() -> GetOwl ->', 'failed get url from new snapshot');
                    }
                    self.log("_getOwlSequential -> resolve(response.thumbnail)");
                    let newURL = response.thumbnail;
                    self.log('new URL: '+newURL); 
                    if (newURL != compareURL || count == 10 ){
                        self.log('Step [' + count + '] - newURL found! exit...');
                        resolve(response);
                    }
                    else {
                        self.log('Step [' + count + '] - same URL found! continue after '+'1'+' seconds');
                        self.device.sleep( 1000 ).then(sleep => {
                            self._getOwlSequential(count, CameraID, compareURL)
                            .then(response => resolve(response) )
                            .catch(error => reject(error));
                        }).catch(error => reject(error));
                    }
                })
                .catch(error => reject(error));
        }); 
    }

    /**
     * Method that registers a snapshot image and calls setCameraImage.
     * @private
     */
    _registerSnapshotImage() {
        const self = this;
        return new Promise(function (resolve, reject) {
            const _snapshotImage = new Homey.Image();
            self.log('_registerSnapshotImage()');
            _snapshotImage.setStream(async stream => {
                self.log('_registerSnapshotImage() -> setStream -> CaptureOwl_snap');
                self._getNewSnapshotUrl().then(async url => {
                    // get AuthToken
                    const authtoken = await Homey.app.GetAuthToken();
                    const regionCode = await Homey.app.GetRegion();
                    //
                    if (!url) {
                        reject('_registerSnapshotImage() -> setStream ->', 'failed no image url available');
                    }
                    //
                    const fullUrl = "https://rest-" + regionCode + ".immedia-semi.com" + url + ".jpg";
                    //
                    const headers = {
                        "TOKEN_AUTH": authtoken,
                        "Accept": "image/jpeg",
                        "Accept-Encoding": "gzip, deflate, br",
                        "Content-type": "image/jpeg",
                        "User-Agent": "PostmanRuntime/7.26.8",
                        "Cache-Control": "no-cache"
                    };

                    const options = {
                        host: "rest-".regionCode + ".immedia-semi.com",
                        port: 443,
                        method: "GET",
                        headers: headers,
                        maxRedirects: 20,
                        rejectUnauthorized: false,
                        keepAlive: false,
                        secureProtocol: 'TLSv1_2_method',
                    };

                    // Fetch image from url and pipe
                    const res = await fetch(fullUrl, options);
                    if (!res.ok) {
                        reject('_registerSnapshotImage() -> setStream -> failed', res.statusText);
                    }

                    self.log('_registerSnapshotImage() -> setStream ->', "https://rest-" + regionCode + ".immedia-semi.com" + url + ".jpg");

                    res.body.pipe(stream);
                })
                .catch((error) => {
                    self.log("_registerSnapshotImage Error calling _getNewSnapshotUrl: "+error);
                    self.log("Close the stream to prevent the app waiting for timeout.");
                    stream.end();
                    //throw new Error('Camera is busy');
                });
            });
            // Register and set camera iamge
            _snapshotImage.register()
                .then(() => self.log('_registerSnapshotImage() -> registered'))
                .then(() => self.setCameraImage('snapshot', 'Snapshot', _snapshotImage))
                .catch(self.error);
            resolve();
        }).catch(error => self.error(error));
    }
}

module.exports = BlinkCamera;
