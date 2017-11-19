// Driver.js

'use strict';

const Homey = require('homey');

class BlinkDriver extends Homey.Driver {

    async onPairListDevices(data, callback) {
        let devices = await Homey.app.GetCameras();
        console.log(devices);
        callback(null, devices);
    }

    ParseTriggerData(DeviceID, DateString){
      console.log("DriverParse: " + DeviceID + " & " + DateString);

      const device = this.getDevice({ id: DeviceID });
			if (Object.prototype.hasOwnProperty.call(device, '__ready')) {
				// this.log(circleEnergy);
        device.TestMotion();
			}
    }

}

module.exports = BlinkDriver;
