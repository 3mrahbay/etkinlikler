'use strict';
const { randomUUID } = require('node:crypto');
const sharp = require('sharp');
const ORIGIN = 'https://etkinlikler.bircicekkoleji.com';
const MAX_BYTES = 5 * 1024 * 1024;
const MANAGED_PATH = /^etkinlikler\/managed\/[a-f0-9-]{36}\.jpg$/;
const STORAGE_HOSTS = new Set(['storage.bunnycdn.com','ny.storage.bunnycdn.com','la.storage.bunnycdn.com','sg.storage.bunnycdn.com','syd.storage.bunnycdn.com','uk.storage.bunnycdn.com','se.storage.bunnycdn.com','br.storage.bunnycdn.com','jh.storage.bunnycdn.com']);
function config(value) {
  const c = JSON.parse(value);
  if (!/^[a-zA-Z0-9_-]+$/.test(c.zone) || typeof c.password !== 'string' || !c.password || !STORAGE_HOSTS.has(c.host)) throw new Error('Invalid server config');
  const cdn = new URL(c.cdnUrl);
  if (cdn.protocol !== 'https:' || cdn.username || cdn.password || cdn.port || cdn.pathname !== '/' || cdn.search || cdn.hash) throw new Error('Invalid CDN origin');
  return {...c, cdnUrl: cdn.origin};
}
function createHandler({verifyToken, readSecret, consumeQuota, fetchImpl = fetch, uuid = randomUUID}) {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.set('Vary', 'Origin');
    res.set('X-Content-Type-Options', 'nosniff');
    if (req.get('Origin') !== ORIGIN) return res.status(403).json({error:'origin-denied'});
    res.set('Access-Control-Allow-Origin', ORIGIN);
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST, DELETE');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      return res.status(204).send('');
    }
    if (!['POST', 'DELETE'].includes(req.method)) return res.status(405).json({error:'method-denied'});
    const bearer = /^Bearer ([^\s]+)$/.exec(req.get('Authorization') || '');
    if (!bearer) return res.status(401).json({error:'authentication-required'});
    let user;
    try { user = await verifyToken(bearer[1], true); }
    catch { return res.status(401).json({error:'invalid-session'}); }
    if (user.email !== 'emrahby@gmail.com' || user.email_verified !== true || user.firebase?.sign_in_provider !== 'google.com') return res.status(403).json({error:'admin-required'});
    try {
      let path, body;
      if (req.method === 'POST') {
        if (!['image/jpeg','image/png','image/webp'].includes(req.get('Content-Type'))) return res.status(415).json({error:'image-type-required'});
        if (!Buffer.isBuffer(req.rawBody) || !req.rawBody.length || req.rawBody.length > MAX_BYTES) return res.status(413).json({error:'invalid-image-size'});
        try {
          const image = sharp(req.rawBody, {limitInputPixels: 25000000, animated:false});
          const metadata = await image.metadata();
          if (!['jpeg','png','webp'].includes(metadata.format) || metadata.pages > 1) return res.status(415).json({error:'image-type-required'});
          // Decode and re-encode, stripping metadata and untrusted embedded content.
          body = await image.rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
        } catch { return res.status(415).json({error:'invalid-image'}); }
        path = 'etkinlikler/managed/' + uuid() + '.jpg';
      } else {
        path = req.query.path;
        if (typeof path !== 'string' || !MANAGED_PATH.test(path)) return res.status(400).json({error:'invalid-managed-path'});
      }
      if (!await consumeQuota(user.uid)) return res.status(429).json({error:'rate-limited'});
      const c = config(await readSecret());
      const upstream = await fetchImpl(`https://${c.host}/${c.zone}/${path}`, {
        method:req.method === 'POST' ? 'PUT' : 'DELETE',
        headers:{AccessKey:c.password,'Content-Type':'image/jpeg'},
        ...(body ? {body} : {}), redirect:'error', signal:AbortSignal.timeout(20000)
      });
      // Never forward provider bodies, headers or exceptions: they may contain secrets.
      if (!upstream.ok) return res.status(502).json({error:'media-provider-failed'});
      return res.status(200).json(req.method === 'POST' ? {url:c.cdnUrl+'/'+path,path} : {deleted:true});
    } catch { return res.status(503).json({error:'media-unavailable'}); }
  };
}
module.exports = {createHandler, config};
