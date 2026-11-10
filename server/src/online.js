// Players online (2026-11-10): one OnlineRoom ('all', like LobbyRoom) counts the game pages open right now, guests and
// signed-out visitors too (the friends hubs only see Google accounts). Every page keeps one socket here while it is open:
//
// WebSocket /online?d=<device>   (device: a random id the page keeps in localStorage, so two tabs count as one)
//   in:  ping (every 30 s; answered without waking the object), nothing else
//   out: pong
//
// The sockets hibernate, so an open page costs nothing between pings. A page counts while its last ping (or, before the
// first one, its connection) is under ONLINE.staleMs old: a phone that went to sleep without closing drops out by itself.
// Each socket is tagged with its device and a hash of its IP (never the IP), so ONLINE.perIp can turn away a flood.
// RPC: count() -> { online } (accounts.js /account/online, developers only).
import { DurableObject } from 'cloudflare:workers';
import { json } from './limits.js';

export const ONLINE = {
  staleMs: 90e3,      // pages ping every 30 s
  perIp: 30,          // open sockets from one IP (a household, a school: several devices behind one address)
  max: 20000,         // sockets in all; past this new pages are turned away (they retry, the count stays a floor)
};
export const DEVICE_RE = /^[a-z0-9]{8,32}$/;

export class OnlineRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  // the worker (index.js) has checked the origin and the device id, and puts the IP's hash in x-ip
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') return json({ error: 'websocket only' }, 426);
    const device = request.headers.get('x-device') || '', ip = 'ip:' + (request.headers.get('x-ip') || 'none');
    if (!DEVICE_RE.test(device)) return json({ error: 'bad device' }, 400);
    if (this.ctx.getWebSockets(ip).length >= ONLINE.perIp || this.ctx.getWebSockets().length >= ONLINE.max) return json({ error: 'busy' }, 429);
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, ['d:' + device, ip]);
    server.serializeAttachment({ at: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  // a page only ever sends ping (answered by the auto response); anything else is ignored
  webSocketMessage() {}
  webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, ''); } catch (e) { /* already closed */ } }
  webSocketError() {}

  // the devices with a page open now
  count(now = Date.now()) {
    const devices = new Set();
    for (const ws of this.ctx.getWebSockets()) {
      const pong = this.ctx.getWebSocketAutoResponseTimestamp(ws), att = ws.deserializeAttachment() || {};
      const at = Math.max(pong ? pong.getTime() : 0, att.at || 0);
      if (now - at > (+this.env.ONLINE_STALE_MS || ONLINE.staleMs)) continue; // ONLINE_STALE_MS: tests only
      const d = this.ctx.getTags(ws).find((t) => t.startsWith('d:'));
      if (d) devices.add(d);
    }
    return { online: devices.size };
  }
}
