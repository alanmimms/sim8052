'use strict';

module.exports = {
  toHex1,
  toHex2,
  toHex4,
};


function toHex1(v, prefix = '') {
  return prefix + (v & 0x0F).toString(16).toUpperCase();
}


function toHex2(v, prefix = '') {
  return prefix + (v | 0x100).toString(16).toUpperCase().slice(-2);
}


function toHex4(v, prefix = '') {
  return toHex2(v >>> 8, prefix) + toHex2(v & 0xFF);
}
