
module.exports = {
  toHex1,
  toHex2,
  toHex4,
};


function toHex1(v) {
  return (v & 0x0F).toString(16).toUpperCase();
}


function toHex2(v) {
  return (v | 0x100).toString(16).toUpperCase().slice(-2);
}


function toHex4(v) {
  return toHex2(v >>> 8) + toHex2(v & 0xFF);
}
