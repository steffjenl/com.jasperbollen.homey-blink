// Driver.js
'use strict';

const Homey = require('homey');

class BlinkDriver extends Homey.Driver {

    onInit() {
        this.api = Homey.app.api;

        new Homey.FlowCardAction('turn_on')
            .register()
            .registerRunListener(args => args.IndoorCamera_on.onFlowCardIndoorCamera_on());

        new Homey.FlowCardAction('turn_off')
            .register()
            .registerRunListener(args => args.IndoorCamera_off.onFlowCardIndoorCamera_off());

        new Homey.FlowCardAction('Capture_video')
            .register()
            .registerRunListener(args => args.Capture_vid.onFlowCardCapture_vid());

        new Homey.FlowCardAction('Capture_snapshot')
            .register()
            .registerRunListener(args => args.Capture_snap.onFlowCardCapture_snap().catch(error => this.error(error)));

        let ArmNetwork = new Homey.FlowCardAction('arm_network');
        ArmNetwork
            .register()
            .registerRunListener((args, state) => {
                Homey.app.Arm().catch(error => this.error(error));
                return true;
            });

        let DisArmNetwork = new Homey.FlowCardAction('disarm_network');
        DisArmNetwork
            .register()
            .registerRunListener((args, state) => {
                Homey.app.Disarm().catch(error => this.error(error));
                return true;
            });

        this.log('Camera driver initialized.');
    }

    onPair(socket) {
        // Perform when device list is shown
        socket.on('list_devices', async (data, callback) => {
            console.log('list_devices');
            callback(null, await Homey.app.GetCameras().catch(error => this.error(error)));
        });
    }

    ParseTriggerData(DeviceIDp, DateString) {
        const device = this.getDevice({
            id: DeviceIDp
        });
        if (Object.prototype.hasOwnProperty.call(device, '_events')) {
            device.MotionDetected(DateString);
        }
    }

}

module.exports = BlinkDriver;
