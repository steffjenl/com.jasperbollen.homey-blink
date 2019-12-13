# Blink for Homey
Control your Blink Camera's using Athom's Homey.


### Device triggers
- Motion has been detected on a camera
- The temperature of a camera has changed

### Device actions
- Enable motion detection
- Disable motion detection
- Capture a video clip

### App actions
- Arm the network
- Disarm the network

## Setup
Once the app is installed, provide your Blink login credentials in the app settings.
Afterwards, you can add your Blink Camera's to Homey.

## To-do
- Device settings
- Change a camera setting
- Split Blink indoor camera / Blink XT

## Version History
**v0.1.0**
* Initial Release

**V0.1.2**
* Added snapshot functionality
* Lessen API calls

**V0.1.3**
* Bugfixes

**V0.1.4**
* Add support for new camera support and new Blink API

**V0.1.5**
* Bugfix for snapshot created image flow

**V0.1.6**
* Added alarm_motion capability, when motion is detected the motion will be true. Not tested yet!

**V0.1.7**
* Added support for multiple networks (zones)

**V0.1.8**
* Bugfix imagetoken already exists message
* Bugfix servers region other then prde is now supported