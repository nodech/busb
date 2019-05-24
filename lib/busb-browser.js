'use strict';

exports.unsupported = !(global.navigator && global.USB
  && global.navigator.usb instanceof global.USB);

if (exports.unsupported)
  return;

exports.usb = global.navigator.usb;

// TODO: remap other classes as well.
exports.USB = global.USB;
exports.USBDevice = global.USBDevice;
exports.USBConfiguration = global.USBConfiguration;
exports.USBInterface = global.USBInterface;
exports.USBAlternativeInterface = global.USBAlternativeInterface;
exports.USBEndpoint = global.USBEndpoint;
