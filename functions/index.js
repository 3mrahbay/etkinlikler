'use strict';
const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {initializeApp} = require('firebase-admin/app');
const {getAuth} = require('firebase-admin/auth');
const {getFirestore} = require('firebase-admin/firestore');
const {createHandler} = require('./media');
initializeApp();
const storage = defineSecret('ETKINLIK_BUNNY_STORAGE');
exports.etkinlikMedia = onRequest({region:'europe-west1',secrets:[storage],maxInstances:2,concurrency:10,memory:'512MiB',timeoutSeconds:60}, createHandler({
  verifyToken:(token, revoked) => getAuth().verifyIdToken(token, revoked),
  readSecret:() => storage.value(),
  consumeQuota:async uid => {
    const db = getFirestore();
    const ref = db.collection('etkinlikMediaKotalari').doc(uid);
    const minute = Math.floor(Date.now()/60000);
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const old = snap.data();
      const count = old?.minute === minute ? old.count : 0;
      if (count >= 30) return false;
      tx.set(ref,{minute,count:count+1});
      return true;
    });
  }
}));
