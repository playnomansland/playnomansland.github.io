// Players online (2026-11-10): one OnlineRoom ('all', like LobbyRoom) counts the game pages open right now, guests and
// signed-out visitors too (the friends hubs only see Google accounts). Every page keeps one socket here while it is open:
//
// WebSocket /online?d=<device>   (device: a random id the page keeps in localStorage, so two tabs count as one)
//   in:  ping (every 30 s; answered without waking the object)
//        hello { session } (2026-11-10): who this page is signed in as (session token or null, sent on connect and
//        when the page signs in or out). The server looks the session up itself and keeps only the player id on
//        the socket, so a page can't pass for someone else. At most ONLINE.hellos a minute per socket.
//   out: pong
//
// The sockets hibernate, so an open page costs nothing between pings. A page counts while its last ping (or, before the
// first one, its connection) is under ONLINE.staleMs old: a phone that went to sleep without closing drops out by itself.
// Each socket is tagged with its device and a hash of its IP (never the IP), so ONLINE.perIp can turn away a flood.
// RPC: count() -> { online } (accounts.js /account/online, developers only).
//      who() -> { online, players: [{ id, devices }], anon } (2026-11-10, /account/online { list: true }): the players
//      signed in on an open page, with how many of their devices are open, and how many open devices have no account.
import { DurableObject } from 'cloudflare:workers';
import { json } from './limits.js';
import { sessionId } from './accounts.js';

export const ONLINE = {
  staleMs: 90e3,      // pages ping every 30 s
  perIp: 30,          // open sockets from one IP (a household, a school: several devices behind one address)
  max: 20000,         // sockets in all; past this new pages are turned away (they retry, the count stays a floor)
  hellos: 6,          // hello messages per socket per minute (signing in and out); more are ignored
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

  // ping is answered by the auto response; hello says who the page is signed in as; anything else is ignored
  async webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > 200) return;
    let d = null; try { d = JSON.parse(message); } catch (e) { return; }
    if (!d || d.t !== 'hello') return;
    const att = ws.deserializeAttachment() || {}, now = Date.now();
    if (!att.hw || now - att.hw > 60e3) { att.hw = now; att.hn = 0; }
    if (++att.hn > ONLINE.hellos) { ws.serializeAttachment(att); return; }
    const seq = att.hs = (att.hs | 0) + 1; // the newest hello wins, even if an older one's lookup finishes later
    ws.serializeAttachment(att);
    let pid = null;
    try { pid = d.session == null ? null : await sessionId(this.env, d.session); } catch (e) { pid = null; }
    const cur = ws.deserializeAttachment() || {};
    if (cur.hs !== seq) return;
    ws.serializeAttachment({ ...cur, at: Date.now(), pid: pid || null });
  }
  webSocketClose(ws, code) { try { ws.close(code === 1005 ? 1000 : code, ''); } catch (e) { /* already closed */ } }
  webSocketError() {}

  // the devices with a page open now
  count(now = Date.now()) { return { online: this.live(now).size }; }

  // who: the players signed in on an open page (with how many of their devices), and the devices with no account
  who(now = Date.now()) {
    const live = this.live(now), players = new Map();
    let anon = 0;
    for (const pids of live.values()) {
      if (!pids.size) { anon++; continue; }
      for (const id of pids) players.set(id, (players.get(id) || 0) + 1);
    }
    return { online: live.size, players: [...players].map(([id, devices]) => ({ id, devices })), anon };
  }

  // device -> the player ids signed in on its open pages (empty: no account), for pages that pinged lately
  live(now) {
    const devices = new Map();
    for (const ws of this.ctx.getWebSockets()) {
      const pong = this.ctx.getWebSocketAutoResponseTimestamp(ws), att = ws.deserializeAttachment() || {};
      const at = Math.max(pong ? pong.getTime() : 0, att.at || 0);
      if (now - at > (+this.env.ONLINE_STALE_MS || ONLINE.staleMs)) continue; // ONLINE_STALE_MS: tests only
      const d = this.ctx.getTags(ws).find((t) => t.startsWith('d:'));
      if (!d) continue;
      if (!devices.has(d)) devices.set(d, new Set());
      if (att.pid) devices.get(d).add(att.pid);
    }
    return devices;
  }
}
