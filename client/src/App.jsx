import { Route, Routes } from 'react-router-dom'
import { PublicLayout } from './components/Layout.jsx'
import { ScrollToTop } from './components/ScrollToTop.jsx'
import { CONTENT_CONFIGS } from './lib/contentConfigs.js'
import Artikel from './pages/Artikel.jsx'
import ArtikelDetail from './pages/ArtikelDetail.jsx'
import Brief from './pages/Brief.jsx'
import Home from './pages/Home.jsx'
import Lacak from './pages/Lacak.jsx'
import Layanan from './pages/Layanan.jsx'
import NotFound from './pages/NotFound.jsx'
import Paket from './pages/Paket.jsx'
import Portofolio from './pages/Portofolio.jsx'
import PortofolioDetail from './pages/PortofolioDetail.jsx'
import AdminContent from './pages/admin/AdminContent.jsx'
import AdminLeadDetail from './pages/admin/AdminLeadDetail.jsx'
import AdminLeads from './pages/admin/AdminLeads.jsx'
import AdminPayments from './pages/admin/AdminPayments.jsx'
import { AdminLayout } from './pages/admin/AdminLayout.jsx'
import AdminLogin from './pages/admin/AdminLogin.jsx'
import AdminOverview from './pages/admin/AdminOverview.jsx'

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/layanan" element={<Layanan />} />
          <Route path="/paket" element={<Paket />} />
          <Route path="/portofolio" element={<Portofolio />} />
          <Route path="/portofolio/:slug" element={<PortofolioDetail />} />
          <Route path="/artikel" element={<Artikel />} />
          <Route path="/artikel/:slug" element={<ArtikelDetail />} />
          <Route path="/brief" element={<Brief />} />
          <Route path="/lacak" element={<Lacak />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin" element={<AdminLogin />} />

        <Route element={<AdminLayout />}>
          <Route path="/admin/ringkasan" element={<AdminOverview />} />
          <Route path="/admin/lead" element={<AdminLeads />} />
          <Route path="/admin/lead/:id" element={<AdminLeadDetail />} />
          <Route path="/admin/transaksi" element={<AdminPayments />} />
          <Route path="/admin/layanan" element={<AdminContent config={CONTENT_CONFIGS.services} />} />
          <Route path="/admin/paket" element={<AdminContent config={CONTENT_CONFIGS.packages} />} />
          <Route path="/admin/portofolio" element={<AdminContent config={CONTENT_CONFIGS.portfolio} />} />
          <Route path="/admin/artikel" element={<AdminContent config={CONTENT_CONFIGS.articles} />} />
        </Route>
      </Routes>
    </>
  )
}
