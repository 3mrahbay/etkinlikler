# Etkinlik medya güvenliği

## Durum (30 Ekim 2026)

İstemci artık `config/bunny` okumaz ve Bunny Storage parolasını almaz. `functions/`
Node 22 HTTP servisi doğrulanmış Google yönetici oturumunu ve iptal durumunu denetler.
Yükleme 5 MB ile sınırlıdır; JPEG/PNG/WebP çözümlenip metaverisiz JPEG olarak yeniden
üretilir. SVG, bozuk görsel, dış origin, dizin geçişi ve kapsam dışı silme reddedilir.
Sunucu yalnız `etkinlikler/managed/<uuid>.jpg` alanına yazar/siler; dakikada yönetici
başına 30 işlem sınırı vardır. Provider yanıtları ve sırlar hata çıktısına aktarılmaz.

Sunucu 30 Ekim 2026 tarihinde yayımlandı ve gerçek Google yönetici oturumuyla
sentetik yükleme/CDN okuma/silme testi geçti. PR hâlâ taslaktır; istemci değişikliği
henüz birleştirilmedi veya canlı siteye yayımlanmadı.

Firestore'daki dar `config/bunny` koruması ayrıca yayımlanmış ve kaynak
karşılaştırmasıyla doğrulanmıştır:
`projects/bcka-site/rulesets/c966d466-e3e7-4d94-8787-97fb22673035`.
Önceki kontrolde canlı belge yetkili IAM okumasında 404; anonim okumada 403 döndürdü.
Geçmişte bu belgenin bulunmadığı veya kimsenin anahtar almadığı sonucu çıkarılamaz.

## Yayımlanan sunucu ve erişim kapsamı

- Proje `bcka-site`, Gen2 işlev `etkinlikMedia`, bölge `europe-west1`, Node 22.
- Endpoint: `https://europe-west1-bcka-site.cloudfunctions.net/etkinlikMedia`.
  İstemcinin `MEDIA_URL` değeri bu endpoint ile aynıdır.
- Çalışan revision: `etkinlikmedia-00002-bef`; build:
  `ee68053c-006d-48fb-9eab-c368a521c23a`.
- Çalışma hesabı: `etkinlik-media-runtime@bcka-site.iam.gserviceaccount.com`.
  `projects/bcka-site/roles/etkinlikMediaRuntime` özel rolünün izinleri
  [runtime-role.json](runtime-role.json) içinde belgelenmiştir. Firestore IAM
  izinleri yalnız kota koleksiyonuna kısıtlı değildir; uygulama kota erişimini
  `etkinlikMediaKotalari` ile sınırlar. Rol delete/list/admin izni içermez.
- Secret Manager: `ETKINLIK_BUNNY_STORAGE`, etkin ve dağıtıma bağlı sürüm `3`;
  önceki sürümler devre dışı. Hesap yalnız bu sır üzerinde Secret Accessor alır.
  JSON alanları `zone`, `password`, `host`, `cdnUrl`; değerler depoya yazılmaz.
- Yeni Bunny Storage Zone `bircicek-etkinlikler` (2027635), Frankfurt tek bölge,
  Standard HDD; Pull Zone 6900580, HTTPS `https://bircicek-etkinlikler.b-cdn.net`.
  Ortak galeri/CV alanları ve anahtarları değiştirilmedi.
- HTTP servisi dışarıdan çağrılabilir (`allUsers` Run Invoker yalnız bu servis).
  Her dosya işlemi iptal kontrolü yapılan Firebase ID token, doğrulanmış Google
  oturumu ve sunucuda tanımlı yönetici kimliği ister. CORS yetkilendirme değildir.
  İzinli origin yalnız `https://etkinlikler.bircicekkoleji.com`.

## Kaynak ve maliyet sınırları

Kod ile canlı ayarlar: CPU 1, bellek 512 MiB, min instance 0, max instance 2,
concurrency 10, timeout 60 saniye. Yükleme 5 MiB, yönetici başına dakikada 30
istek sınırı vardır. Yeni Bunny Pull Zone aylık 30 GB trafik sınırında durur.
Bunlar kesin fatura tavanı değildir: işlem süresi, depolama, build, log ve diğer
Google servis ücretleri ayrıca oluşabilir. Onaylanan kapsam yalnız bu yeni
altyapı için aylık 5 USD ve kurulum/test için ek 1 USD (vergi hariç) bütçedir;
aşım için yeni onay gerekir. Ücretli ek Bunny özellikleri açılmadı.

## Doğrulama ve kalan yayın adımı

Sunucu kabul testi: gerçek yönetici oturumuyla yalnız yapay 2×2 PNG yükleme 200,
CDN okuma 200 (`image/jpeg`), aynı managed dosyayı silme 200. Test yerel,
sabit endpoint/origin kullanan bir relay üzerinden yapıldı; canlı sitenin
formu veya tarayıcı CORS akışını uçtan uca doğrulamış sayılmaz. Gerçek veli/çocuk
verisi kullanılmadı. Token ve sır değerleri test raporuna kaydedilmedi.

