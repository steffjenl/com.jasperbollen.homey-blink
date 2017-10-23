// Driver.js

'use strict';

const Homey = require('homey');

class MyDriver extends Homey.Driver {

    async onPairListDevices(data, callback) {
        let devices = await Homey.app.GetCameras();
        console.log(devices);
        callback(null, devices);
    }

}

module.exports = MyDriver;