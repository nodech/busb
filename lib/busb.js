'use strict';

exports.unsupported = false;

// TODO: rewrite to js to expose correct browser API classes.
const webusb = require('../vendor/webusb');

exports.usb = webusb.usb;

exports.USB = webusb.USB;
exports.USBDevice = webusb.USBDevice;
exports.USBConfiguration = webusb.USBConfiguration;
exports.USBInterface = webusb.USBInterface;
exports.USBAlternativeInterface = webusb.USBAlternateInterface;
exports.USBEndpoint = webusb.USBEndpoint;
