/**
 * lz-string.mjs — LZ-String 算法实现（base64 / URI-safe / raw 三种变体）
 *
 * 秀米编辑器用 LZString.compressToBase64 打包作品数据（`encodedData` 字段），
 * 这里实现 compress / decompress 以便读写作品内容。算法与上游 lz-string 1.4.x 一致。
 */

const keyStrBase64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
const keyStrUriSafe = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
const baseReverseDic = {};

function getBaseValue(alphabet, character) {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (let i = 0; i < alphabet.length; i++) baseReverseDic[alphabet][alphabet.charAt(i)] = i;
  }
  return baseReverseDic[alphabet][character];
}

// ------------------------------------------------------------------ 压缩

function _compress(uncompressed, bitsPerChar, getCharFromInt) {
  if (uncompressed == null) return '';
  const context_dictionary = {};
  const context_dictionaryToCreate = {};
  let context_c = '';
  let context_wc = '';
  let context_w = '';
  let context_enlargeIn = 2;
  let context_dictSize = 3;
  let context_numBits = 2;
  const context_data = [];
  let context_data_val = 0;
  let context_data_position = 0;

  for (let ii = 0; ii < uncompressed.length; ii += 1) {
    context_c = uncompressed.charAt(ii);
    if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
      context_dictionary[context_c] = context_dictSize++;
      context_dictionaryToCreate[context_c] = true;
    }
    context_wc = context_w + context_c;
    if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
      context_w = context_wc;
    } else {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
        if (context_w.charCodeAt(0) < 256) {
          for (let i = 0; i < context_numBits; i++) {
            context_data_val = context_data_val << 1;
            if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
            else context_data_position++;
          }
          let value = context_w.charCodeAt(0);
          for (let i = 0; i < 8; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
            else context_data_position++;
            value = value >> 1;
          }
        } else {
          let value = 1;
          for (let i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
            else context_data_position++;
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (let i = 0; i < 16; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
            else context_data_position++;
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
        delete context_dictionaryToCreate[context_w];
      } else {
        let value = context_dictionary[context_w];
        for (let i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
          else context_data_position++;
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
      context_dictionary[context_wc] = context_dictSize++;
      context_w = String(context_c);
    }
  }

  if (context_w !== '') {
    if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
      if (context_w.charCodeAt(0) < 256) {
        for (let i = 0; i < context_numBits; i++) {
          context_data_val = context_data_val << 1;
          if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
          else context_data_position++;
        }
        let value = context_w.charCodeAt(0);
        for (let i = 0; i < 8; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
          else context_data_position++;
          value = value >> 1;
        }
      } else {
        let value = 1;
        for (let i = 0; i < context_numBits; i++) {
          context_data_val = (context_data_val << 1) | value;
          if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
          else context_data_position++;
          value = 0;
        }
        value = context_w.charCodeAt(0);
        for (let i = 0; i < 16; i++) {
          context_data_val = (context_data_val << 1) | (value & 1);
          if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
          else context_data_position++;
          value = value >> 1;
        }
      }
      context_enlargeIn--;
      if (context_enlargeIn === 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
      delete context_dictionaryToCreate[context_w];
    } else {
      let value = context_dictionary[context_w];
      for (let i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
        else context_data_position++;
        value = value >> 1;
      }
    }
    context_enlargeIn--;
    if (context_enlargeIn === 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
  }

  let value = 2;
  for (let i = 0; i < context_numBits; i++) {
    context_data_val = (context_data_val << 1) | (value & 1);
    if (context_data_position === bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; }
    else context_data_position++;
    value = value >> 1;
  }

  for (;;) {
    context_data_val = context_data_val << 1;
    if (context_data_position === bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; }
    context_data_position++;
  }
  return context_data.join('');
}

// ------------------------------------------------------------------ 解压

function _decompress(length, resetValue, getNextValue) {
  const dictionary = [];
  let enlargeIn = 4;
  let dictSize = 4;
  let numBits = 3;
  let entry = '';
  const result = [];
  let i;
  let w;
  let bits, resb, maxpower, power;
  let c;
  const data = { val: getNextValue(0), position: resetValue, index: 1 };

  for (i = 0; i < 3; i += 1) dictionary[i] = i;

  bits = 0; maxpower = Math.pow(2, 2); power = 1;
  while (power !== maxpower) {
    resb = data.val & data.position;
    data.position >>= 1;
    if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
    bits |= (resb > 0 ? 1 : 0) * power;
    power <<= 1;
  }

  switch (bits) {
    case 0:
      bits = 0; maxpower = Math.pow(2, 8); power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
        bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
      }
      c = String.fromCharCode(bits);
      break;
    case 1:
      bits = 0; maxpower = Math.pow(2, 16); power = 1;
      while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
        bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
      }
      c = String.fromCharCode(bits);
      break;
    case 2:
      return '';
    default:
      break;
  }
  dictionary[3] = c;
  w = c;
  result.push(c);
  for (;;) {
    if (data.index > length) return '';
    bits = 0; maxpower = Math.pow(2, numBits); power = 1;
    while (power !== maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
      bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
    }
    switch ((c = bits)) {
      case 0:
        bits = 0; maxpower = Math.pow(2, 8); power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
          bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1; enlargeIn--; break;
      case 1:
        bits = 0; maxpower = Math.pow(2, 16); power = 1;
        while (power !== maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position === 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
          bits |= (resb > 0 ? 1 : 0) * power; power <<= 1;
        }
        dictionary[dictSize++] = String.fromCharCode(bits);
        c = dictSize - 1; enlargeIn--; break;
      case 2:
        return result.join('');
      default:
        break;
    }
    if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
    if (dictionary[c]) entry = dictionary[c];
    else if (c === dictSize) entry = w + w.charAt(0);
    else return null;
    result.push(entry);
    dictionary[dictSize++] = w + entry.charAt(0);
    enlargeIn--;
    w = entry;
    if (enlargeIn === 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
  }
}

// ------------------------------------------------------------------ 对外

export function compressToBase64(input) { return _compress(input, 6, (a) => keyStrBase64.charAt(a)); }
export function decompressFromBase64(input) {
  if (input == null) return '';
  if (input === '') return null;
  return _decompress(input.length, 32, (index) => getBaseValue(keyStrBase64, input.charAt(index)));
}
export function compressToUTF16(input) { return _compress(input, 15, (a) => String.fromCharCode(a + 32)) + ' '; }
export function decompressFromUTF16(compressed) {
  if (compressed == null) return '';
  if (compressed === '') return null;
  return _decompress(compressed.length, 16384, (index) => compressed.charCodeAt(index) - 32);
}
export function compressToURIComponent(input) { return _compress(input, 6, (a) => keyStrUriSafe.charAt(a)); }
export function decompressFromURIComponent(input) {
  if (input == null) return '';
  if (input === '') return null;
  return _decompress(input.length, 32, (index) => getBaseValue(keyStrUriSafe, input.charAt(index)));
}

export const LZString = {
  compressToBase64, decompressFromBase64,
  compressToUTF16, decompressFromUTF16,
  compressToURIComponent, decompressFromURIComponent,
};
export default LZString;
