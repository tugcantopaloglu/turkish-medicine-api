# Turkish Medicine API — Türkçe Dokümantasyon

**Sürüm:** 2.0.0  
**Temel URL:** `http://localhost:3000`

## İçindekiler
- [Genel Bakış](#genel-bakış)
- [Kimlik Doğrulama](#kimlik-doğrulama)
- [Yanıt Formatı](#yanıt-formatı)
- [Hata Yönetimi](#hata-yönetimi)
- [Uç Noktalar (Endpoints)](#uç-noktalar-endpoints)
  - [Genel Bilgiler](#genel-bilgiler)
  - [İlaç Verileri](#ilaç-verileri)
  - [Sayfa (Sheet) Bazlı Veriler](#sayfa-sheet-bazlı-veriler)
  - [Arama & Filtreleme](#arama--filtreleme)
  - [Meta & İstatistikler](#meta--istatistikler)
  - [Yönetim](#yönetim)
- [Veri Şeması](#veri-şeması)
- [Örnekler](#örnekler)
- [Hız Sınırı (Rate Limiting)](#hız-sınırı-rate-limiting)
- [CORS](#cors)
- [Destek & Hata Bildirimi](#destek--hata-bildirimi)
- [Veri Kaynağı](#veri-kaynağı)
- [Sürüm Geçmişi](#sürüm-geçmişi)

---

## Genel Bakış
**Turkish Medicine API**, TITCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) ilaç veritabanına programatik erişim sağlar. API, Türkiye’deki aktif, pasif ve değişiklik yapılan ilaçlara ilişkin bilgileri içeren **5 farklı Excel sayfasından (sheet)** beslenir.

- **Toplam Kayıt:** 17.713 ilaç kaydı
- **Sayfalar (Sheets) ve Kayıt Sayıları:**
  - **Aktif Ürünler:** 7.887
  - **Pasif Ürünler:** 9.759
  - **Pasife Alınacak Ürünler:** 61
  - **Listeye Yeni Eklenen Ürünler:** 3
  - **Değişiklik Yapılan Ürünler:** 3
- **Güncelleme Sıklığı:** Haftalık (varsayılan olarak **Pazartesi 09:00**)

> Not: Sayfa/sheet adları ve kısa ad (slug) eşleştirmeleri API kök uç noktasında döndürülür.

---

## Kimlik Doğrulama
Şu an için API herhangi bir kimlik doğrulama gerektirmez. Tüm uç noktalar **herkese açık**tır.

---

## Yanıt Formatı
Tüm yanıtlar **UTF-8** kodlamalı **JSON** formatındadır.

### Başarılı Yanıt
```json
{
  "page": 1,
  "limit": 50,
  "total": 7887,
  "totalPages": 158,
  "data": [...]
}
```

### Hata Yanıtı
```json
{
  "error": "Ne yanlış gittiğini açıklayan hata mesajı"
}
```

**HTTP Durum Kodları**
- `200 OK` – İstek başarılı
- `400 Bad Request` – Geçersiz parametreler
- `404 Not Found` – Kaynak bulunamadı
- `500 Internal Server Error` – Sunucu hatası
- `503 Service Unavailable` – Veriler henüz yüklenmedi

---

## Hata Yönetimi
API, başarı/başarısızlık durumunu bildirmek için standart HTTP durum kodlarını kullanır.

**Yaygın Hatalar**

| Durum Kodu | Hata Mesajı | Açıklama |
|---|---|---|
| 400 | Query parameter "q" is required | Arama sorgusu eksik |
| 400 | Parameters "field" and "value" are required | Filtre parametreleri eksik |
| 404 | Sheet not found | Geçersiz sheet adı/slug |
| 404 | Medicine not found | İlaç ID’si bulunamadı |
| 503 | Data not loaded yet | Sunucu açılıyor veya veri yüklemesi başarısız |

---

## Uç Noktalar (Endpoints)

### Genel Bilgiler

#### API Bilgisi
```
GET /
```
API adı, sürümü, uç noktalar ve sheet takma adları (alias) döner.

**Örnek Yanıt**
```json
{
  "name": "Turkish Medicine API",
  "version": "2.0.0",
  "description": "API for Turkish Medicine Database (TITCK) - All Sheets Supported",
  "endpoints": {
    "/": "API information",
    "/health": "Health check"
  },
  "sheets": [
    "AKTİF ÜRÜNLER LİSTESİ",
    "PASİF ÜRÜNLER LİSTESİ"
  ],
  "sheetAliases": {
    "active": "AKTİF ÜRÜNLER LİSTESİ",
    "passive": "PASİF ÜRÜNLER LİSTESİ"
  }
}
```

#### Sağlık Kontrolü
```
GET /health
```
Sunucunun sağlık durumu ve veri yükleme bilgilerini döndürür.

**Örnek Yanıt**
```json
{
  "status": "healthy",
  "dataLoaded": true,
  "recordCount": 17713,
  "lastLoadTime": "2025-10-18T06:30:30.569Z"
}
```

---

### İlaç Verileri

#### Tüm İlaçları Getir
```
GET /api/medicines
```
Tüm sayfalardaki ilaçları sayfalama (pagination) ile döndürür.

**Sorgu Parametreleri**

| Parametre | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| page | integer | 1 | Sayfa numarası |
| limit | integer | 50 | Sayfa başına kayıt sayısı |

**Örnek İstek**
```bash
GET /api/medicines?page=2&limit=100
```

**Örnek Yanıt**
```json
{
  "page": 2,
  "limit": 100,
  "total": 17713,
  "totalPages": 178,
  "data": [
    {
      "_sheet": "AKTİF ÜRÜNLER LİSTESİ",
      "İlaç Adı": "PAROL 500 MG TABLET",
      "la_ad": "PAROL 500 MG TABLET",
      "Barkod": 8699717690028,
      "ATC Kodu": "N02BE01",
      "atc_kodu": "N02BE01",
      "ATC Adı": "paracetamol",
      "atc_ad": "paracetamol",
      "Firma Adı": "ATABAY KİMYA SANAYİ VE TİC. A.Ş.",
      "firma_ad": "ATABAY KİMYA SANAYİ VE TİC. A.Ş.",
      "Reçete Türü": "Normal",
      "reete_tr": "Normal",
      "Durumu": "Aktif",
      "id": 101
    }
  ]
}
```

#### ID ile İlaç Getir
```
GET /api/medicines/:id
```
Belirtilen ID’ye sahip ilacı döndürür.

**Yol Parametreleri**

| Parametre | Tip | Açıklama |
|---|---|---|
| id | integer | İlaç ID’si |

**Örnek İstek**
```bash
GET /api/medicines/100
```

**Örnek Yanıt**
```json
{
  "_sheet": "AKTİF ÜRÜNLER LİSTESİ",
  "İlaç Adı": "CYLORIN 25 MG YUMUSAK KAPSUL (50 KAPSUL)",
  "la_ad": "CYLORIN 25 MG YUMUSAK KAPSUL (50 KAPSUL)",
  "Barkod": 8680199196634,
  "ATC Kodu": "L04AD01",
  "atc_kodu": "L04AD01",
  "ATC Adı": "ciclosporin",
  "atc_ad": "ciclosporin",
  "id": 100
}
```

**Hata (404)**
```json
{ "error": "Medicine not found" }
```

---

### Sayfa (Sheet) Bazlı Veriler

Tüm sheet uç noktaları `page` ve `limit` parametrelerini destekler.

#### Tüm Sheet’leri Listele
```
GET /api/sheets
```
Mevcut tüm sheet’ler hakkında bilgi döner.

**Örnek Yanıt**
```json
{
  "totalSheets": 5,
  "sheets": {
    "AKTİF ÜRÜNLER LİSTESİ": {
      "slug": "active",
      "records": 7887,
      "endpoint": "/api/sheets/active"
    },
    "PASİF ÜRÜNLER LİSTESİ": {
      "slug": "passive",
      "records": 9759,
      "endpoint": "/api/sheets/passive"
    }
  }
}
```

#### Aktif Ürünler
```
GET /api/sheets/active
```
Pazarda hâlihazırda bulunan (aktif) ürünleri listeler.

#### Pasif Ürünler
```
GET /api/sheets/passive
```
Pazardan çekilmiş (pasif) ürünleri listeler.

#### Pasife Alınacak Ürünler
```
GET /api/sheets/to-be-deactivated
```
Pasife alınması planlanan ürünleri listeler.

#### Listeye Yeni Eklenen Ürünler
```
GET /api/sheets/newly-added
```
Yakın zamanda eklenen ürünleri listeler.

#### Değişiklik Yapılan Ürünler
```
GET /api/sheets/modified
```
Yakın zamanda üzerinde değişiklik yapılan ürünleri listeler.

---

### Arama & Filtreleme

#### Arama
```
GET /api/medicines/search
```
Tüm sheet’lerde veya belirli bir sheet içinde metin araması yapar.

**Sorgu Parametreleri**

| Parametre | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| q | string | Evet | Arama ifadesi (büyük/küçük harf duyarsız) |
| sheet | string | Hayır | Arama yapılacak sheet adı |
| page | integer | Hayır | Sayfa numarası (varsayılan: 1) |
| limit | integer | Hayır | Sayfa başına kayıt (varsayılan: 50) |

**Örnekler**
```bash
# Tüm sheet’lerde arama
GET /api/medicines/search?q=parol

# Sadece aktif ürünlerde arama
GET /api/medicines/search?q=parol&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ

# Sayfalama ile
GET /api/medicines/search?q=aspirin&page=1&limit=10
```

**Örnek Yanıt**
```json
{
  "query": "parol",
  "sheet": "all",
  "page": 1,
  "limit": 50,
  "total": 12,
  "totalPages": 1,
  "data": [...]
}
```

#### Alana Göre Filtreleme
```
GET /api/medicines/filter
```
Belirli bir alanın (Türkçe veya İngilizce) değerine göre filtreleme yapar.

**Sorgu Parametreleri**

| Parametre | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| field | string | Evet | Alan adı (TR veya EN) |
| value | string | Evet | İfade (kısmi eşleşme) |
| sheet | string | Hayır | Filtrelenecek sheet adı |
| page | integer | Hayır | Sayfa numarası (varsayılan: 1) |
| limit | integer | Hayır | Sayfa başına kayıt (varsayılan: 50) |

**Örnekler**
```bash
# Barkoda göre
GET /api/medicines/filter?field=Barkod&value=8699717

# Firma adına göre
GET /api/medicines/filter?field=Firma%20Adı&value=BAYER

# Belirli bir sheet içinde
GET /api/medicines/filter?field=Durumu&value=Aktif&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ
```

**Örnek Yanıt**
```json
{
  "field": "Barkod",
  "value": "8699717",
  "sheet": "all",
  "page": 1,
  "limit": 50,
  "total": 8,
  "totalPages": 1,
  "data": [...]
}
```

---

### Meta & İstatistikler

#### Kullanılabilir Sütunlar
```
GET /api/columns
```
Tüm sütun adlarını veya belirli bir sheet’in sütunlarını döndürür.

**Sorgu Parametreleri**
- `sheet` (opsiyonel): Belirli bir sheet’in sütunlarını getirir.

**Örnek Yanıt**
```json
{
  "sheet": "all",
  "columns": [
    "_sheet",
    "İlaç Adı",
    "la_ad",
    "Barkod",
    "ATC Kodu",
    "atc_kodu",
    "ATC Adı",
    "atc_ad",
    "Firma Adı",
    "firma_ad",
    "Reçete Türü",
    "reete_tr",
    "Durumu",
    "Açıklama",
    "aklama",
    "id"
  ]
}
```

#### İstatistikler
```
GET /api/stats
```
Tüm sheet’lere ilişkin özet istatistikleri döndürür.

**Örnek Yanıt**
```json
{
  "totalRecords": 17713,
  "sheetCount": 5,
  "sheets": {
    "AKTİF ÜRÜNLER LİSTESİ": {
      "records": 7887,
      "columns": ["İlaç Adı", "Barkod", "ATC Kodu", "..."]
    },
    "PASİF ÜRÜNLER LİSTESİ": {
      "records": 9759,
      "columns": ["İlaç Adı", "Barkod", "ATC Kodu", "..."]
    }
  }
}
```

#### İndirme Metaverisi
```
GET /api/metadata
```
Son veri indirme işlemine ilişkin bilgileri döndürür.

**Örnek Yanıt**
```json
{
  "downloadDate": "2025-10-18T06:24:41.856Z",
  "sourceDate": "E-Reçete İlaç Listesi",
  "sourceUrl": "https://titck.gov.tr/storage/Archive/2025/...",
  "filePath": "data/medicines.xlsx"
}
```

---

### Yönetim

#### Veriyi Yeniden Yükle
```
POST /api/reload
```
Mevcut Excel dosyasından veriyi yeniden yükler (indirme yapmadan).

**Örnek Yanıt**
```json
{
  "message": "Data reloaded successfully",
  "recordCount": 17713,
  "loadTime": "2025-10-18T06:30:30.569Z"
}
```

#### En Güncel Veriyi İndir
```
POST /api/download
```
TITCK’ten en güncel Excel dosyasını indirir ve verileri yeniden yükler.

**Örnek Yanıt**
```json
{
  "message": "File downloaded and data loaded successfully",
  "metadata": {
    "downloadDate": "2025-10-18T06:24:41.856Z",
    "sourceDate": "E-Reçete İlaç Listesi",
    "sourceUrl": "https://titck.gov.tr/storage/Archive/2025/...",
    "filePath": "data/medicines.xlsx"
  },
  "recordCount": 17713
}
```

---

## Veri Şeması

### İlaç Kayıt Yapısı
Her kayıt, esneklik için **Türkçe ve İngilizce** alan adlarını birlikte içerir.

**Aktif Ürünler Alanları**

| Türkçe Sütun | İngilizce Sütun | Tip | Açıklama |
|---|---|---|---|
| _sheet | _sheet | string | Kaynağın sheet adı |
| İlaç Adı | la_ad | string | İlacın adı |
| Barkod | - | number | Barkod |
| ATC Kodu | atc_kodu | string | ATC kodu |
| ATC Adı | atc_ad | string | ATC açıklaması |
| Firma Adı | firma_ad | string | Firma adı |
| Reçete Türü | reete_tr | string | Reçete türü |
| Durumu | - | string | Durum (Aktif/Pasif) |
| Açıklama | aklama | string | Not/Açıklama |
| Temel İlaç Listesi Durumu | temel_la_listesi_durumu | number | Temel ilaç listesi durumu |
| Çocuk Temel İlaç Listesi Durumu | ocuk_temel_la_listesi_durumu | number | Çocuk temel ilaç listesi durumu |
| Yenidoğan Temel İlaç Listesi Durumu | yenidoan_temel_la_listesi_durumu | number | Yenidoğan temel ilaç listesi durumu |
| Aktif Ürünler Listesine Alındığı Tarih | aktif_rnler_listesine_alnd_tarih | number | Aktif listeye alınma tarihi |
| id | id | number | Benzersiz kimlik |

**Pasif Ürünler Alanları**  
Aktif ürünlere benzer, ancak ek/ayrık alanlar:
- `Pasif Ürünler Listesine Alındığı Tarih` (**pasif_rnler_listesine_alnd_tarih**) – Pasif listeye alınma tarihi  
- Temel ilaç listesi alanları bulunmayabilir

---

## Örnekler

### Örnek 1: Ağrı Kesicilerde Arama
```bash
curl "http://localhost:3000/api/medicines/search?q=parol&limit=5"
```
**Örnek Yanıt**
```json
{
  "query": "parol",
  "sheet": "all",
  "page": 1,
  "limit": 5,
  "total": 12,
  "totalPages": 3,
  "data": [
    {
      "_sheet": "AKTİF ÜRÜNLER LİSTESİ",
      "İlaç Adı": "PAROL 500 MG TABLET",
      "Barkod": 8699717690028,
      "ATC Kodu": "N02BE01",
      "ATC Adı": "paracetamol",
      "Firma Adı": "ATABAY KİMYA SANAYİ VE TİC. A.Ş.",
      "id": 5500
    }
  ]
}
```

### Örnek 2: Sadece BAYER – Aktif Ürünler
```bash
curl "http://localhost:3000/api/medicines/filter?field=Firma%20Adı&value=BAYER&sheet=AKTİF%20ÜRÜNLER%20LİSTESİ&limit=3"
```

### Örnek 3: Listeye Yeni Eklenenler
```bash
curl "http://localhost:3000/api/sheets/newly-added"
```
**Örnek Yanıt**
```json
{
  "sheet": "LİSTEYE YENİ EKLENEN ÜRÜNLER",
  "slug": "newly-added",
  "page": 1,
  "limit": 50,
  "total": 3,
  "totalPages": 1,
  "data": [
    {
      "_sheet": "LİSTEYE YENİ EKLENEN ÜRÜNLER",
      "İlaç Adı": "LYPTIMZIA 284MG/ 1,5 ML ENJEKSIYONLUK COZELTI",
      "Barkod": 8699074950520,
      "ATC Kodu": "C10AX16",
      "ATC Adı": "inclisiran",
      "Açıklama": "Ekleme yeni ürün/Aktif ürünler listesine eklendi.",
      "id": 1
    }
  ]
}
```

### Örnek 4: İstatistikleri Getir
```bash
curl "http://localhost:3000/api/stats"
```

### Örnek 5: Sadece Pasif Ürünlerde Arama
```bash
curl "http://localhost:3000/api/medicines/search?q=aspirin&sheet=PASİF%20ÜRÜNLER%20LİSTESİ"
```

### Örnek 6: Barkod Önekine Göre Filtre
```bash
curl "http://localhost:3000/api/medicines/filter?field=Barkod&value=86997"
```

---

## Hız Sınırı (Rate Limiting)
Şu an **hız sınırlaması uygulanmıyor**. Üretim ortamlarında hız sınırı eklemeniz önerilir.

---

## CORS
Varsayılan olarak **tüm kaynaklara (\\*)** izin verilir. Üretim ortamlarında uygun şekilde kısıtlayınız/konfigüre ediniz.

---

## Destek & Hata Bildirimi
Hata ve geliştirme talepleriniz için proje deposunu kullanınız (issue açabilirsiniz).

---

## Veri Kaynağı
Tüm veriler TITCK (Türkiye İlaç ve Tıbbi Cihaz Kurumu) kaynağından alınır:  
https://www.titck.gov.tr/dinamikmodul/43

**Veri Güncelleme Planı:** Haftalık, her **Pazartesi 09:00** (yapılandırılabilir).

---

## Sürüm Geçmişi

**v2.0.0** (Güncel)
- Çoklu sheet desteği
- Temiz İngilizce endpoint kısaltmaları (alias’lar)
- Çift dil alan adları (TR + EN)
- Sheet seçimi ile gelişmiş arama & filtreleme
- Sheet bazlı uç noktalar

**v1.0.0**
- İlk sürüm
- Temel API işlevleri
- Tek sheet desteği
