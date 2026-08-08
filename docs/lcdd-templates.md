# LCDD Templates

**Status:** Documentation
**Version:** 0.1.0
**Last Updated:** 2026-08-08

Gunakan template ini untuk mempercepat adopsi LCDD dan menjaga konsistensi.

## 1. Context Template

Salin template ini saat Anda menulis aturan pertama.

```yaml
id: "ctx-your-rule-id"
version: 1
title: "Judul aturan pendek"
description: "Jelaskan secara ringkas apa yang harus dilakukan dan mengapa."
source:
  type: "product" # product, team, regulation, internal-policy
  uri: "source-identifier"
authority:
  level: 2
  source:
    type: "product" # team, product, regulation
    name: "Nama sumber atau tim"
lifecycle: "draft" # draft, candidate, approved, active, deprecated, archived
governance:
  classification: "local-standard" # hardened-standard, hardened-local, local-standard, local-guideline, local-experimental
  approval_required: true
enforcement:
  mode: "warn" # block, warn, comment, silent
```

### Penjelasan field

- `id`: unik untuk konteks.
- `version`: boleh dinaikkan setiap kali aturan berubah.
- `title`: ringkas aturan.
- `description`: berikan alasan dan ruang lingkup.
- `source`: dari mana aturan berasal.
- `authority`: siapa yang membuatnya sah.
- `lifecycle`: status aturan.
- `governance`: seberapa ketat aturan ini diubah.
- `enforcement`: bagaimana aturan ini dihadirkan ke tim.

## 2. Context Pack Template

Gunakan pack untuk mengelompokkan aturan yang serupa.

```yaml
pack_id: "pack-security-basic"
name: "Security Starter Pack"
description: "Kumpulan aturan dasar keamanan untuk tim aplikasi internal."
version: 1
contexts:
  - id: "ctx-api-validation"
  - id: "ctx-tls-required"
  - id: "ctx-secret-rotation"
```

## 3. Change Proposal Template

Gunakan ini saat mengusulkan perubahan aturan, terutama untuk kelas `hardened`.

```markdown
# Proposal Perubahan Context

## Context yang Diubah
- id: `ctx-your-rule-id`
- version saat ini: 1

## Perubahan yang Diusulkan
- ringkasan perubahan
- field yang diubah

## Alasan
- mengapa perubahan ini diperlukan
- dampak jika tidak dilakukan

## Tim yang Terpengaruh
- tim engineering
- product
- compliance

## Rencana Migrasi
- langkah upgrade aturan
- rollback jika perlu

## Approval
- [ ] Product Team
- [ ] Engineering Lead
- [ ] Compliance atau owner tugas
```

## 4. Rekomendasi Struktur File

Untuk startup kecil, struktur sederhana lebih baik:

```
/contexts/
  ctx-api-validation.yaml
  ctx-feature-launch-window.yaml
  ctx-code-style.yaml
/docs/
  lcdd-quick-start.md
  lcdd-concepts.md
  lcdd-cheat-sheet.md
  lcdd-templates.md
```

Jika Anda mulai dengan satu konteks, simpan dulu di root atau `/contexts`.

## 5. Template Presentasi untuk Non-Teknis

Buat satu halaman singkat untuk bisnis atau manajemen:

- Masalah: keputusan produk cepat berubah.
- Solusi: LCDD membuat aturan itu terlihat dan dapat ditinjau.
- Contoh: "Feature X hanya diluncurkan setelah disetujui product".
- Langkah awal: tulis konteks di repo, review, aktifkan.

Gunakan template ini sebagai basis pertemuan internal dengan tim produk atau tim manajemen.