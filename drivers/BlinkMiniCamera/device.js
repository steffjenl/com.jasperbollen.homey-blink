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
            //Homey.app.EnableMotion(this.getData().id).catch(error => this.error(error));
        } else {
            this.log('Motion Disabled');
            this.setCapabilityValue("onoff", false);
            //Homey.app.DisableMotion(this.getData().id).catch(error => this.error(error));
        }
    }

    onFlowCardIndoorCamera_on() {
        this.setCapabilityValue("onoff", true);
        //Homey.app.EnableMotion(this.getData().id).catch(error => this.error(error));

        return true;
    }

    onFlowCardIndoorCamera_off() {
        this.setCapabilityValue("onoff", false);
        //Homey.app.DisableMotion(this.getData().id).catch(error => this.error(error));

        return true;
    }

    onFlowCardCapture_vid() {
        this.log("Capturing Video");
        Homey.app.Capture_vid(this.getData().id).catch(error => this.error(error));
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
                    self.log(headers);

                    res.body.pipe(stream);
                }).catch(error => reject(error));
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
                        .then(self.log("Image grabbed"))
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
                    Homey.app.log(Camerainfo);
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
            this.setCapabilityValue('alarm_motion', true).catch(this.error);
            await this.onFlowCardCapture_snap();
            await this.startMotionTrigger();
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
            Homey.app.CaptureOwl_snap(self.getData().id).catch(error => reject('_getNewSnapshotUrl() -> CaptureOwl_snap -> failed create new snapshot -> ' + error));

            //self.device.sleep(2500).then(sleep => {

                Homey.app.GetOwl(self.getData().id).then(response => {
                    if (!response) {
                        reject('_getNewSnapshotUrl() -> GetOwl ->', 'failed get url from new snapshot');
                    }
                    resolve(response.thumbnail);
                }).catch(error => reject(error));

            //}).catch(error => reject(error));
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

                }).catch(error => reject(error));
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
