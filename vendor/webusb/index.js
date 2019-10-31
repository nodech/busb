"use strict";
/*
* Node WebUSB
* Copyright (c) 2017 Rob Moran
*
* The MIT License (MIT)
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/
Object.defineProperty(exports, "__esModule", { value: true });
const usb_1 = require("./usb");
exports.USB = usb_1.USB;
/**
 * Default usb instance synonymous with `navigator.usb`
 */
exports.usb = new usb_1.USB();
/**
 * Adapter
 */
var adapter_1 = require("./adapter");
exports.adapter = adapter_1.adapter;
exports.USBAdapter = adapter_1.USBAdapter;
/**
 * Other classes if required
 */
var alternate_1 = require("./alternate");
exports.USBAlternateInterface = alternate_1.USBAlternateInterface;
var configuration_1 = require("./configuration");
exports.USBConfiguration = configuration_1.USBConfiguration;
var device_1 = require("./device");
exports.USBDevice = device_1.USBDevice;
var endpoint_1 = require("./endpoint");
exports.USBEndpoint = endpoint_1.USBEndpoint;
var interface_1 = require("./interface");
exports.USBInterface = interface_1.USBInterface;
