import {
  Building2,
  LayoutDashboard,
  ReceiptText,
  Star,
  Users,
  Wrench,
} from 'lucide-react'
import type { NavigationItem } from '../types/navigation'

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    description: 'Point d entree du workspace operations.',
    icon: LayoutDashboard,
  },
  {
    label: 'Vendors',
    to: '/vendors',
    description: 'Gestion des fournisseurs et de leurs flux.',
    icon: Building2,
  },
  {
    label: 'Teams',
    to: '/teams',
    description: 'Organisation interne et coordination produit.',
    icon: Users,
  },
  {
    label: 'Maintenance',
    to: '/maintenance',
    description: 'Suivi des interventions et de la disponibilite.',
    icon: Wrench,
  },
  {
    label: 'Expenses',
    to: '/expenses',
    description: 'Pilotage des depenses et des pieces justificatives.',
    icon: ReceiptText,
  },
  {
    label: 'Reputation',
    to: '/reputation',
    description: 'Monitoring de la qualite percue et des retours terrain.',
    icon: Star,
  },
]
