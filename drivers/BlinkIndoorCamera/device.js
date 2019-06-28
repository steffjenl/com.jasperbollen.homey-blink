// Device.js
'use strict';

const Homey = require('homey');
const Promise = require('promise');
const request = require('request');
const fetch = require('node-fetch');

class BlinkCamera extends Homey.Device {


    async onInit() {

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        let today = new Date()
        today = Date.parse(today);
        this.setCapabilityValue("last_vid", today);
        this.updateDevice();
        this.start_update_loop();

        // Register images
        await this._registerSnapshotImage();

    }

    onAdded() {
        this.log('device added');
    }

    onDeleted() {
        this.log('device deleted');
    }

    onCapabilityOnoff(value, opts, callback) {
        //if value = true, it's on.. else off'
        if (value) {
            this.log('Motion Enabled');
            this.setCapabilityValue("onoff", true);
            Homey.app.EnableMotion(this.getData().id);
            //Homey.app.Arm();
        } else {
            this.log('Motion Disabled');
            this.setCapabilityValue("onoff", false);
            Homey.app.DisableMotion(this.getData().id);
            //Homey.app.Disarm();
        }
    }

    onFlowCardIndoorCamera_on() {
        this.setCapabilityValue("onoff", true);
        Homey.app.EnableMotion(this.getData().id);

        return true;
    }

    onFlowCardIndoorCamera_off() {
        this.setCapabilityValue("onoff", false);
        Homey.app.DisableMotion(this.getData().id);

        return true;
    }

    onFlowCardCapture_vid() {
        console.log("Capturing Video");
        Homey.app.Capture_vid(this.getData().id);

        return true;
    }

