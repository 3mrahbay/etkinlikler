# Etkinlik medya güvenliği

## Durum (30 Ekim 2026)

İstemci artık `config/bunny` okumaz ve Bunny Storage parolasını almaz. `functions/`
Node 22 HTTP servisi doğrulanmış Google yönetici oturumunu ve iptal durumunu denetler.
Yükleme 5 MB ile sınırlıdır; JPEG/PNG/WebP çözümlenip metaverisiz JPEG olarak yeniden
üretilir. SVG, bozuk görsel, dış origin, dizin geçişi ve kapsam dışı silme reddedilir.
Sunucu yalnız `etkinlikler/managed/<uuid>.jpg` alanına yazar/siler; dakikada yönetici
başına 30 işlem sınırı vardır. Provider yanıtları ve sırlar hata çıktısına aktarılmaz.

Bu dal henüz canlı istemciye veya Cloud Functions'a yayımlanmamıştır. Firestore'daki
dar `config/bunny` koruması ayrıca yayımlanmış ve kaynak karşılaştırmasıyla doğrulanmıştır:
`projects/bcka-site/rulesets/c966d466-e3e7-4d94-8787-97fb22673035`.
Mevcut canlı belge yetkili IAM okumasında 404; anonim okumada 403 döndürdü.
Geçmişte bu belgenin bulunmadığı veya kimsenin anahtar almadığı sonucu çıkarılamaz.

## Yayına alma sırası

1. Bunny hesabında kullanılan Storage Zone'u ve bölgesel storage host'unu doğrulayın.
   Ayrı bir etkinlik Storage Zone tercih edin. Mevcut anahtarın tarayıcıda daha önce
   kullanıldığı biliniyorsa sızmış kabul edin. Hesap API anahtarı ile zone parolası
   farklıdır; burada gereken zone'un yazma parolasıdır.
2. Mevcut bağımlı uygulamaları envanterleyin. Bunny'nin desteklediği yöntemle yeni
   zone/parola geçişi hazırlayın; tüketicileri taşıyıp eski yazma parolasını iptal edin.
   Olası yetkisiz yükleme/silme ve CDN içeriklerini inceleyin. Sırrı sohbet, commit,
   terminal argümanı veya ekran görüntüsüne koymayın.
3. Google Secret Manager'da `ETKINLIK_BUNNY_STORAGE` sırrını oluşturun. Değeri bir JSON
   nesnesidir: `zone`, `password`, `host`, `cdnUrl`. `host` storage bölgesi host'u;
   `cdnUrl` yalnız HTTPS CDN origin'idir (yol/sorgu yok). Gerçek değerleri bu dosyaya
   yazmayın. Ortam değişkenine gömülü istemci sırrı veya Firestore alternatifi kullanmayın.
4. Çalışma hizmet hesabına yalnız bu sır için Secret Accessor, Firebase Auth iptal
   kontrolü için gereken kullanıcı okuması ve kota belgeleri için gereken Firestore
   IAM yetkilerini tanımlayın. HTTP erişimi tarayıcıdan çağrılabilir olmalı; yetki
   sunucudaki Firebase ID token kontrolüyle uygulanır. CORS tek başına yetkilendirme değildir.
5. `functions/` içinde `npm ci` ve `npm test` çalıştırın. Projeyi açıkça seçerek
   `firebase deploy --project bcka-site --only functions:etkinlik-media` kullanın.
   Bu codebase diğer sunucu işlevlerini kapsamına almaz. Başka Firestore kurallarını
   bu depodan komple yayımlamayın.
6. Gerçek yönetici oturumuyla yeni sentetik görsel yükleyin, CDN'den alın ve aynı
   managed path'i DELETE ile silin. Yetkisiz oturumun reddedildiğini doğrulayın.
   Çocuk veya veli fotoğrafı test verisi olarak kullanılmamalı.
7. Başarılı uçtan uca testten sonra istemci değişikliğini birleştirip GitHub Pages
   dağıtımını doğrulayın. Yeni endpoint hazır değilken dalı birleştirmeyin.

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
