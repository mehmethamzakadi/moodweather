# MoodWeather - AI Development Prompt

## English Version

```
You are an expert full-stack developer specializing in Next.js, React, and music streaming applications. I want you to help me build "MoodWeather" - an AI-powered music therapy web application.

PROJECT OVERVIEW:
MoodWeather is a web application that analyzes a user's emotional state and environmental factors (weather, time, season) to create personalized music therapy sessions using Spotify integration.

CORE FEATURES:
1. **Environmental Perception Engine**
   - Real-time weather data integration (OpenWeatherMap API)
   - Time-of-day and seasonal analysis
   - Location-based atmospheric assessment

2. **Emotional Intelligence System**
   - Text-based mood analysis using free AI (Groq API with Llama 3.1)
   - Daily mood tracking and pattern analysis
   - Emotional profile extraction from Spotify listening history

3. **Music Therapy Playlist Engine**
   - Transition playlists from current mood to target mood
   - Weather + mood combination algorithms
   - AI that learns from personal Spotify data

TECHNICAL STACK:
- **Frontend & Backend**: Next.js 14 with App Router (fullstack)
- **Database**: SQLite for development, PostgreSQL for production
- **ORM**: Prisma
- **APIs**: Spotify Web API, OpenWeatherMap API, Groq API (free AI)
- **Deployment**: Vercel (free tier)
- **Styling**: Tailwind CSS

USER FLOW:
1. User logs in with Spotify OAuth
2. User describes current mood: "I feel tired and stressed"
3. System analyzes: mood + current weather + time + user's Spotify history
4. AI generates transition playlist strategy
5. Creates Spotify playlist with gradual mood progression
6. User plays therapy session and provides feedback

KEY ALGORITHMS NEEDED:
- Mood text analysis and classification
- Weather-to-music correlation mapping
- Spotify track feature analysis (energy, valence, tempo, danceability)
- Progressive playlist curation (smooth transitions)
- User preference learning system

DATA MODELS:
- Users (Spotify integration)
- MoodSessions (mood data + weather + playlist)
- PlaylistHistory (generated playlists tracking)

MVP REQUIREMENTS:
- Simple mood input (text + emoji selection)
- Basic weather integration
- AI mood analysis with Groq
- Spotify playlist creation
- Session tracking and feedback

DEVELOPMENT PHASES:
1. **Phase 1**: Basic MVP (Spotify OAuth + simple mood input + weather API)
2. **Phase 2**: AI integration and smart playlist generation
3. **Phase 3**: UI/UX improvements and mobile responsiveness
4. **Phase 4**: Analytics and user insights

FREE RESOURCES:
- Groq API: 14,400 free requests/day with Llama 3.1 70B
- OpenWeatherMap: 1000 free calls/day
- Spotify Web API: Free with rate limits
- Vercel: Free hosting and deployment

Please help me implement this step by step, starting with the basic project setup and Spotify integration. Focus on clean, maintainable code with proper error handling. The application should be production-ready but start simple and iterate.

What questions do you have about the project? Which component should we start building first?
```

---

## Turkish Version

```
Sen Next.js, React ve müzik streaming uygulamaları konusunda uzman bir full-stack geliştiricisin. "MoodWeather" adlı yapay zeka destekli müzik terapi web uygulamasını geliştirmeme yardım etmeni istiyorum.

PROJE GENEL BAKIŞ:
MoodWeather, kullanıcının duygusal durumunu ve çevresel faktörleri (hava durumu, saat, mevsim) analiz ederek Spotify entegrasyonu ile kişiselleştirilmiş müzik terapi seansları oluşturan bir web uygulamasıdır.

ANA ÖZELLİKLER:
1. **Çevresel Algı Motoru**
   - Gerçek zamanlı hava durumu verisi entegrasyonu (OpenWeatherMap API)
   - Günün saati ve mevsim analizi
   - Konum tabanlı atmosfer değerlendirmesi

2. **Duygusal Zeka Sistemi**
   - Ücretsiz AI ile metin tabanlı mood analizi (Groq API ile Llama 3.1)
   - Günlük mood takibi ve pattern analizi
   - Spotify dinleme geçmişinden duygusal profil çıkarma

3. **Müzik Terapi Playlist Motoru**
   - Mevcut mood'dan hedef mood'a geçiş playlistleri
   - Hava durumu + mood kombinasyon algoritmaları
   - Kişisel Spotify verilerinden öğrenen AI

TEKNİK STACK:
- **Frontend & Backend**: Next.js 14 with App Router (fullstack)
- **Veritabanı**: Geliştirme için SQLite, production için PostgreSQL
- **ORM**: Prisma
- **API'ler**: Spotify Web API, OpenWeatherMap API, Groq API (ücretsiz AI)
- **Deployment**: Vercel (ücretsiz tier)
- **Styling**: Tailwind CSS

KULLANICI AKIŞI:
1. Kullanıcı Spotify OAuth ile giriş yapar
2. Kullanıcı mevcut mood'unu açıklar: "Yorgun ve stresli hissediyorum"
3. Sistem analiz eder: mood + mevcut hava durumu + saat + kullanıcının Spotify geçmişi
4. AI geçiş playlist stratejisi oluşturur
5. Kademeli mood ilerlemesi olan Spotify playlist'i oluşturur
6. Kullanıcı terapi seansını oynatır ve geri bildirim verir

GEREKLİ ANA ALGORİTMALAR:
- Mood metin analizi ve sınıflandırması
- Hava durumu-müzik korelasyon haritalama
- Spotify şarkı özellik analizi (energy, valence, tempo, danceability)
- Aşamalı playlist curation (yumuşak geçişler)
- Kullanıcı tercihi öğrenme sistemi

VERİ MODELLERİ:
- Users (Spotify entegrasyonu)
- MoodSessions (mood verisi + hava durumu + playlist)
- PlaylistHistory (oluşturulan playlist takibi)

MVP GEREKSİNİMLERİ:
- Basit mood girişi (metin + emoji seçimi)
- Temel hava durumu entegrasyonu
- Groq ile AI mood analizi
- Spotify playlist oluşturma
- Seans takibi ve geri bildirim

GELİŞTİRME AŞAMALARI:
1. **Faz 1**: Temel MVP (Spotify OAuth + basit mood girişi + hava durumu API)
2. **Faz 2**: AI entegrasyonu ve akıllı playlist oluşturma
3. **Faz 3**: UI/UX iyileştirmeleri ve mobile responsive
4. **Faz 4**: Analitik ve kullanıcı insights

ÜCRETSİZ KAYNAKLAR:
- Groq API: Llama 3.1 70B ile günde 14,400 ücretsiz request
- OpenWeatherMap: Günde 1000 ücretsiz çağrı
- Spotify Web API: Rate limit ile ücretsiz
- Vercel: Ücretsiz hosting ve deployment

Lütfen bu projeyi adım adım implement etmeme yardım et, temel proje kurulumu ve Spotify entegrasyonu ile başlayarak. Proper error handling ile temiz, maintainable kod odaklı ol. Uygulama production-ready olmalı ama basit başlayıp iterate etmeli.

Proje hakkında hangi sorularınız var? Hangi component'i ilk olarak build etmeye başlamalıyız?
```