    async onFlowCardCapture_snap() {
        const imageGrabbed = new Homey.FlowCardTriggerDevice('snapshot_created')
          .register()
          .registerRunListener((args, state) => {

              return Promise.resolve(true);

          })

        const parent = this;
        const device = this.getName();

        //console.log(MyImage);
        let myImage = new Homey.Image('jpg');

        // Set stream, this method is called when image.update() is called
        myImage.setStream(async (stream) => {
            // get AuthToken
            const authtoken = await Homey.app.GetAuthToken();
            // First generate new snapshot
            const url = await this._getNewSnapshotUrl();
            this.log('onFlowCardCapture_snap() -> setStream ->', url);

            if (!url) {
                this.error('onFlowCardCapture_snap() -> setStream ->', 'failed no image url available');
                throw new Error('No image url available');
            }

            //
            const fullUrl = "https://rest.prde.immedia-semi.com/" + url + ".jpg"

            const headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            const options = {
                method: "GET",
                headers: headers
            };

            // Fetch image from url and pipe
            const res = await fetch(fullUrl, options);
            if (!res.ok) {
                this.error('onFlowCardCapture_snap() -> setStream -> failed', res.statusText);
                throw new Error('Could not fetch image');
            }

            this.log('onFlowCardCapture_snap() -> setStream ->', "https://rest.prde.immedia-semi.com/" + url + ".jpg");

            res.body.pipe(stream);
        });

        myImage.register()
            .then(() => {

                // create a token & register it
                let myImageToken = new Homey.FlowToken('image', {
                    type: 'image',
                    title: 'Image'
                })

                myImageToken
                    .register()
                    .then(() => {
                        myImageToken.setValue(myImage)
                            .then(parent.log('setValue'))
                    })

                // trigger a Flow
                imageGrabbed
                    .trigger(this,{
                        image: myImage,
                        device: device
                    })
                    .then(parent.log("Image grabbed"))
                    .catch(this.error)
            })
        return true;
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
            this.updateDevice();
        }, 300000); //5 min
    }

    async updateDevice() {
        let Camerainfo = await Homey.app.GetCamera(this.getData().id);
        //console.log(Camerainfo);

        //Get values
        let temp = Camerainfo.temp;
        let measure_temperature_value = (temp - 32) * 5 / 9;

        let onoff_value = Camerainfo.armed; //not correct yet, should contain the "arm/not armed network status"

        let wifi_strength = Camerainfo.wifi_strength;
        let wifi_signal_value = "Very poor";
        if (wifi_strength === 5) {
            wifi_signal_value = "Very good";
        } else if (wifi_strength === 4) {
            wifi_signal_value = "Good";
        } else if (wifi_strength === 3) {
            wifi_signal_value = "Ok";
        } else if (wifi_strength === 2) {
            wifi_signal_value = "Poor";
        } else if (wifi_strength === 1) {
            wifi_signal_value = "Very poor";
        }


        let battery_state_value = Camerainfo.battery_state;

        //Set Capabilities
        this.setCapabilityValue("onoff", onoff_value);
        this.setCapabilityValue("measure_temperature", measure_temperature_value);
        this.setCapabilityValue("wifi_signal", wifi_signal_value);
        this.setCapabilityValue("battery_state", battery_state_value);


        this.log('device has been updated');
    }

    MotionDetected(DateString) {
        let Event_date = DateString;
        let Current_date = this.getCapabilityValue("last_vid");
        //Check if the event date is newer
        if (Event_date > Current_date) {
            console.log("new motion detected on camera: " + this.getData().id);
            this.setCapabilityValue("last_vid", Event_date);
            this.startMotionTrigger();
            this.onFlowCardCapture_snap();
            // Register images
            this._registerSnapshotImage();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Method that makes a call to the API to generate a new snapshot and returns the new url.
     * @private
     */
    async _getNewSnapshotUrl() {
        const Snapresponse = await Homey.app.Capture_snap(this.getData().id);
        if (!Snapresponse)
        {
            this.error('_getNewSnapshotUrl() -> Capture_snap ->', 'failed create new snapshot');
            throw new Error('No image url available');
        }
        var url_s = await Homey.app.GetCamera(this.getData().id);
        if (!url_s)
        {
            this.error('_getNewSnapshotUrl() -> GetCamera ->', 'failed get url from new snapshot');
            throw new Error('No image url available');
        }
        return url_s.thumbnail;
    }

    /**
     * Method that registers a snapshot image and calls setCameraImage.
     * @private
     */
    async _registerSnapshotImage() {
        this._snapshotImage = new Homey.Image();

        this.log('_registerSnapshotImage()');

        // Set stream, this method is called when image.update() is called
        this._snapshotImage.setStream(async (stream) => {
            // get AuthToken
            const authtoken = await Homey.app.GetAuthToken();
            // First generate new snapshot
            this.log('_registerSnapshotImage() -> setStream -> Capture_snap');
            const url = await this._getNewSnapshotUrl();
            this.log('_registerSnapshotImage() -> setStream ->', url);

            if (!url) {
                this.error('_registerSnapshotImage() -> setStream ->', 'failed no image url available');
                throw new Error('No image url available');
            }

            //
            const fullUrl = "https://rest.prde.immedia-semi.com/" + url + ".jpg"

            const headers = {
                "TOKEN_AUTH": authtoken,
                "Host": "prde.immedia-semi.com",
                "Content-Type": "application/json"
            };

            const options = {
                method: "GET",
                headers: headers
            };

            // Fetch image from url and pipe
            const res = await fetch(fullUrl, options);
            if (!res.ok) {
                this.error('_registerSnapshotImage() -> setStream -> failed', res.statusText);
                throw new Error('Could not fetch image');
            }

            this.log('_registerSnapshotImage() -> setStream ->', "https://rest.prde.immedia-semi.com/" + url + ".jpg");

            res.body.pipe(stream);
        });

        // Register and set camera iamge
        return this._snapshotImage.register()
            .then(() => this.log('_registerSnapshotImage() -> registered'))
            .then(() => this.setCameraImage('snapshot', 'Snapshot', this._snapshotImage))
            .catch(this.error);
    }

}

module.exports = BlinkCamera;
