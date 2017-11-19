// Device.js
'use strict';

const Homey = require('homey');

class BlinkCamera extends Homey.Device {
    async onInit() {
        //this.log('Device initiated');

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        let today = new Date()
        today = Date.parse(today);
        this.setCapabilityValue("last_vid", today);
        let EnableCam = new Homey.FlowCardAction('turn_on');
        EnableCam
            .register()
            .registerRunListener((args, state) => {
                this.setCapabilityValue("onoff", true);
                Homey.app.EnableMotion(this.getData().id);
                return true;

            })


        let DisableCam = new Homey.FlowCardAction('turn_off');
        DisableCam
            .register()
            .registerRunListener((args, state) => {
                this.setCapabilityValue("onoff", false);
                Homey.app.DisableMotion(this.getData().id);
                return true;

            })

        //this.updateDevice();
        //this.start_update_loop();

    }

    onAdded() {
        this.log('device added');
    }

    onDeleted() {
        this.log('device deleted');
    }

    startMotionTrigger() {
        let MotionDetectedTrigger = new Homey.FlowCardTriggerDevice('motion_trigger');
        console.log(this);
        let device = this;
        let tokens = {};
        let state = {};
        MotionDetectedTrigger
            .register()
            .trigger(device, tokens, state)
            .catch(this.error)
            .then(this.log)

        this.log('trigger started');
    }

    onCapabilityOnoff(value, opts, callback) {
        //if value = true, it's on.. else off'
        if (value) {
            this.log('Motion Enabled');
            this.setCapabilityValue("onoff", true);
            Homey.app.EnableMotion(this.getData().id);
            //Homey.app.Arm();
        }
        else {
            this.log('Motion Disabled');
            this.setCapabilityValue("onoff", false);
            Homey.app.DisableMotion(this.getData().id);
            //Homey.app.Disarm();
        }
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
        let temp = Camerainfo.temperature;
        let measure_temperature_value = (temp - 32) * 5 / 9;

        let onoff_value = Camerainfo.enabled; //not correct yet, should contain the "arm/not armed network status"

        let wifi_strength = Camerainfo.wifi_strength;
        let wifi_signal_value = "Very poor";
        if (wifi_strength === 5) { wifi_signal_value = "Very good"; }
        else if (wifi_strength === 4) { wifi_signal_value = "Good"; }
        else if (wifi_strength === 3) { wifi_signal_value = "Ok"; }
        else if (wifi_strength === 2) { wifi_signal_value = "Poor"; }
        else if (wifi_strength === 1) { wifi_signal_value = "Very poor"; }


        let battery_state_value = Camerainfo.battery_state;
        let clip_length_value = Camerainfo.video_length;

        //Set Capabilities
        this.setCapabilityValue("onoff", onoff_value);
        this.setCapabilityValue("measure_temperature", measure_temperature_value);
        this.setCapabilityValue("wifi_signal", wifi_signal_value);
        this.setCapabilityValue("battery_state", battery_state_value);
        this.setCapabilityValue("clip_length", clip_length_value);


        this.log('device has been updated');
    }


    async CheckMotion_settings() {
        //Get motion settings
        let last_cam = Homey.ManagerSettings.get('Latest_vid_Cam');
        let last_vid = Homey.ManagerSettings.get('Latest_vid_DateTime');

        //Get capability value
        let current_vid = this.getCapabilityValue("last_vid");

        //Get device data
        let cam_id = this.getData().id;
        //Check if ID's match
        if (cam_id == last_cam) {
            //Check if current new last vid > current vid
            if (last_vid > current_vid) {
                console.log('new motion detected on camera: ' + this.getData().id);
                this.startMotionTrigger();
            }
            //store new date in capability
            this.setCapabilityValue("last_vid", last_vid);
        }


    }

    TestMotion(){
      console.log("test");
    }


}

module.exports = BlinkCamera;
