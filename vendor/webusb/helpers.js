"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("assert");
/**
 * @param num - must be short int(2 bytes).
 * encodes short int to hex. (Always return 4 byte hex)
 */
function encodeU16ToHex(num) {
    assert_1.ok((num & 0xffff) === num);
    const hex = num.toString(16);
    return "0".repeat(4 - hex.length) + hex;
}
exports.encodeU16ToHex = encodeU16ToHex;
/**
 * This will encode device to string for mapping.
 * Format will be concatination of:
 *  `0000-ffff` - hex of vendorId (short int)
 *  `0000-ffff` - hex of productId (short int)
 *  `...` - serial number is optional string.
 */
function deviceToKey(device) {
    const vendorId = encodeU16ToHex(device.vendorId);
    const productId = encodeU16ToHex(device.productId);
    return vendorId + productId + device.serialNumber;
}
exports.deviceToKey = deviceToKey;
