const {test} = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const {createHandler,config} = require('../media');
const secret = JSON.stringify({zone:'test-zone',password:'test-only-password',host:'storage.bunnycdn.com',cdnUrl:'https://test-zone.b-cdn.net'});
const admin = {uid:'admin',email:'emrahby@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com'}};
const path = 'etkinlikler/managed/12345678-1234-1234-1234-123456789abc.jpg';
async function run({headers={},method='POST',body=Buffer.from('invalid'),query={},user=admin,revoked=false,quota=true,providerOK=true,providerError=false,secretValue=secret}={}) {
  const calls=[]; let quotaCalls=0,verifyArgs;
  const req={method,rawBody:body,query,get:n=>({...{'Origin':'https://etkinlikler.bircicekkoleji.com','Authorization':'Bearer test','Content-Type':'image/png'},...headers})[n]};
  const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(v){this.body=v;return this},send(v){this.body=v;return this}};
  await createHandler({verifyToken:async(...args)=>{verifyArgs=args;if(revoked)throw Error('revoked');return user},readSecret:()=>secretValue,consumeQuota:async()=>{quotaCalls++;return quota},uuid:()=> '12345678-1234-1234-1234-123456789abc',fetchImpl:async(...args)=>{calls.push(args);if(providerError)throw Error('test-only-password');return {ok:providerOK}}})(req,res);
  return {res,calls,quotaCalls,verifyArgs};
}
test('missing auth, revoked token, nonadmin, unverified email and non-Google login never reach storage', async()=>{
  for(const options of [{headers:{Authorization:''}},{revoked:true},{user:{...admin,email:'outsider@example.com'}},{user:{...admin,email_verified:false}},{user:{...admin,firebase:{sign_in_provider:'password'}}}]) {
    const r=await run(options);assert.ok([401,403].includes(r.res.statusCode));assert.equal(r.calls.length,0);
  }
});
test('foreign/missing origins and unsupported methods fail closed',async()=>{
  for(const options of [{headers:{Origin:'https://evil.example'}},{headers:{Origin:''}},{method:'GET'}]){const r=await run(options);assert.ok([403,405].includes(r.res.statusCode));assert.equal(r.calls.length,0)}
});
test('preflight does not require bearer and cannot upload',async()=>{const r=await run({method:'OPTIONS',headers:{Authorization:''}});assert.equal(r.res.statusCode,204);assert.equal(r.calls.length,0)});
test('malformed, oversized and spoofed SVG files cannot reach storage',async()=>{
  for(const options of [{},{body:Buffer.alloc(5*1024*1024+1)},{headers:{'Content-Type':'image/svg+xml'}},{body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>')}]){const r=await run(options);assert.ok([413,415].includes(r.res.statusCode));assert.equal(r.calls.length,0)}
});
test('valid image is reencoded, revocation checked, scoped server path returned, secret stays server-side',async()=>{
  const body=await sharp({create:{width:2,height:2,channels:3,background:'white'}}).png().toBuffer();
  const r=await run({body});assert.equal(r.res.statusCode,200);assert.equal(r.verifyArgs[1],true);assert.equal(r.calls[0][0],'https://storage.bunnycdn.com/test-zone/'+path);assert.equal(r.calls[0][1].headers.AccessKey,'test-only-password');assert.equal(r.calls[0][1].redirect,'error');assert.equal((await sharp(r.calls[0][1].body).metadata()).format,'jpeg');assert.equal(r.res.body.path,path);assert.ok(!JSON.stringify(r.res).includes('test-only-password'));
});
test('traversal, external URLs, old assets and array paths cannot be deleted',async()=>{
  for(const value of ['../x','etkinlikler/old.jpg','https://evil.example/x','etkinlikler/managed/../x.jpg',[path]]){const r=await run({method:'DELETE',query:{path:value}});assert.equal(r.res.statusCode,400);assert.equal(r.calls.length,0)}
});
test('authorized deletion only forwards the validated managed path',async()=>{const r=await run({method:'DELETE',query:{path}});assert.equal(r.res.statusCode,200);assert.equal(r.calls[0][1].method,'DELETE')});
test('quota rejection blocks upstream requests',async()=>{const r=await run({method:'DELETE',query:{path},quota:false});assert.equal(r.res.statusCode,429);assert.equal(r.calls.length,0)});
test('provider errors and missing secrets do not leak provider content',async()=>{
  for(const extra of [{providerOK:false},{providerError:true},{secretValue:''}]){const r=await run({method:'DELETE',query:{path},...extra});assert.ok([502,503].includes(r.res.statusCode));assert.ok(!JSON.stringify(r.res).includes('test-only-password'))}
});
test('server config prevents arbitrary upstream hosts and credential-bearing CDN URLs',()=>{
  for(const c of [{host:'evil.example'},{zone:'../x'},{cdnUrl:'http://example.com'},{cdnUrl:'https://user:password@example.com'}])assert.throws(()=>config(JSON.stringify({...JSON.parse(secret),...c})));
});