HTTP kontrolleri: origin yok/yabancı origin 403, izinli origin ile eksik veya
geçersiz oturum 401, izinli OPTIONS 204 ve doğru Allow-Origin. İlk revision'da
başarısız olan sağlayıcı erişimi sır sürümü 3 ile düzeltilip yönetici testi yeniden
başarıyla tamamlandı. Çalışan kaynak SHA-256 değerleri (dağıtım paketinde dört dosyanın sonunda
depoya göre bir ek boş satır vardır; işlevsel kaynak aynıdır):

| Dosya | SHA-256 |
| --- | --- |
| functions/index.js | d21555c085946cf9ec27441557da94baf0ae9ad7cc627ca84e1034385760b2e8 |
| functions/media.js | 4749ae2edcbe6cec3a592c32cadc47fedbbac889e2121f7624640da32b97f69f |
| functions/package.json | 328a232d18fa64114d24ddbaecbb0a2cd279d21ca01f26bcd9d6cae86bb709eb |
| functions/package-lock.json | 827bc5391fc04dd3d941b9f59ee01a8d9ada233fd66445d59236af0dce423b58 |

1. `functions/` içinde `npm ci` ve Node 22 ile `npm test` çalıştırın.
2. Ayrı merge/site yayın onayı sonrası PR'ı birleştirin ve GitHub Pages'in
   hedef commit'i yayımladığını doğrulayın. Bu aşama sunucu yeniden dağıtımı
   veya Firestore/IAM değişikliği gerektirmez.
3. Canlı sitede gerçek yöneticiyle yalnız sentetik görsel yükleyin; ağ isteğinin
   yeni endpoint'e gittiğini, başarılı CORS yanıtını, CDN önizlemesini ve istemcinin
   `config/bunny` okumadığını kontrol edin. Gerçek etkinlik kaydı oluşturmayın.
4. Oturumsuz dosya isteğinin reddini doğrulayın; testin managed dosyasını yetkili
   DELETE ile temizleyin. Kart kaldırma düğmesi sunucudan silme yapmaz.
5. Site testi başarısızsa istemci yayınını geri alın; `config/bunny` korumasını
   gevşetmeyin veya anahtarı istemciye geri koymayın. GitGuardian incelemesi ve
   geçmiş ortak anahtarın bağımlılık envanteri ayrı açık işlerdir.

Gelecekteki sunucu dağıtımında yalnız `etkinlik-media` codebase'ini hedefleyin;
proje, runtime hesabı, secret sürümü ve kaynak sınırlarını önceden doğrulayın.
Başka işlevleri veya ortak projenin Firestore kurallarını topluca yayımlamayın.

Karttaki kaldırma düğmesi önceki gibi yalnız formdan görseli çıkarır. CDN'deki
paylaşılan bir görseli kazara silmemek için buraya otomatik DELETE bağlanmadı.
Sunucu DELETE yalnız yeni managed dosyalar içindir; eski içerikler ayrı envanter gerektirir.

## Firestore koruması ve tekrar test

`firestore-bunny.patch` ortak projenin 28 Ekim kaynak sürümünden alınmış dar farktır.
`config/bunny` ve altındaki belgeler, yönetici dahil hiçbir istemciye açılamaz.
Genel yönetici fallback'i `config` için kapatılır; diğer config belgelerindeki
eski yönetici erişimi açık kuralla korunur. Geniş `config` liste sorguları engellenir.
Admin SDK/IAM erişimi Security Rules dışında kalır: sırlar yine Secret Manager'da tutulmalıdır.

Test için emülatörü `demo-etkinlik` projesiyle `127.0.0.1:8788` üzerinde açın.
Java Türkçe yerelde hata verirse `-Duser.language=en -Duser.country=US` kullanın.
`RULES_FILE=/absolute/path/firestore.rules python3 security/test_rules.py`
28 kontrol çalıştırır; canlıya yazmaz. Testler mevcut taslak okuma ve sayaç tekrarı
açıklarını da başarıyla yeniden üretir; bu ikisi bu dar yamada çözülmüş değildir.

## Google anahtarı

`index.html` içindeki Firebase web anahtarı proje tanımlayıcısıdır. Aynı anahtarın
gereksiz README kopyası kaldırılmıştır; Git geçmişi değiştirilmemiştir. Anahtarın
mevcut API allowlist'i Firebase servisleriyle sınırlı; `generativelanguage.googleapis.com`
yoktur. Browser referrer listesi boştur. Ortak anahtarı yalnız bu siteye kısıtlamak
Portal/ZEKY tüketicilerini bozabilir; önce ayrı web anahtarı ve staging doğrulamasıyla
alan adı/API kısıtları uygulanmalıdır. GitHub uyarısı inceleme sonuna kadar açık tutuldu.
Kaynak: https://firebase.google.com/docs/projects/api-keys
