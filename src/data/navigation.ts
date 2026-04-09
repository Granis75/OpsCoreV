import {
  Building2,
  CalendarDays,
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
    to: '/app',
    description: 'Point d entree du workspace operations.',
    icon: LayoutDashboard,
  },
  {
    label: 'Directory',
    to: '/app/directory',
    description: 'Annuaire operationnel des equipes et fournisseurs.',
    icon: Users,
  },
  {
    label: 'Vendors',
    to: '/app/vendors',
    description: 'Gestion des fournisseurs et de leurs flux.',
    icon: Building2,
  },
  {
    label: 'Teams',
    to: '/app/teams',
    description: 'Organisation interne et coordination produit.',
    icon: Users,
  },
  {
    label: 'Maintenance',
    to: '/app/maintenance',
    description: 'Suivi des interventions et de la disponibilite.',
    icon: Wrench,
  },
  {
    label: 'Operations',
    to: '/app/operations',
    description: 'Calendrier leger des evenements operationnels.',
    icon: CalendarDays,
  },
  {
    label: 'Expenses',
    to: '/app/expenses',
    description: 'Pilotage des depenses et des pieces justificatives.',
    icon: ReceiptText,
  },
  {
    label: 'Reputation',
    to: '/app/reputation',
    description: 'Monitoring de la qualite percue et des retours terrain.',
    icon: Star,
  },
]
