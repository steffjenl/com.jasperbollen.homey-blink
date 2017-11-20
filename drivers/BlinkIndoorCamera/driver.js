// Driver.js

'use strict';

const Homey = require('homey');

class BlinkDriver extends Homey.Driver {

    async onPairListDevices(data, callback) {
        let devices = await Homey.app.GetCameras();
        console.log(devices);
        callback(null, devices);
    }

    ParseTriggerData(DeviceIDp, DateString){
      console.log("DriverParse: " + DeviceIDp + " & " + DateString);

      const device = this.getDevice({ id: DeviceIDp });
			if (Object.prototype.hasOwnProperty.call(device, '__ready')) {
        device.TestMotion();
			}
    }

}

module.exports = BlinkDriver;
