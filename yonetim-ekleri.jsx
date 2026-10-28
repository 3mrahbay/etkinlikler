/* ═══ YÖNETİM PANELİ EKLERİ: katılımcı türü seçici ve Instagram paylaşım ayarı ═══ */

function KatilimciTuruSecici({deger,degistir}){
const secili=KATILIMCI_TURLERI[deger]?deger:"aile";
return(<div style={{background:"#f9fcf9",borderRadius:10,padding:14,border:"1px solid #dce8dc"}}>
<label style={lbl}>👥 Kimler katılır?</label>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:6}}>
{KATILIMCI_TURU_SIRASI.map(k=>{const t=KATILIMCI_TURLERI[k];const aktif=secili===k;return(
<button key={k} type="button" onClick={()=>degistir(k)} style={{textAlign:"left",padding:"10px 12px",border:`2px solid ${aktif?t.renk:"#dce8dc"}`,background:aktif?t.zemin:"#fff",borderRadius:10,cursor:"pointer",fontFamily:ff}}>
<div style={{fontWeight:800,fontSize:13,color:aktif?t.renk:"#1b3a26"}}>{t.etiket}</div>
<div style={{fontSize:11,color:"#777",marginTop:2,lineHeight:1.4}}>{t.uzun}</div>
</button>)})}
</div>
<p style={{fontFamily:ff,fontSize:11,color:"#888",margin:"8px 0 0",lineHeight:1.5}}>
{KATILIMCI_TURLERI[secili].cocukKatilir
?"Çocuklar katılır: formda çocuk bilgileri, acil durum kişisi ve (isteğe bağlı) sağlık bilgisi istenir."
:"Çocuklar katılmaz: çocuğun yalnızca adı, soyadı ve doğum tarihi istenir; kontenjan yalnızca yetişkinlerle dolar."}
</p>
</div>)}

function InstagramPaylasimAyari({deger,degistir,kayitliMi}){
const ig=Object.assign({paylasimTuru:"yok"},deger||{});
const g=(k,v)=>degistir({...ig,[k]:v});
return(<div style={{background:"#fdf7fb",borderRadius:10,padding:14,border:"1px solid #f0d9e6"}}>
<label style={lbl}>📣 Instagram Reels</label>
<p style={{fontFamily:ff,fontSize:11,color:"#888",margin:"2px 0 8px",lineHeight:1.5}}>Etkinlik yayına alınınca seslendirmeli, animasyonlu bir Reels hazırlanır. Her etkinlik için nasıl paylaşılacağını seçin.</p>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8}}>
{Object.entries(INSTAGRAM_PAYLASIM_TURLERI).map(([k,t])=>{const aktif=ig.paylasimTuru===k;return(
<button key={k} type="button" onClick={()=>g("paylasimTuru",k)} style={{textAlign:"left",padding:"10px 12px",border:`2px solid ${aktif?"#b5367a":"#ecd5e2"}`,background:aktif?"#fbe4f0":"#fff",borderRadius:10,cursor:"pointer",fontFamily:ff}}>
<div style={{fontWeight:800,fontSize:13,color:aktif?"#8e2860":"#333"}}>{t.etiket}</div>
<div style={{fontSize:11,color:"#777",marginTop:2,lineHeight:1.4}}>{t.aciklama}</div>
</button>)})}
</div>
{ig.paylasimTuru==="reklam"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
<div><label style={lbl}>Günlük bütçe (TL)</label><input type="number" min="0" style={inp(false)} value={ig.butceGunluk||""} onChange={e=>g("butceGunluk",e.target.value)} placeholder="Örn. 150"/></div>
<div><label style={lbl}>Kaç gün yayında?</label><input type="number" min="1" style={inp(false)} value={ig.gunSayisi||""} onChange={e=>g("gunSayisi",e.target.value)} placeholder="Örn. 7"/></div>
</div>}
{ig.paylasimTuru!=="yok"&&<div style={{marginTop:10}}>
<label style={lbl}>Reels için not (isteğe bağlı)</label>
<textarea style={{...inp(false),minHeight:50,resize:"vertical"}} value={ig.not||""} onChange={e=>g("not",e.target.value)} placeholder="Örn. Psikolog eşliğinde olduğunu ve kontenjanın sınırlı olduğunu vurgulayalım."/>
</div>}
{ig.paylasimTuru!=="yok"&&kayitliMi&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:10}}>
<span style={{fontFamily:ff,fontSize:12,color:"#555"}}>Durum:</span>
<select style={{...inp(false),width:"auto",appearance:"auto"}} value={ig.durum||"hazirlanacak"} onChange={e=>g("durum",e.target.value)}>
{Object.entries(INSTAGRAM_DURUMLARI).map(([k,v])=><option key={k} value={k}>{v}</option>)}
</select>
<label style={{display:"flex",gap:6,alignItems:"center",fontFamily:ff,fontSize:12,color:"#555",cursor:"pointer"}}><input type="checkbox" checked={ig.yenidenHazirla===true} onChange={e=>g("yenidenHazirla",e.target.checked)}/>Reels'i yeniden hazırlat</label>
</div>}
</div>)}

// Etkinlik listesinde küçük Reels rozeti
function InstagramRozeti({ev}){
const ig=ev.instagram;
if(!ig||!ig.paylasimTuru||ig.paylasimTuru==="yok")return null;
const renk={hazirlanacak:["#fff3e0","#b45309"],hazir:["#e3f2fd","#1565c0"],paylasildi:["#e8f5e9","#2e7d32"]}[ig.durum]||["#f5f5f5","#666"];
return(<span style={{background:renk[0],color:renk[1],padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:700,fontFamily:ff,whiteSpace:"nowrap"}}>
Reels · {INSTAGRAM_PAYLASIM_TURLERI[ig.paylasimTuru]?.etiket} · {INSTAGRAM_DURUMLARI[ig.durum]||"—"}
</span>)}
