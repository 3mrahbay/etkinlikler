/* ═══ ZİYARETÇİ SAYFASI (VİTRİN) ═══
   Açılış, öne çıkan etkinlik, "kimler için" filtreleri, yaklaşan ve geçmiş etkinlikler. */


// Kontenjan: önce herkese açık filledSpots, yoksa (yönetici için) kayıtlardan hesap
function dolulukHesapla(ev,regs){
if(typeof ev.filledSpots==="number"&&ev.filledSpots>0)return ev.filledSpots;
const evRegs=(regs||[]).filter(r=>r.eventId===ev.id);
return evRegs.reduce((t,r)=>{if(typeof r.totalAttendees==="number")return t+r.totalAttendees;return t+(parseInt(r.parent?.attendeeCount)||1)+(r.children||[]).length},0);
}
function etkinlikBitti(ev){return new Date(ev.date+"T"+(ev.endTime||ev.startTime||"23:59")).getTime()<Date.now()}
function gunAdi(ev){return new Date(ev.date+"T12:00").toLocaleDateString("tr-TR",{weekday:"long"})}

// Görseli olmayan etkinlikte katılımcı türünün renginde kapak
function KapakGorseli({ev,kucuk}){
if(ev.images?.[0])return<img src={ev.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",filter:kucuk?"saturate(0.7)":"none"}}/>;
const t=katilimciTuruBilgisi(ev);
return(<span aria-hidden="true" style={{position:"relative",display:"flex",alignItems:"flex-end",width:"100%",height:"100%",background:t.zemin,overflow:"hidden"}}>
<span style={{position:"absolute",width:kucuk?60:220,height:kucuk?60:220,borderRadius:"50%",background:t.renk,opacity:0.14,right:kucuk?-14:-40,top:kucuk?-18:-60}}/>
<span style={{position:"absolute",width:kucuk?34:120,height:kucuk?34:120,borderRadius:"50%",background:t.renk,opacity:0.1,left:kucuk?-8:30,bottom:kucuk?-12:-30}}/>
{!kucuk&&<span style={{position:"relative",padding:"0 18px 16px",fontFamily:ffT,fontWeight:700,fontSize:26,color:t.renk,lineHeight:1.1}}>{t.etiket}</span>}
</span>)}

function KatilimciRozeti({ev,kucuk}){
const t=katilimciTuruBilgisi(ev);
return(<span style={{display:"inline-block",background:t.zemin,color:t.renk,padding:kucuk?"2px 9px":"4px 12px",borderRadius:999,fontSize:kucuk?11:12,fontWeight:800,fontFamily:ff,whiteSpace:"nowrap"}}>{t.etiket}</span>)}

function ErisimRozeti({ev,koyu}){
const acik=(ev.audience||"bircicekli")==="public";
const renk=acik?(koyu?"#fde68a":"#9a3412"):(koyu?"#c7d4f0":"#1b2d55");
return(<span style={{fontSize:11,fontWeight:700,color:renk,fontFamily:ff,whiteSpace:"nowrap"}}>{acik?"Herkese açık":"Bir Çiçekli ailelere özel"}</span>)}

function KayitDugmesi({ev,dolu,onReg,genis}){
return(<button onClick={()=>onReg(ev)} disabled={dolu} style={{...btnP,flex:genis?1:"none",padding:"12px 20px",fontSize:14,borderRadius:12,opacity:dolu?0.5:1,cursor:dolu?"not-allowed":"pointer"}}>{dolu?"Kontenjan doldu":"Kayıt ol"}</button>)}

function OneCikanEtkinlik({ev,regs,onReg,onDet}){
const rc=dolulukHesapla(ev,regs);const dolu=ev.capacity>0&&rc>=ev.capacity;const kalan=ev.capacity-rc;
return(<div style={{position:"relative"}}>
{/* Süs şekilleri: altın halka, turuncu leke, noktalı desen, döndürülmüş kare */}
<span aria-hidden="true" style={{position:"absolute",width:250,height:250,borderRadius:"50%",border:"3px solid rgba(241,210,127,0.55)",top:-46,right:-56}}/>
<span aria-hidden="true" style={{position:"absolute",width:190,height:190,background:"radial-gradient(circle at 30% 30%,#f08a3c,#c2410c)",borderRadius:"42% 58% 63% 37% / 41% 44% 56% 59%",bottom:-34,left:-46,opacity:0.92}}/>
<span aria-hidden="true" style={{position:"absolute",width:130,height:130,backgroundImage:"radial-gradient(rgba(241,210,127,0.75) 2px, transparent 2.6px)",backgroundSize:"16px 16px",top:24,left:-62}}/>
<span aria-hidden="true" style={{position:"absolute",width:36,height:36,border:"3px solid #e9c46a",borderRadius:8,transform:"rotate(22deg)",bottom:56,right:-24}}/>
<span aria-hidden="true" style={{position:"absolute",width:14,height:14,borderRadius:"50%",background:"#e9c46a",top:-14,left:90}}/>
<div style={{position:"relative",zIndex:1,background:"#fff",borderRadius:24,overflow:"hidden",boxShadow:"0 24px 60px rgba(5,10,25,0.45)",border:"1px solid rgba(241,210,127,0.7)",display:"flex",flexDirection:"column"}}>
<div style={{position:"relative",height:190,background:"#e9e4d8"}}>
<KapakGorseli ev={ev}/>
<span style={{position:"absolute",top:12,left:12,background:ALTIN,color:"#14213d",boxShadow:"0 2px 8px rgba(0,0,0,0.18)",fontFamily:ff,fontWeight:800,fontSize:11,letterSpacing:1,padding:"5px 10px",borderRadius:8}}>SIRADAKİ ETKİNLİK</span>
</div>
<div style={{padding:"18px 20px 20px",display:"flex",flexDirection:"column",gap:10}}>
<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><KatilimciRozeti ev={ev}/><ErisimRozeti ev={ev}/></div>
<h2 style={{margin:0,fontFamily:ffT,fontWeight:700,fontSize:22,lineHeight:1.25,color:"#14213d"}}>{ev.title}</h2>
<div style={{fontFamily:ff,fontSize:14,color:"#4a5468",lineHeight:1.5}}>{fmtDate(ev.date)}, {gunAdi(ev)} · {ev.startTime}{ev.endTime?"–"+ev.endTime:""}<br/>{ev.location}</div>
<Countdown date={ev.date+"T"+ev.startTime}/>
<div style={{display:"flex",gap:8,alignItems:"center"}}>
<KayitDugmesi ev={ev} dolu={dolu} onReg={onReg} genis/>
<button onClick={()=>onDet(ev)} style={{...btnS,padding:"12px 16px",fontSize:14,borderRadius:12}}>Detay</button>
</div>
{ev.capacity>0&&!dolu&&kalan<=Math.max(5,ev.capacity*0.2)&&<div style={{fontFamily:ff,fontSize:12,fontWeight:700,color:"#b45309"}}>Son {kalan} yer</div>}
</div>
</div>
</div>)}

function EtkinlikKarti({ev,regs,onReg,onDet}){
const rc=dolulukHesapla(ev,regs);const dolu=ev.capacity>0&&rc>=ev.capacity;
const pct=ev.capacity>0?Math.min(100,Math.round(rc/ev.capacity*100)):0;
const d=new Date(ev.date+"T12:00");const tp=TL[ev.type]||TL.gezi;const kt=katilimciTuruBilgisi(ev);
return(<article style={{background:"#fff",borderRadius:20,overflow:"hidden",boxShadow:"0 6px 24px rgba(20,33,61,0.08)",display:"flex",flexDirection:"column",border:"1px solid #ece6da"}}>
<div aria-hidden="true" style={{height:6,background:kt.renk}}/>
<button onClick={()=>onDet(ev)} aria-label={ev.title+" detayları"} style={{position:"relative",height:190,padding:0,border:"none",cursor:"pointer",background:"#e9e4d8",display:"block",width:"100%"}}>
<KapakGorseli ev={ev}/>
<span style={{position:"absolute",top:12,left:12,background:"rgba(255,255,255,0.92)",color:tp.color,padding:"4px 10px",borderRadius:999,fontSize:11,fontWeight:800,fontFamily:ff}}>{tp.label}</span>
<span style={{position:"absolute",top:12,right:12,background:"#fff",borderRadius:12,padding:"6px 10px",textAlign:"center",boxShadow:"0 2px 10px rgba(0,0,0,0.12)",fontFamily:ff,lineHeight:1}}>
<span style={{display:"block",fontSize:20,fontWeight:800,color:G,fontFamily:ffT}}>{d.getDate()}</span>
<span style={{display:"block",fontSize:10,fontWeight:800,color:"#666",letterSpacing:1,marginTop:3}}>{d.toLocaleDateString("tr-TR",{month:"short"}).toUpperCase()}</span>
</span>
{!ev.isFree&&<span style={{position:"absolute",bottom:12,right:12,background:"#14213d",color:"#fff",padding:"4px 10px",borderRadius:999,fontSize:12,fontWeight:800,fontFamily:ff}}>₺{ev.fee}</span>}
</button>
<div style={{padding:"16px 18px 18px",display:"flex",flexDirection:"column",gap:10,flex:1}}>
<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><KatilimciRozeti ev={ev} kucuk/><ErisimRozeti ev={ev}/></div>
<h3 style={{margin:0,fontFamily:ffT,fontWeight:700,fontSize:19,lineHeight:1.3,color:"#14213d"}}>{ev.title}</h3>
<div style={{fontFamily:ff,fontSize:13,color:"#4a5468",display:"flex",flexWrap:"wrap",gap:"4px 12px"}}>
<span>{gunAdi(ev)}, {ev.startTime}</span>
{ev.ageRange&&<span>{ev.ageRange}</span>}
<span style={{fontWeight:700,color:G}}>{ev.isFree?"Ücretsiz":`₺${ev.fee}`}</span>
</div>
<p style={{margin:0,fontFamily:ff,fontSize:14,color:"#5b6478",lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden",flex:1}}>{ev.shortDesc}</p>
{ev.capacity>0&&<div>
<div style={{display:"flex",justifyContent:"space-between",fontFamily:ff,fontSize:12,color:"#6b7385",marginBottom:4}}><span>{rc}/{ev.capacity} kişi</span><span style={{fontWeight:700,color:dolu?"#b91c1c":pct>80?"#b45309":"#6b7385"}}>{dolu?"Doldu":`${ev.capacity-rc} yer kaldı`}</span></div>
<div style={{height:6,background:"#ece8df",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:pct+"%",borderRadius:99,background:dolu?"#dc2626":pct>80?"#e08a1e":kt.renk}}/></div>
</div>}
<div style={{display:"flex",gap:8}}><KayitDugmesi ev={ev} dolu={dolu} onReg={onReg} genis/><button onClick={()=>onDet(ev)} style={{...btnS,padding:"12px 16px",fontSize:14,borderRadius:12}}>Detay</button></div>
</div>
</article>)}

function FiltreCipi({aktif,onClick,children,sayi,renk,zemin}){
return(<button onClick={onClick} style={{flex:"none",display:"inline-flex",alignItems:"center",gap:6,padding:"9px 14px",borderRadius:999,border:`2px solid ${aktif?(renk||G):"#e4dfd3"}`,background:aktif?(zemin||"#e8edf7"):"#fff",color:aktif?(renk||G):"#3a4256",fontFamily:ff,fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}>
{renk&&<span aria-hidden="true" style={{width:9,height:9,borderRadius:"50%",background:renk,flex:"none"}}/>}{children}{typeof sayi==="number"&&<span style={{fontSize:11,fontWeight:800,background:aktif?"rgba(255,255,255,0.7)":"#f2efe8",borderRadius:99,padding:"1px 7px"}}>{sayi}</span>}
</button>)}

function Vitrin({events,regs,S,user,isVeli,onLogin,onLogout,onProfile,onReg,onDet}){
const[kimFiltre,setKimFiltre]=React.useState("hepsi");
const[erisimFiltre,setErisimFiltre]=React.useState("hepsi");
const[turFiltre,setTurFiltre]=React.useState("hepsi");
const[gecmisAcik,setGecmisAcik]=React.useState(false);

const yaklasan=events.filter(e=>!etkinlikBitti(e)).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime));
const gecmis=events.filter(etkinlikBitti).sort((a,b)=>(b.date+b.startTime).localeCompare(a.date+a.startTime));
const oneCikan=yaklasan[0];

const kimSayilari={};yaklasan.forEach(e=>{const k=katilimciTuruAl(e);kimSayilari[k]=(kimSayilari[k]||0)+1});
let liste=yaklasan;
if(kimFiltre!=="hepsi")liste=liste.filter(e=>katilimciTuruAl(e)===kimFiltre);
if(erisimFiltre!=="hepsi")liste=liste.filter(e=>(e.audience||"bircicekli")===erisimFiltre);
if(turFiltre!=="hepsi")liste=liste.filter(e=>e.type===turFiltre);

const kap={maxWidth:1120,margin:"0 auto",padding:"0 20px"};

return(<div style={{minHeight:"100vh",background:"#f7f4ee",fontFamily:ff,color:"#14213d"}}>

{/* Üst çubuk */}
<header style={{background:"#0e1a33",borderBottom:"2px solid rgba(217,172,76,0.55)"}}>
<div style={{...kap,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 20px",flexWrap:"wrap"}}>
<a href="/" style={{display:"flex",alignItems:"center",gap:10,textDecoration:"none"}}>
<img src={LOGO} alt="" style={{width:38,height:38,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.25)"}}/>
<span style={{display:"flex",flexDirection:"column",lineHeight:1.15}}><span style={{fontFamily:ffT,fontWeight:700,fontSize:17,color:"#fff"}}>Bir Çiçek Etkinlikleri</span><span style={{fontSize:11,color:"rgba(255,255,255,0.65)",fontWeight:600}}>Bir Çiçek Koleji Anaokulu · Tuzla</span></span>
</a>
{user?(<div style={{display:"flex",alignItems:"center",gap:8}}>
<button onClick={onProfile} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,0.12)",border:"none",borderRadius:999,padding:"5px 12px 5px 5px",color:"#fff",cursor:"pointer",fontFamily:ff,fontWeight:700,fontSize:13}}><img src={user.photoURL||LOGO} alt="" style={{width:28,height:28,borderRadius:"50%"}}/>Profilim</button>
<button onClick={onLogout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:ff,fontWeight:600,fontSize:13,padding:8}}>Çıkış</button>
</div>):(<button onClick={onLogin} style={{background:"#fff",border:"none",borderRadius:999,padding:"9px 16px",color:G,fontFamily:ff,fontWeight:800,fontSize:13,cursor:"pointer"}}>Google ile giriş</button>)}
</div>
</header>

{/* Açılış */}
<section style={{background:"radial-gradient(700px 420px at 88% 8%, rgba(226,105,31,0.35) 0%, transparent 65%), radial-gradient(900px 500px at 0% 100%, rgba(217,172,76,0.18) 0%, transparent 60%), linear-gradient(160deg,#0e1a33 0%,#1b2d55 55%,#243b6e 100%)",paddingBottom:80,overflow:"hidden"}}>
<div style={{...kap,display:"flex",flexWrap:"wrap",gap:36,alignItems:"center",paddingTop:44}}>
<div style={{flex:"999 1 420px",minWidth:0,display:"flex",flexDirection:"column",gap:16}}>
<span style={{alignSelf:"flex-start",background:"rgba(241,210,127,0.1)",border:"1px solid rgba(241,210,127,0.5)",color:"#f1d27f",padding:"6px 14px",borderRadius:999,fontSize:12,fontWeight:800,letterSpacing:1.8}}>{S.badge}</span>
<h1 style={{margin:0,fontFamily:"'Fraunces', Georgia, serif",fontWeight:700,color:"#fff",fontSize:"clamp(38px,5.6vw,62px)",lineHeight:1.04,letterSpacing:-0.5}}>{S.titleLine1}<br/><span style={{background:ALTIN,WebkitBackgroundClip:"text",backgroundClip:"text",color:"transparent"}}>{S.titleLine2}</span></h1>
<p style={{margin:0,color:"rgba(255,255,255,0.88)",fontSize:17,lineHeight:1.6,maxWidth:560}}>{S.subtitle}</p>
<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{[S.feat1,S.feat2,S.feat3].filter(Boolean).map((f,i)=><span key={i} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(241,210,127,0.3)",color:"#fff",padding:"7px 12px",borderRadius:10,fontSize:13,fontWeight:700}}>{f}</span>)}</div>
<div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:4}}>
<a href="#etkinlikler" style={{background:ALTIN,color:"#14213d",boxShadow:"0 8px 24px rgba(217,172,76,0.35)",textDecoration:"none",fontWeight:800,fontSize:15,padding:"13px 20px",borderRadius:12}}>Etkinlikleri gör ({yaklasan.length})</a>
<a href="#bulten" style={{color:"#f1d27f",textDecoration:"none",fontWeight:700,fontSize:15,padding:"13px 6px"}}>Yeni etkinliklerden haberdar ol →</a>
</div>
</div>
<div style={{flex:"1 1 340px",minWidth:0,maxWidth:440}}>
{oneCikan?<OneCikanEtkinlik ev={oneCikan} regs={regs} onReg={onReg} onDet={onDet}/>:
<div style={{background:"rgba(255,255,255,0.1)",borderRadius:24,padding:28,color:"#fff"}}><div style={{fontFamily:ffT,fontWeight:700,fontSize:22,marginBottom:8}}>Yeni etkinlikler hazırlanıyor</div><div style={{fontSize:15,opacity:0.85,lineHeight:1.6}}>Takvime yeni bir etkinlik eklendiğinde ilk siz haberdar olun.</div><a href="#bulten" style={{display:"inline-block",marginTop:14,background:"#fff",color:G,fontWeight:800,padding:"11px 16px",borderRadius:12,textDecoration:"none"}}>Bültene abone ol</a></div>}
</div>
</div>
</section>

{/* Filtreler */}
<section id="etkinlikler" style={{...kap,marginTop:-44,position:"relative"}}>
<div style={{background:"#fff",borderRadius:22,padding:"18px 18px 16px",boxShadow:"0 12px 36px rgba(20,33,61,0.12)",display:"flex",flexDirection:"column",gap:12}}>
<div style={{fontFamily:ff,fontWeight:800,fontSize:13,color:"#6b7385",letterSpacing:0.5}}>KİMLER İÇİN?</div>
<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
<FiltreCipi aktif={kimFiltre==="hepsi"} onClick={()=>setKimFiltre("hepsi")} sayi={yaklasan.length}>Tümü</FiltreCipi>
{KATILIMCI_TURU_SIRASI.filter(k=>kimSayilari[k]).map(k=>{const t=KATILIMCI_TURLERI[k];return(
<FiltreCipi key={k} aktif={kimFiltre===k} onClick={()=>setKimFiltre(k)} sayi={kimSayilari[k]} renk={t.renk} zemin={t.zemin}>{t.etiket}</FiltreCipi>)})}
</div>
<div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
<div role="group" aria-label="Kimlere açık" style={{display:"inline-flex",background:"#f2efe8",borderRadius:12,padding:4,flexWrap:"wrap"}}>
{[["hepsi","Tümü"],["public","Herkese açık"],["bircicekli","Bir Çiçekli ailelere özel"]].map(([k,l])=>(
<button key={k} onClick={()=>setErisimFiltre(k)} style={{border:"none",borderRadius:9,padding:"8px 12px",background:erisimFiltre===k?"#fff":"transparent",boxShadow:erisimFiltre===k?"0 1px 4px rgba(0,0,0,0.08)":"none",color:erisimFiltre===k?G:"#5b6478",fontFamily:ff,fontWeight:700,fontSize:13,cursor:"pointer"}}>{l}</button>))}
</div>
<label style={{display:"flex",alignItems:"center",gap:8,fontFamily:ff,fontSize:13,color:"#5b6478",fontWeight:700}}>Tür
<select value={turFiltre} onChange={e=>setTurFiltre(e.target.value)} style={{padding:"8px 12px",borderRadius:10,border:"2px solid #e4dfd3",fontFamily:ff,fontSize:13,fontWeight:700,color:"#14213d",background:"#fff"}}>
<option value="hepsi">Tüm türler</option>{Object.entries(TL).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
</select></label>
</div>
</div>
</section>

{/* Yaklaşan etkinlikler */}
<section style={{...kap,padding:"28px 20px 12px"}}>
<h2 style={{margin:"0 0 16px",fontFamily:ffT,fontWeight:700,fontSize:26}}>Yaklaşan etkinlikler</h2>
{isVeli&&<div style={{background:"#e8edf7",color:"#1b2d55",borderRadius:14,padding:"10px 14px",fontFamily:ff,fontSize:13,fontWeight:600,marginBottom:16}}>Bir Çiçek Koleji velisi olarak okulumuza özel etkinliklere de kayıt olabilirsiniz.</div>}
{liste.length?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:22}}>
{liste.map(ev=><EtkinlikKarti key={ev.id} ev={ev} regs={regs} onReg={onReg} onDet={onDet}/>)}
</div>:<div style={{background:"#fff",borderRadius:20,padding:"36px 20px",textAlign:"center",border:"1px dashed #d9d2c2"}}>
<div style={{fontFamily:ffT,fontWeight:700,fontSize:20,marginBottom:6}}>Bu seçimde yaklaşan etkinlik yok</div>
<div style={{fontSize:14,color:"#5b6478",marginBottom:14}}>Filtreleri değiştirin ya da yeni etkinlikler eklendiğinde haber alın.</div>
<a href="#bulten" style={{...btnP,display:"inline-block",textDecoration:"none"}}>Bültene abone ol</a></div>}
</section>

{/* Geçmiş etkinlikler */}
{gecmis.length>0&&<section style={{...kap,padding:"20px 20px 40px"}}>
<h2 style={{margin:"0 0 14px",fontFamily:ffT,fontWeight:700,fontSize:22,color:"#3a4256"}}>Geçmiş etkinlikler</h2>
<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
{(gecmisAcik?gecmis:gecmis.slice(0,4)).map(ev=>(<button key={ev.id} onClick={()=>onDet(ev)} style={{display:"flex",gap:12,alignItems:"center",textAlign:"left",background:"#fff",border:"1px solid #ece6da",borderRadius:16,padding:10,cursor:"pointer"}}>
<span style={{width:64,height:64,borderRadius:12,overflow:"hidden",flex:"none",display:"block"}}><KapakGorseli ev={ev} kucuk/></span>
<span style={{display:"flex",flexDirection:"column",gap:3,minWidth:0}}><span style={{fontFamily:ff,fontWeight:800,fontSize:14,color:"#14213d",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</span><span style={{fontFamily:ff,fontSize:12,color:"#6b7385"}}>{fmtDate(ev.date)}</span><KatilimciRozeti ev={ev} kucuk/></span>
</button>))}
</div>
{gecmis.length>4&&<button onClick={()=>setGecmisAcik(!gecmisAcik)} style={{...btnS,marginTop:14,borderRadius:12}}>{gecmisAcik?"Daha az göster":`Tümünü göster (${gecmis.length})`}</button>}
</section>}

{/* Bülten */}
<section id="bulten" style={{background:"radial-gradient(600px 300px at 90% 0%, rgba(226,105,31,0.28), transparent 70%), linear-gradient(135deg,#14213d,#1b2d55)",padding:"44px 20px",borderTop:"3px solid #d9ac4c"}}>
<div style={{maxWidth:640,margin:"0 auto",textAlign:"center"}}>
<h2 style={{fontFamily:ffT,fontWeight:700,color:"#fff",margin:"0 0 6px",fontSize:26}}>Yeni etkinliklerden ilk siz haberdar olun</h2>
<p style={{color:"rgba(255,255,255,0.85)",fontSize:15,margin:"0 auto 18px",maxWidth:480,lineHeight:1.6}}>Takvime yeni bir etkinlik eklendiğinde e-postayla haber verelim.</p>
<SubscribeForm/>
</div>
</section>

{/* Alt bilgi */}
<footer style={{background:"#0b1428",padding:"32px 20px",color:"rgba(255,255,255,0.75)"}}>
<div style={{...kap,display:"flex",flexWrap:"wrap",gap:24,justifyContent:"space-between",alignItems:"flex-start"}}>
<div style={{flex:"1 1 280px"}}><div style={{fontFamily:ffT,fontWeight:700,fontSize:20,color:"#fff",marginBottom:6}}>{S.footerTitle}</div><div style={{fontSize:14,lineHeight:1.6}}>{S.footerSubtitle}</div></div>
<div style={{display:"flex",flexDirection:"column",gap:6,fontSize:14}}><span>{S.phone1}</span><span>{S.phone2}</span><span>{S.email}</span></div>
<div style={{display:"flex",flexDirection:"column",gap:6,fontSize:14}}><a href="https://www.bircicekkoleji.com" style={{color:"#fff"}}>bircicekkoleji.com</a><a href={AYDINLATMA_LINKI} style={{color:"#fff"}}>Aydınlatma Metni</a></div>
</div>
<div style={{...kap,marginTop:20,fontSize:12,color:"rgba(255,255,255,0.4)"}}>© {new Date().getFullYear()} Bir Çiçek Koleji Anaokulu</div>
</footer>
</div>)}
