# LCDD Cheat Sheet

**Status:** Documentation
**Version:** 0.1.0
**Last Updated:** 2026-08-08

Satu halaman ringkas untuk mengingat konsep utama LCDD.

## Istilah Cepat

| Istilah | Apa artinya | Kapan pakai |
|---|---|---|
| Context | Aturan atau keputusan yang disimpan secara terstruktur | Saat Anda ingin membuat kebijakan eksplisit |
| Lifecycle | Status aturan dari draft sampai archived | Untuk mengetahui apakah aturan sudah aktif |
| Authority | Siapa yang memberi otoritas pada aturan | Untuk menentukan seberapa susah mengubahnya |
| Hardened | Aturan yang berubah pelan dan butuh approval | Untuk regulasi atau arsitektur penting |
| Local | Aturan yang bisa berubah cepat | Untuk gaya tim atau preferensi produk |
| Enforcement | Bagaimana aturan diberlakukan | Untuk memutuskan block/warn/comment/silent |
| Context Pack | Kumpulan aturan terkait | Untuk mengadopsi satu set aturan bersama |

## 3 Pertanyaan Kunci untuk Setiap Context

1. Apa tujuan aturan ini?
2. Siapa yang perlu mengikuti atau menyetujui?
3. Apakah aturan ini harus stabil (hard) atau boleh berubah cepat (local)?

## Ketika Mulai LCDD

- Mulai dari **satu aturan penting**.
- Simpan dalam **file terpisah** dengan struktur jelas.
- Tambahkan `source`, `authority`, `lifecycle`, dan `enforcement`.
- Gunakan `draft` sampai aturan siap.
- Ubah ke `active` jika siap diberlakukan.

## Aturan Praktis

- `Hardened` = gunakan untuk aturan besar, compliance, atau arsitektur.
- `Local` = gunakan untuk tim, gaya kode, atau keputusan produk yang bisa disesuaikan.
- `block` = untuk aturan yang harus ditaati sekarang.
- `warn` = untuk aturan yang ingin dipantau tetapi tidak langsung memblokir.
- `comment` = untuk preferensi atau panduan yang bersifat edukasi.
- `silent` = untuk eksperimen internal atau data awal.

## Contoh Cepat: Pilih Kelas Governance

- `Hardened-Standard`: "Semua layanan internal harus menggunakan TLS 1.3".
- `Local-Standard`: "Semua release branch harus memakai nama `release/*`".
- `Local-Guideline`: "Gunakan 2 spasi di front-end CSS".
- `Local-Experimental`: "Coba format API baru ini selama 30 hari".

## Template Konteks Singkat

```yaml
id: "ctx-example"
version: 1
title: "Judul konteks singkat"
description: "Jelaskan apa aturan ini dan mengapa penting."
source:
  type: "product"
  uri: "roadmap-q3"
authority:
  level: 2
  source:
    type: "product"
    name: "Product Team"
lifecycle: "draft"
governance:
  classification: "local-standard"
  approval_required: true
enforcement:
  mode: "warn"
```

## Fast Tips untuk Founder & Startup

- Jika Anda punya keputusan produk penting, bermula dari `Context` lebih baik daripada hanya menulis di notulen.
- Jika aturan hanya untuk tim kecil, pilih `local-guideline` dan jangan memblokir orang.
- Jika Anda ingin AI agent menghormati aturan, gunakan `active` + `enforcement` yang jelas.
- Setelah satu atau dua aturan berjalan, ulangi proses untuk keputusan lain.

## Kesalahan Umum

- Menulis rule sebagai teks bebas tanpa struktur.
- Menetapkan semua aturan sebagai `hardened`, sehingga tim jadi lambat bergerak.
- Menggunakan FAQ sebagai satu-satunya dokumentasi.
- Mengabaikan `source` dan `authority` sehingga aturan terlihat tidak resmi.

## Cepat: file mana yang harus dibuat?

- `contexts/` atau `lcd-contexts/`
- `contexts/ctx-*.yaml`
- `docs/lcdd-quick-start.md`
- `docs/lcdd-concepts.md`
- `docs/lcdd-templates.md`

Gunakan cheat sheet ini sebagai referensi ketika Anda membuat aturan baru atau berdiskusi di tim.