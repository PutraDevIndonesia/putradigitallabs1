import 'dotenv/config'
import { closeFirebase, db, isConfigured } from '../src/firebase.js'

const FORCE = process.argv.includes('--force')
const WITH_SAMPLE = process.argv.includes('--with-sample')

const services = {
  'layanan-profil-perusahaan': {
    order: 1,
    icon: 'globe',
    title_id: 'Website profil perusahaan',
    title_en: 'Company profile website',
    summary_id:
      'Halaman profil, layanan, dan kontak yang menjelaskan bisnis Anda dengan jelas, cepat dibuka, dan siap ditemukan mesin pencari.',
    summary_en:
      'Profile, service, and contact pages that state what your business does, load quickly, and are ready for search engines.',
    published: true,
  },
  'layanan-toko-online': {
    order: 2,
    icon: 'cart',
    title_id: 'Toko online',
    title_en: 'Online store',
    summary_id:
      'Katalog produk, keranjang, dan alur checkout, termasuk integrasi pembayaran dan ongkos kirim yang Anda pakai.',
    summary_en:
      'Product catalog, cart, and checkout flow, including the payment and shipping services you already use.',
    published: true,
  },
  'layanan-sistem-internal': {
    order: 3,
    icon: 'dashboard',
    title_id: 'Sistem internal dan dashboard admin',
    title_en: 'Internal systems and admin dashboards',
    summary_id:
      'Panel untuk mengelola data, pengguna, dan laporan sesuai alur kerja tim Anda, bukan sekadar tampilan contoh.',
    summary_en:
      'Panels to manage records, users, and reports around your team flow, not demo screens.',
    published: true,
  },
  'layanan-integrasi': {
    order: 4,
    icon: 'plug',
    title_id: 'Integrasi API dan pembayaran',
    title_en: 'API and payment integration',
    summary_id:
      'Menyambungkan website ke layanan yang sudah berjalan: payment gateway, ekspedisi, CRM, atau WhatsApp.',
    summary_en:
      'Connecting the site to services already in use: payment gateways, couriers, CRM, or WhatsApp.',
    published: true,
  },
  'layanan-perawatan': {
    order: 5,
    icon: 'wrench',
    title_id: 'Perbaikan dan perawatan website',
    title_en: 'Website fixes and maintenance',
    summary_id:
      'Menangani bug, mempercepat halaman, memperbarui dependensi, dan menambah fitur pada website yang sudah tayang.',
    summary_en:
      'Fixing bugs, speeding up pages, updating dependencies, and adding features to a live website.',
    published: true,
  },
  'layanan-landing-page': {
    order: 6,
    icon: 'gauge',
    title_id: 'Landing page kampanye',
    title_en: 'Campaign landing pages',
    summary_id:
      'Satu halaman fokus untuk iklan berbayar, dengan formulir yang datanya masuk ke database, bukan cuma ke email.',
    summary_en:
      'One focused page for paid ads, with forms that write to a database instead of only an inbox.',
    published: true,
  },
}

