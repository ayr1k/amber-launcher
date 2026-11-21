// SPDX-License-Identifier: MPL-2.0
import {createConnection} from 'node:net';

export const DEFAULT_ROOM_PEER = 'tcp://easytier.weiai.org.cn:11010';

// Java Edition Server List Ping, sent only to the active room's loopback forward.
export function minecraftStatus(port, timeout = 3500) {
  return new Promise(resolve => {
    const socket = createConnection({host: '127.0.0.1', port});
    const timer = setTimeout(() => finish(false), timeout);
    let received = 0;
    const chunks = [];
    let frameLength, prefixLength;
    function finish(ok) {
      clearTimeout(timer);
      socket.destroy();
      resolve(ok);
    }
    socket.once('error', () => finish(false));
    socket.once('close', () => finish(false));
    socket.once('connect', () => {
      const address = Buffer.from('localhost');
      const handshake = Buffer.from([0, 0xff, 0xff, 0xff, 0xff, 0x0f, address.length,
        ...address, port >> 8, port & 255, 1]);
      socket.write(Buffer.concat([Buffer.from([handshake.length]), handshake, Buffer.from([1, 0])]));
    });
    socket.on('data', chunk => {
      received += chunk.length;
      if (received > 262144) return finish(false);
      chunks.push(chunk);
      if (frameLength === undefined) {
        const prefix = readLength(Buffer.concat(chunks, Math.min(received, 3)), 0);
        if (!prefix) return received >= 3 ? finish(false) : undefined;
        [frameLength, prefixLength] = prefix;
        if (frameLength + prefixLength > 262144) return finish(false);
      }
      if (received < frameLength + prefixLength) return;
      const data = Buffer.concat(chunks);
      const length = readLength(data, prefixLength + 1);
      if (data[prefixLength] !== 0 || !length || length[1] + length[0] !== prefixLength + frameLength) return finish(false);
      try {
        const reply = JSON.parse(data.toString('utf8', length[1], length[1] + length[0]));
        finish(typeof reply.version?.name === 'string' && Number.isInteger(reply.version.protocol) && reply.description != null);
      } catch { finish(false); }
    });
  });
}

function readLength(data, offset) {
  let length = 0;
  for (let i = 0; i < 3 && offset + i < data.length; i++) {
    const byte = data[offset + i];
    length |= (byte & 127) << (7 * i);
    if (!(byte & 128)) return [length, offset + i + 1];
  }
}
