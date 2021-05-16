// eslint-disable-next-line node/no-unpublished-require,strict
const Homey = require('homey');

module.exports = [
    {
        method: 'POST',
        path: '/settings/validate',
        fn(args, callback) {
            const Api = Homey.app.api;
            const jsonData = args.body;
            Api.login(jsonData.username, jsonData.password, Homey.app.getBlinkUid(), Homey.app.getBlinkNotificationKey()).then(result => {
                return callback(null, result);
            }).catch(error => {
                console.log(error);
                callback(error)
            });
        },
    },
    {
        method: 'POST',
        path: '/settings/validate/pincode',
        fn(args, callback) {
            const Api = Homey.app.api;
            const jsonData = args.body;
            Api.verfy(jsonData.pinCode).then(result => {
                return callback(null, result);
            }).catch(error => {
                Homey.app.log(error);
                callback(error)
            });
        },
    },
];