const packages = {
  'paket-dasar': {
    order: 1,
    name_id: 'Paket Dasar',
    name_en: 'Starter',
    tagline_id: 'Untuk usaha yang butuh kehadiran online cepat dan rapi.',
    tagline_en: 'For a business that needs a clean online presence quickly.',
    priceFrom: null,
    priceNote_id: 'Minta penawaran',
    priceNote_en: 'Request a quote',
    delivery_id: '7 sampai 14 hari kerja',
    delivery_en: '7 to 14 working days',
    features_id: [
      'Sampai 5 halaman, desain menyesuaikan merek Anda',
      'Formulir kontak tersambung ke database',
      'Tampilan responsif untuk ponsel dan desktop',
      'Optimasi dasar kecepatan dan SEO',
      'Panduan penggunaan untuk tim Anda',
    ],
    features_en: [
      'Up to 5 pages, designed around your brand',
      'Contact form wired to a database',
      'Responsive layout for phone and desktop',
      'Baseline speed and SEO work',
      'Usage guide for your team',
    ],
    recommended: false,
    published: true,
  },
  'paket-bisnis': {
    order: 2,
    name_id: 'Paket Bisnis',
    name_en: 'Business',
    tagline_id: 'Untuk perusahaan yang perlu mengelola konten sendiri.',
    tagline_en: 'For companies that need to manage their own content.',
    priceFrom: null,
    priceNote_id: 'Minta penawaran',
    priceNote_en: 'Request a quote',
    delivery_id: '3 sampai 5 minggu',
    delivery_en: '3 to 5 weeks',
    features_id: [
      'Sampai 12 halaman atau katalog produk',
      'Dashboard admin untuk mengelola konten',
      'Database dan autentikasi pengguna',
      'Integrasi pembayaran atau layanan pihak ketiga',
      'Pelacakan status proyek lewat kode tiket',
      'Satu babak revisi desain',
    ],
    features_en: [
      'Up to 12 pages or a product catalog',
      'Admin dashboard for content management',
      'Database and user authentication',
      'Payment or third-party service integration',
      'Project status tracking by ticket code',
      'One design revision round',
    ],
    recommended: true,
    published: true,
  },
  'paket-sistem-kustom': {
    order: 3,
    name_id: 'Paket Sistem Kustom',
    name_en: 'Custom System',
    tagline_id: 'Untuk alur kerja khusus yang tidak cocok dengan template.',
    tagline_en: 'For specific workflows that templates do not fit.',
    priceFrom: null,
    priceNote_id: 'Minta penawaran',
    priceNote_en: 'Request a quote',
    delivery_id: 'Sesuai lingkup, disepakati di awal',
    delivery_en: 'Scope-based, agreed up front',
    features_id: [
      'Analisis kebutuhan dan dokumen lingkup kerja',
      'Peran pengguna dan hak akses',
      'Laporan dan ekspor data',
      'Integrasi sistem internal atau ERP',
      'Pengujian dan pendampingan serah terima',
    ],
    features_en: [
      'Requirement analysis and a written scope',
      'User roles and access control',
      'Reports and data export',
      'Internal system or ERP integration',
      'Testing and handover sessions',
    ],
    recommended: false,
    published: true,
  },
}

// Contoh portofolio hanya ditulis kalau diminta lewat --with-sample.
// Isinya karangan dan wajib diganti dengan proyek nyata sebelum website dipublikasikan.
const samplePortfolio = {
  'contoh-profil-perusahaan': {
    slug: 'contoh-profil-perusahaan',
    title_id: 'Contoh: profil perusahaan manufaktur',
    title_en: 'Sample: manufacturing company profile',
    client: 'Ganti dengan nama klien',
    category: 'company-profile',
    year: new Date().getFullYear(),
    url: '',
    summary_id: 'Contoh entri. Hapus atau ganti dengan proyek nyata dari dashboard admin.',
    summary_en: 'Sample entry. Remove or replace with a real project from the admin dashboard.',
    body_id: 'Tulis latar belakang masalah, keputusan teknis, dan hasil yang terukur di sini.',
    body_en: 'Write the problem, technical decisions, and measurable outcome here.',
    stack: ['React', 'Node.js', 'Firebase'],
    coverImage: '',
    published: false,
  },
}

async function writeCollection(path, records) {
  let written = 0
  for (const [id, record] of Object.entries(records)) {
    const itemRef = db().ref(`${path}/${id}`)
    if (!FORCE) {
      const existing = await itemRef.get()
      if (existing.exists()) continue
    }
    const now = new Date().toISOString()
    await itemRef.set({ ...record, createdAt: now, updatedAt: now })
    written += 1
  }
  return written
}

async function main() {
  if (!isConfigured()) {
    console.error('FIREBASE_DATABASE_URL belum diisi di server/.env, seed dibatalkan.')
    process.exitCode = 1
    return
  }

  const serviceCount = await writeCollection('public/services', services)
  const packageCount = await writeCollection('public/packages', packages)
  let portfolioCount = 0

  if (WITH_SAMPLE) {
    portfolioCount = await writeCollection('public/portfolio', samplePortfolio)
  }

  console.log(`Layanan tertulis: ${serviceCount}`)
  console.log(`Paket tertulis: ${packageCount}`)
  if (WITH_SAMPLE) {
    console.log(`Contoh portofolio tertulis: ${portfolioCount} (status draft, wajib diganti)`)
  }
  console.log('Catatan: harga paket masih kosong. Isi dari dashboard admin agar tampil di halaman paket.')
  if (!FORCE) console.log('Data yang sudah ada tidak ditimpa. Pakai --force untuk menimpa.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => closeFirebase().catch(() => {}))
