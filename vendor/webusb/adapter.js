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
const events_1 = require("events");
const usb_1 = require("../usb");
const configuration_1 = require("./configuration");
const interface_1 = require("./interface");
const alternate_1 = require("./alternate");
const endpoint_1 = require("./endpoint");
const device_1 = require("./device");
/**
 * @hidden
 */
const DEFAULT_DELAY_TIMEOUT = 200;
/**
 * @hidden
 */
const DEFAULT_RETRY_COUNT = 10;
/**
 * @hidden
 */
const CONSTANTS = {
    WEB_UUID: "3408b638-09a9-47a0-8bfd-a0768815b665",
    LIBUSB_DT_BOS: 0x0f,
    LIBUSB_DT_BOS_SIZE: 0x05,
    LIBUSB_TRANSFER_TYPE_MASK: 0x03,
    USB_VERSION: 0x201,
    CAPABILITY_VERSION: 0x0100,
    URL_REQUEST_TYPE: 0xC0,
    URL_REQUEST_INDEX: 0x02,
    CLEAR_FEATURE: 0x01,
    ENDPOINT_HALT: 0x00
};
/**
 * @hidden
 */
class USBAdapter extends events_1.EventEmitter {
    constructor() {
        super();
        // Maintains a live list of connected Web USB devices
        this.devices = {};
        const attachCallback = device => {
            this.loadDevice(device, DEFAULT_RETRY_COUNT)
                .then(loadedDevice => {
                if (loadedDevice) {
                    const handle = this.getDeviceHandle(loadedDevice);
                    this.devicetoUSBDevice(handle)
                        .then(usbDevice => {
                        if (usbDevice) {
                            this.emit(USBAdapter.EVENT_DEVICE_CONNECT, usbDevice);
                        }
                    });
                }
            });
        };
        const detachCallback = device => {
            const handle = this.getDeviceHandle(device);
            if (handle && this.devices[handle]) {
                delete this.devices[handle];
                this.emit(USBAdapter.EVENT_DEVICE_DISCONNECT, handle);
            }
        };
        this.on("newListener", event => {
            const listenerCount = this.listenerCount(event);
            if (listenerCount !== 0) {
                return;
            }
            if (event === USBAdapter.EVENT_DEVICE_CONNECT) {
                usb_1.on("attach", attachCallback);
            }
            else if (event === USBAdapter.EVENT_DEVICE_DISCONNECT) {
                usb_1.on("detach", detachCallback);
            }
        });
        this.on("removeListener", event => {
            const listenerCount = this.listenerCount(event);
            if (listenerCount !== 0) {
                return;
            }
            if (event === USBAdapter.EVENT_DEVICE_CONNECT) {
                usb_1.removeListener("attach", attachCallback);
            }
            else if (event === USBAdapter.EVENT_DEVICE_DISCONNECT) {
                usb_1.removeListener("detach", detachCallback);
            }
        });
    }
    getDeviceHandle(device) {
        if (device.busNumber === null || device.deviceAddress === null) {
            return null;
        }
        return `${device.busNumber}.${device.deviceAddress}`;
    }
    serialPromises(task, params) {
        function reducer(chain, param) {
            return chain
                .then(results => {
                return task.call(this, param)
                    .then(result => {
                    if (result) {
                        results.push(result);
                    }
                    return results;
                });
            });
        }
        return params.reduce(reducer.bind(this), Promise.resolve([]));
    }
    serialDevicePromises(task, device, descriptors) {
        function reducer(chain, descriptor) {
            return chain
                .then(results => {
                return task.call(this, device, descriptor)
                    .then(result => {
                    results.push(result);
                    return results;
                });
            });
        }
        return descriptors.reduce(reducer.bind(this), Promise.resolve([]));
    }
    delay(timeout = DEFAULT_DELAY_TIMEOUT) {
        return new Promise((resolve, _reject) => {
            setTimeout(resolve, timeout);
        });
    }
    retryPromise(fn, retries = 0, timeout = DEFAULT_DELAY_TIMEOUT) {
        return new Promise((resolve, reject) => {
            fn()
                .then(resolve)
                .catch(error => {
                if (retries === 0) {
                    return reject(error);
                }
                return this.delay(timeout)
                    .then(() => this.retryPromise(fn, --retries, timeout))
                    .then(resolve);
            });
        });
    }
    loadDevices() {
        const devices = usb_1.getDeviceList();
        return this.serialPromises(this.loadDevice, devices);
    }
    loadDevice(device, retries = 0) {
        // Early guard against unsupported USB devices
        try {
            // tslint:disable-next-line:no-unused-expression
            device.configDescriptor;
            // tslint:disable-next-line:no-unused-expression
            device.allConfigDescriptors;
            // tslint:disable-next-line:no-unused-expression
            device.deviceDescriptor;
        }
        catch (_error) {
            return Promise.resolve(null);
        }
        return this.getCapabilities(device, retries)
            .then(capabilities => this.getWebCapability(capabilities))
            .then(capability => {
            return this.getWebUrl(device, capability)
                .then(url => {
                const handle = this.getDeviceHandle(device);
                this.devices[handle] = {
                    device: device,
                    url: url
                };
                return device;
            });
        });
    }
    getCapabilities(device, retries) {
        return new Promise((resolve, _reject) => {
            this.openDevice(device, retries)
                .then(() => {
                device.getCapabilities((error, capabilities) => {
                    try {
                        // Older macs (<10.12) can error with some host devices during a close at this point
                        device.close();
                        // tslint:disable-next-line:no-empty
                    }
                    catch (_error) { }
                    if (error)
                        return resolve([]);
                    resolve(capabilities);
                });
            })
                .catch(_error => {
                resolve([]);
            });
        });
    }
    getWebCapability(capabilities) {
        const platformCapabilities = capabilities.filter(capability => {
            return capability.type === 5;
        });
        const webCapability = platformCapabilities.find(capability => {
            const uuid = this.decodeUUID(capability.data.slice(1, 17));
            const version = capability.data.readUInt16LE(17);
            return uuid === CONSTANTS.WEB_UUID && version === CONSTANTS.CAPABILITY_VERSION;
        });
        return webCapability;
    }
    decodeUUID(buffer) {
        const data1 = `00000000${buffer.readUInt32LE(0).toString(16)}`.slice(-8);
        const data2 = `0000${buffer.readUInt16LE(4).toString(16)}`.slice(-4);
        const data3 = `0000${buffer.readUInt16LE(6).toString(16)}`.slice(-4);
        const data4 = [];
        for (let i = 8; i < 10; i++) {
            data4.push(`00${buffer.readUInt8(i).toString(16)}`.slice(-2));
        }
        const data5 = [];
        for (let i = 10; i < 16; i++) {
            data5.push(`00${buffer.readUInt8(i).toString(16)}`.slice(-2));
        }
        return `${data1}-${data2}-${data3}-${data4.join("")}-${data5.join("")}`;
    }
    getWebUrl(device, capability, suppressErrors = true) {
        return new Promise((resolve, reject) => {
            if (!capability || !capability.data || capability.data.byteLength < 20)
                return resolve(null);
            const vendor = capability.data.readUInt8(19);
            const page = capability.data.readUInt8(20);
            this.openDevice(device)
                .then(() => {
                device.controlTransfer(CONSTANTS.URL_REQUEST_TYPE, vendor, page, CONSTANTS.URL_REQUEST_INDEX, 64, (error, buffer) => {
                    device.close();
                    if (error) {
                        // An error may be due to the URL not existing
                        if (suppressErrors)
                            return resolve(null);
                        else
                            return reject(error);
                    }
                    // const length = buffer.readUInt8(0);
                    // const type = buffer.readUInt8(1);
                    let url = buffer.toString("utf8", 3);
                    const scheme = buffer.readUInt8(2); // 0 - http, 1 - https, 255 - in url
                    if (scheme === 0)
                        url = "http://" + url;
                    if (scheme === 1)
                        url = "https://" + url;
                    resolve(url);
                });
            })
                .catch(_error => {
                resolve("");
            });
        });
    }
    devicetoUSBDevice(handle) {
        return new Promise((resolve, _reject) => {
            const device = this.devices[handle].device;
            const url = this.devices[handle].url;
            let configs = null;
            let configDescriptor = null;
            let deviceDescriptor = null;
            try {
                configDescriptor = device.configDescriptor;
                configs = device.allConfigDescriptors;
                deviceDescriptor = device.deviceDescriptor;
            }
            catch (_error) {
                return resolve(null);
            }
            if (!configs)
                return resolve(null);
            return this.serialDevicePromises(this.configToUSBConfiguration, device, configs)
                .then(configurations => {
                if (!deviceDescriptor) {
                    return resolve(new device_1.USBDevice({
                        _handle: this.getDeviceHandle(device),
                        url: url,
                        configurations: configurations
                    }));
                }
                const deviceVersion = this.decodeVersion(deviceDescriptor.bcdDevice);
                const usbVersion = this.decodeVersion(deviceDescriptor.bcdUSB);
                let manufacturerName = null;
                let productName = null;
                return this.getStringDescriptor(device, deviceDescriptor.iManufacturer)
                    .then(name => {
                    manufacturerName = name;
                    return this.getStringDescriptor(device, deviceDescriptor.iProduct);
                })
                    .then(name => {
                    productName = name;
                    return this.getStringDescriptor(device, deviceDescriptor.iSerialNumber);
                })
                    .then(serialNumber => {
                    const props = {
                        _handle: this.getDeviceHandle(device),
                        _maxPacketSize: deviceDescriptor.bMaxPacketSize0,
                        url: url,
                        deviceClass: deviceDescriptor.bDeviceClass,
                        deviceSubclass: deviceDescriptor.bDeviceSubClass,
                        deviceProtocol: deviceDescriptor.bDeviceProtocol,
                        productId: deviceDescriptor.idProduct,
                        vendorId: deviceDescriptor.idVendor,
                        deviceVersionMajor: deviceVersion.major,
                        deviceVersionMinor: deviceVersion.minor,
                        deviceVersionSubminor: deviceVersion.sub,
                        usbVersionMajor: usbVersion.major,
                        usbVersionMinor: usbVersion.minor,
                        usbVersionSubminor: usbVersion.sub,
                        manufacturerName: manufacturerName,
                        productName: productName,
                        serialNumber: serialNumber,
                        configurations: configurations,
                        _currentConfiguration: configDescriptor.bConfigurationValue
                    };
                    return resolve(new device_1.USBDevice(props));
                });
            }).catch(_error => {
                resolve(null);
            });
        });
    }
    decodeVersion(version) {
        const hex = `0000${version.toString(16)}`.slice(-4);
        return {
            major: parseInt(hex.substr(0, 2), null),
            minor: parseInt(hex.substr(2, 1), null),
            sub: parseInt(hex.substr(3, 1), null),
        };
    }
    getStringDescriptor(device, index) {
        return new Promise(resolve => {
            this.openDevice(device)
                .then(() => {
                device.getStringDescriptor(index, (error, buffer) => {
                    device.close();
                    resolve(error ? "" : buffer.toString());
                });
            })
                .catch(_error => {
                resolve("");
            });
        });
    }
    bufferToDataView(buffer) {
        const arrayBuffer = new Uint8Array(buffer).buffer;
        return new DataView(arrayBuffer);
    }
    bufferSourceToBuffer(bufferSource) {
        const arrayBuffer = ArrayBuffer.isView(bufferSource)
            ? bufferSource.buffer.slice(bufferSource.byteOffset, bufferSource.byteOffset + bufferSource.byteLength)
            : bufferSource;
        return Buffer.from(arrayBuffer);
    }
    getEndpoint(device, direction, endpointNumber) {
        let endpoint = null;
        const address = endpointNumber | (direction === "in" ? usb_1.LIBUSB_ENDPOINT_IN : usb_1.LIBUSB_ENDPOINT_OUT);
        device.interfaces.some(iface => {
            const epoint = iface.endpoint(address);
            if (epoint) {
                endpoint = epoint;
                return true;
            }
            return false;
        });
        return endpoint;
    }
    getInEndpoint(device, endpointNumber) {
        const endpoint = this.getEndpoint(device, "in", endpointNumber);
        if (endpoint && endpoint.direction === "in")
            return endpoint;
    }
    getOutEndpoint(device, endpointNumber) {
        const endpoint = this.getEndpoint(device, "out", endpointNumber);
        if (endpoint && endpoint.direction === "out")
            return endpoint;
    }
    endpointToUSBEndpoint(descriptor) {
        const direction = descriptor.bEndpointAddress & usb_1.LIBUSB_ENDPOINT_IN ? "in" : "out";
        return new endpoint_1.USBEndpoint({
            endpointNumber: descriptor.bEndpointAddress ^ (direction === "in" ? usb_1.LIBUSB_ENDPOINT_IN : usb_1.LIBUSB_ENDPOINT_OUT),
            direction: direction,
            type: (descriptor.bmAttributes & CONSTANTS.LIBUSB_TRANSFER_TYPE_MASK) === usb_1.LIBUSB_TRANSFER_TYPE_BULK ? "bulk"
                : (descriptor.bmAttributes & CONSTANTS.LIBUSB_TRANSFER_TYPE_MASK) === usb_1.LIBUSB_TRANSFER_TYPE_INTERRUPT ? "interrupt"
                    : "isochronous",
            packetSize: descriptor.wMaxPacketSize
        });
    }
    interfaceToUSBAlternateInterface(device, descriptor) {
        return this.getStringDescriptor(device, descriptor.iInterface)
            .then(name => {
            return new alternate_1.USBAlternateInterface({
                alternateSetting: descriptor.bAlternateSetting,
                interfaceClass: descriptor.bInterfaceClass,
                interfaceSubclass: descriptor.bInterfaceSubClass,
                interfaceProtocol: descriptor.bInterfaceProtocol,
                interfaceName: name,
                endpoints: descriptor.endpoints.map(this.endpointToUSBEndpoint)
            });
        });
    }
    interfacesToUSBInterface(device, descriptors) {
        return this.serialDevicePromises(this.interfaceToUSBAlternateInterface, device, descriptors)
            .then(alternates => {
            return new interface_1.USBInterface({
                _handle: this.getDeviceHandle(device),
                interfaceNumber: descriptors[0].bInterfaceNumber,
                alternates: alternates
            });
        });
    }
    configToUSBConfiguration(device, descriptor) {
        return this.getStringDescriptor(device, descriptor.iConfiguration)
            .then(name => {
            const allInterfaces = descriptor.interfaces || [];
            return this.serialDevicePromises(this.interfacesToUSBInterface, device, allInterfaces)
                .then(interfaces => {
                return new configuration_1.USBConfiguration({
                    configurationValue: descriptor.bConfigurationValue,
                    configurationName: name,
                    interfaces: interfaces
                });
            });
        });
    }
    getDevice(handle) {
        if (!this.devices[handle])
            return null;
        return this.devices[handle].device;
    }
    controlTransferParamsToType(setup, direction) {
        const recipient = setup.recipient === "device" ? usb_1.LIBUSB_RECIPIENT_DEVICE
            : setup.recipient === "interface" ? usb_1.LIBUSB_RECIPIENT_INTERFACE
                : setup.recipient === "endpoint" ? usb_1.LIBUSB_RECIPIENT_ENDPOINT
                    : usb_1.LIBUSB_RECIPIENT_OTHER;
        const requestType = setup.requestType === "standard" ? usb_1.LIBUSB_REQUEST_TYPE_STANDARD
            : setup.requestType === "class" ? usb_1.LIBUSB_REQUEST_TYPE_CLASS
                : usb_1.LIBUSB_REQUEST_TYPE_VENDOR;
        return recipient | requestType | direction;
    }
    openDevice(device, retries = 0) {
        return this.retryPromise(() => {
            return new Promise((resolve, reject) => {
                try {
                    device.open();
                }
                catch (error) {
                    return reject(error);
                }
                resolve();
            });
        }, retries);
    }
    getConnected(handle) {
        return this.getDevice(handle) !== null;
    }
    getOpened(handle) {
        const device = this.getDevice(handle);
        if (!device)
            return false;
        return (device.interfaces !== null);
    }
    listUSBDevices() {
        return this.loadDevices()
            .then(() => {
            return this.serialPromises(this.devicetoUSBDevice, Object.keys(this.devices));
        });
    }
    open(handle) {
        const device = this.getDevice(handle);
        return this.openDevice(device);
    }
    close(handle) {
        return new Promise((resolve, _reject) => {
            const device = this.getDevice(handle);
            device.close();
            resolve();
        });
    }
    selectConfiguration(handle, id) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            device.setConfiguration(id, error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
    claimInterface(handle, address) {
        return new Promise((resolve, _reject) => {
            const device = this.getDevice(handle);
            device.interface(address).claim();
            resolve();
        });
    }
    releaseInterface(handle, address) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            device.interface(address).release(true, error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
    selectAlternateInterface(handle, interfaceNumber, alternateSetting) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            const iface = device.interface(interfaceNumber);
            iface.setAltSetting(alternateSetting, error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
    controlTransferIn(handle, setup, length) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            const type = this.controlTransferParamsToType(setup, usb_1.LIBUSB_ENDPOINT_IN);
            device.controlTransfer(type, setup.request, setup.value, setup.index, length, (error, buffer) => {
                if (error) {
                    if (error.errno === usb_1.LIBUSB_TRANSFER_STALL) {
                        return resolve({
                            status: "stall"
                        });
                    }
                    else if (error.errno === usb_1.LIBUSB_TRANSFER_OVERFLOW) {
                        return resolve({
                            status: "babble"
                        });
                    }
                    return reject(error);
                }
                resolve({
                    data: this.bufferToDataView(buffer),
                    status: "ok"
                });
            });
        });
    }
    controlTransferOut(handle, setup, data) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            const type = this.controlTransferParamsToType(setup, usb_1.LIBUSB_ENDPOINT_OUT);
            const buffer = data ? this.bufferSourceToBuffer(data) : new Buffer(0);
            device.controlTransfer(type, setup.request, setup.value, setup.index, buffer, error => {
                if (error) {
                    if (error.errno === usb_1.LIBUSB_TRANSFER_STALL) {
                        return resolve({
                            bytesWritten: 0,
                            status: "stall"
                        });
                    }
                    return reject(error);
                }
                resolve({
                    bytesWritten: buffer.byteLength,
                    status: "ok" // hack
                });
            });
        });
    }
    clearHalt(handle, direction, endpointNumber) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            const wIndex = endpointNumber | (direction === "in" ? usb_1.LIBUSB_ENDPOINT_IN : usb_1.LIBUSB_ENDPOINT_OUT);
            device.controlTransfer(usb_1.LIBUSB_RECIPIENT_ENDPOINT, CONSTANTS.CLEAR_FEATURE, CONSTANTS.ENDPOINT_HALT, wIndex, 0, error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
    transferIn(handle, endpointNumber, length) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            const endpoint = this.getInEndpoint(device, endpointNumber);
            endpoint.transfer(length, (error, data) => {
                if (error) {
                    if (error.errno === usb_1.LIBUSB_TRANSFER_STALL) {
                        return resolve({
                            status: "stall"
                        });
                    }
                    else if (error.errno === usb_1.LIBUSB_TRANSFER_OVERFLOW) {
                        return resolve({
                            status: "babble"
                        });
                    }
                    return reject(error);
                }
                resolve({
                    data: this.bufferToDataView(data),
                    status: "ok"
                });
            });
        });
    }
    transferOut(handle, endpointNumber, data) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            const endpoint = this.getOutEndpoint(device, endpointNumber);
            const buffer = this.bufferSourceToBuffer(data);
            endpoint.transfer(buffer, error => {
                if (error) {
                    if (error.errno === usb_1.LIBUSB_TRANSFER_STALL) {
                        return resolve({
                            bytesWritten: 0,
                            status: "stall"
                        });
                    }
                    return reject(error);
                }
                resolve({
                    bytesWritten: buffer.byteLength,
                    status: "ok" // hack
                });
            });
        });
    }
    isochronousTransferIn(_handle, _endpointNumber, _packetLengths) {
        return new Promise((_resolve, reject) => {
            reject("isochronousTransferIn error: method not implemented");
        });
    }
    isochronousTransferOut(_handle, _endpointNumber, _data, _packetLengths) {
        return new Promise((_resolve, reject) => {
            reject("isochronousTransferOut error: method not implemented");
        });
    }
    reset(handle) {
        return new Promise((resolve, reject) => {
            const device = this.getDevice(handle);
            device.reset(error => {
                if (error)
                    return reject(error);
                resolve();
            });
        });
    }
}
USBAdapter.EVENT_DEVICE_CONNECT = "connect";
USBAdapter.EVENT_DEVICE_DISCONNECT = "disconnect";
exports.USBAdapter = USBAdapter;
/**
 * @hidden
 */
exports.adapter = new USBAdapter();
