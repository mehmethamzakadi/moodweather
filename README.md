# MoodWeather - Akıllı Müzik Terapi Uygulaması

## Proje Dokümantasyonu

### 📋 Proje Özeti

MoodWeather, kullanıcının duygusal durumu ve çevresel faktörleri (hava durumu, saat, mevsim) analiz ederek kişiselleştirilmiş müzik terapi seansları oluşturan web uygulamasıdır.

---

## 🎯 Ana Hedefler

### Birincil Hedefler

- Kullanıcının mevcut ruh halini hedef ruh haline geçirmek
- Hava durumu ve zaman faktörlerini müzik seçiminde kullanmak
- AI destekli kişiselleştirilmiş müzik önerileri sunmak

### İkincil Hedefler

- Kullanıcının müzik dinleme alışkanlıklarını analiz etmek
- Duygusal değişimleri takip etmek
- Müzik terapi geçmişini kaydetmek

---

## 🔧 Teknik Mimari

### Frontend

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **UI Kütüphane:** Shadcn/ui (isteğe bağlı)
- **State Management:** React Context API / Zustand

### Backend

- **Platform:** Next.js API Routes (Serverless)
- **Veritabanı:** SQLite (başlangıç için) / PostgreSQL (production)
- **ORM:** Prisma

### Üçüncü Taraf API'ler

- **Spotify Web API** (Müzik verileri)
- **OpenWeatherMap API** (Ücretsiz hava durumu)
- **Groq API** (Ücretsiz AI - Llama 3.1 modeli)

### Deployment

- **Platform:** Vercel (Ücretsiz tier)
- **Domain:** Vercel subdomain (.vercel.app)

---

## 📱 Uygulama Özellikleri

### 🌦️ Çevresel Algı Motoru

- **Hava Durumu Entegrasyonu**

  - Anlık sıcaklık, nem, basınç
  - Hava durumu koşulları (güneşli, yağmurlu, bulutlu)
  - Görünürlük ve rüzgar hızı

- **Zaman Analizi**
  - Günün saati (sabah, öğle, akşam, gece)
  - Mevsim tespiti
  - Hafta içi/hafta sonu ayrımı

### 🧠 Duygusal Zeka Sistemi

- **Mood Input Yöntemleri**

  - Metin tabanlı mood açıklaması
  - Emoji seçimi
  - Önceden tanımlı mood kategorileri

- **AI Mood Analizi**
  - Kullanıcı metninden duygu çıkarımı
  - Enerji seviyesi tespiti
  - Hedef mood belirleme

### 🎶 Müzik Terapi Motoru

- **Spotify Entegrasyonu**

  - Kullanıcının saved tracks analizi
  - Recently played tracks
  - Top artists ve genres

- **Playlist Oluşturma**
  - Mevcut -> Hedef mood geçiş algoritması
  - Hava durumu uyumlu şarkı seçimi
  - Tempo ve enerji seviyesi gradasyonu
