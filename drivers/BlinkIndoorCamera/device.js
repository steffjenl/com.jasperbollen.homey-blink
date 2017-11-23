// Device.js
'use strict';

const Homey = require('homey');

class BlinkCamera extends Homey.Device {
    async onInit() {

        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        let today = new Date()
        today = Date.parse(today);
        this.setCapabilityValue("last_vid", today);


        //this.updateDevice();
        //this.start_update_loop();

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

    startMotionTrigger() {
        let MotionDetectedTrigger = new Homey.FlowCardTriggerDevice('motion_trigger');
        let device = this;
        let tokens = {};
        let state = {};
        MotionDetectedTrigger
            .register()
            .trigger(device, tokens, state)
            .catch(this.error)
            .then(this.log)
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
        let clip_length_value = Camerainfo.video_length;

        //Set Capabilities
        this.setCapabilityValue("onoff", onoff_value);
        this.setCapabilityValue("measure_temperature", measure_temperature_value);
        this.setCapabilityValue("wifi_signal", wifi_signal_value);
        this.setCapabilityValue("battery_state", battery_state_value);
        this.setCapabilityValue("clip_length", clip_length_value);


        this.log('device has been updated');
    }

    MotionDetected(DateString) {
        let Event_date = DateString;
        let Current_date = this.getCapabilityValue("last_vid");

        //Check if the event date is newer
        if(Event_date > Current_date){
          console.log("new motion detected on camera: "+ this.getData().id);
          this.setCapabilityValue("last_vid", Event_date);
          startMotionTrigger();
        }
    }


}

module.exports = BlinkCamera;
