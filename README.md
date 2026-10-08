# Murottal Qur'an v5 • Feature Center

Website Murottal Al-Qur'an mobile-first dengan 30 juz, 114 surah, teks Arab, latin, terjemahan Indonesia, audio qari, dark/light mode, menu fitur, game mini, generator fan-card, dan API Project Center.

## Deploy Netlify
Upload seluruh folder/ZIP ini sebagai deploy. `index.html` berada di root. `netlify.toml` dan `netlify/functions/quran-api.mts` diperlukan untuk route API.

## API Project Center
- Hamburger → API → API KEY → Buka API KEY.
- `/api` menampilkan log project.
- Create New Api key membuka `/api/new`.
- Project dapat diberi nama atau file dapat di-upload dari perangkat.
- Verifikasi human pada build ini adalah verifikasi lokal demo. reCAPTCHA resmi membutuhkan site key/domain configuration sendiri.
- API key dibuat dengan format `mq-` + 15 karakter acak.
- Tombol salin hanya dapat digunakan sekali untuk key baru.
- Endpoint project menggunakan `/v1/<slug-acak>` dan dilayani Netlify Function.
- Saat endpoint dibuka langsung di browser, Function mengembalikan halaman hitam bertuliskan `Succes`.

### Penting tentang keamanan
Versi ini adalah implementasi frontend + Netlify Function tanpa sistem login/database. Project log dan API key disimpan di localStorage perangkat/browser. Untuk API key production yang benar-benar per akun, tambahkan authentication + database/secret storage dan jangan pernah menyimpan secret production di localStorage.

## Qari
Daftar qari audio dimuat dinamis dari Al Quran Cloud audio editions. Ketersediaan qari mengikuti sumber API, sehingga tidak dapat menjamin seluruh qari yang pernah ada di dunia.
