import { fromBER } from 'asn1js'
import {
  arrayBufferToString,
  stringToArrayBuffer,
  fromBase64,
  toBase64
} from 'pvutils'

const Types = {
  CERTIFICATE: 'CERTIFICATE',
  CERTIFICATE_REQUEST: 'CERTIFICATE REQUEST',
  PRIVATE_KEY: 'PRIVATE KEY'
};

function addLineBreaks(base64: any) {
  const length = base64.length;
  let result = '';

  for (let i = 0, count = 0; i < length; i++, count++) {
    if (count > 63) {
      result = result + '\n';
      count = 0;
    }
    result = `${result}${base64[i]}`;
  }

  return result;
}

function addHeaderFooter(base64: any, type: any) {
  return `-----BEGIN ${type}-----\n${base64}\n-----END ${type}-----\n`;
}

function pemRegexpFor(type: any) {
  return new RegExp(`(\\s*-+(BEGIN|END)\\s+${type}-+)|\\n`, 'g');
}

export { Types };

export function formatBase64(base64: any, type: any) {
  return addHeaderFooter(
    addLineBreaks(base64),
    type
  );
}

export function formatBuffer(buffer: any, type: any) {
  return formatBase64(
    bufferToBase64(buffer),
    type
  );
}

export function stripHeaderFooter(base64: any, type: any) {
  return base64.replace(pemRegexpFor(type), '');
}

export function parseASN1(pem: any, type: any) {
  if (!type) throw 'Type must be provided for parseASN1';

  return fromBER(
    stringToArrayBuffer(fromBase64(stripHeaderFooter(pem, type)))
  );
}

export function bufferToBase64(buffer: any) {
  return toBase64(arrayBufferToString(buffer));
}
