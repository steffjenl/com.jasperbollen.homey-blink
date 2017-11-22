// Driver.js
'use strict';

const Homey = require('homey');

class BlinkDriver extends Homey.Driver {

    onInit() {
        new Homey.FlowCardAction('turn_on')
            .register()
            .registerRunListener(args => args.IndoorCamera_on.onFlowCardIndoorCamera_on());

        new Homey.FlowCardAction('turn_off')
            .register()
            .registerRunListener(args => args.IndoorCamera_off.onFlowCardIndoorCamera_off());

        new Homey.FlowCardAction('Capture_video')
            .register()
            .registerRunListener(args => args.Capture_vid.onFlowCardCapture_vid());

        new Homey.FlowCardAction('change_settings')
            .register()
            .registerRunListener(args => args.IndoorCamera_setting.onFlowCardchange_settings());
    }


    async onPairListDevices(data, callback) {
        let devices = await Homey.app.GetCameras();
        console.log(devices);
        callback(null, devices);
    }

    ParseTriggerData(DeviceIDp, DateString) {
        const device = this.getDevice({
            id: DeviceIDp
        });
        if (Object.prototype.hasOwnProperty.call(device, '__ready')) {
            device.TestMotion(DateString);
        }
    }

}

module.exports = BlinkDriver;
