import {
  Boxes,
  Gauge,
  Globe,
  LayoutDashboard,
  Plug,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Workflow,
  Wrench,
} from 'lucide-react'

// Kunci di sini harus sama dengan ICON_KEYS di server/src/validate.js.
// Ikon diambil dari set Lucide (garis tunggal, konsisten) supaya tidak ada emoji di UI.
const ICONS = {
  globe: Globe,
  cart: ShoppingCart,
  dashboard: LayoutDashboard,
  plug: Plug,
  wrench: Wrench,
  gauge: Gauge,
  shield: ShieldCheck,
  store: Store,
  receipt: Receipt,
  boxes: Boxes,
  workflow: Workflow,
  search: Search,
}

export function ServiceIcon({ name, size = 20 }) {
  const Icon = ICONS[name] || Globe
  return <Icon size={size} aria-hidden="true" strokeWidth={1.9} />
}

export function isValidIconKey(name) {
  return Object.prototype.hasOwnProperty.call(ICONS, name)
}

export const ICON_CHOICES = Object.keys(ICONS)
