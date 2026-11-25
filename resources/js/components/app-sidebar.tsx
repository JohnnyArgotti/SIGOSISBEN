import { Link, usePage} from '@inertiajs/react'
import {
    Users,
    Building,
    CalendarSync,
    MapPinHouse,
    BookOpen,
    BriefcaseBusiness,
    ChartNoAxesCombined,
    ShieldCheck,
    Settings2,
    Building2,
} from 'lucide-react'

import AppLogo from '@/components/app-logo'
import { NavFooter } from '@/components/nav-footer'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar'

import type { NavItem } from '@/types'

function getMainNavItems(): NavItem[] {

    const items: NavItem[] = []
    const { auth } = usePage().props as any;

    const can = (permission: string) => {
        return auth.user.permissions?.includes(permission);
    };

    if (can('Ver usuarios') || can('Crear usuarios')) {

        const children: NavItem[] = []

        if (can('Ver usuarios')) {
            children.push({
                title: 'Lista de usuarios',
                href: '/gestion_usuarios',
            })
        }

        if (can('Crear usuarios')) {
            children.push({
                title: 'Registro de usuarios',
                href: '/gestion_usuarios/create',
            })
        }

        items.push({
            title: 'Gestión de usuarios',
            href: can('Ver usuarios') ? '/gestion_usuarios' : '/gestion_usuarios/create',
            icon: Users,
            children: children,
        })
    }

    if (can('Ver solicitudes') || can('Ver atenciones') || can('Crear solicitudes') || can('Crear atenciones')) {

        const children: NavItem[] = []

        if (can('Ver solicitudes') || can('Ver atenciones')) {
            children.push({
                title: 'Lista de solicitudes',
                href: '/gestion_solicitudes',
            })
        }

        if (can('Crear solicitudes') || can('Crear atenciones')) {
            children.push({
                title: 'Registro de solicitudes',
                href: '/gestion_solicitudes/create',
            })
        }

        items.push({
            title: 'Gestión de solicitudes',
            href: (can('Ver solicitudes') || can('Ver atenciones')) ? '/gestion_solicitudes' : '/gestion_solicitudes/create',
            icon: Building,
            children: children,
        })
    }

    if (can('Ver eventos') || can('Crear eventos')) {

        const children: NavItem[] = []

        if (can('Ver eventos')) {
            children.push({
                title: 'Lista de eventos',
                href: '/gestion_eventos',
            })
        }

        if (can('Crear eventos')) {
            children.push({
                title: 'Registro de eventos',
                href: '/gestion_eventos/create',
            })
        }

        items.push({
            title: 'Gestión de eventos',
            href: can('Ver eventos') ? '/gestion_eventos' : '/gestion_eventos/create',
            icon: CalendarSync,
            children: children,
        })
    }

    if (can('Ver solicitudes en campo') || can('Ver paquetes') || can('Crear paquetes')) {

        const children: NavItem[] = []

        if (can('Ver solicitudes en campo')) {
            children.push({
                title: 'Lista de solicitudes',
                href: '/gestion_campo',
            })
        }
        if (can('Ver paquetes')) {
            children.push({
                title: 'Lista de paquetes',
                href: '/gestion_campo/package',
            })
        }
        if (can('Crear paquetes')) {
            children.push({
                title: 'Registro de paquetes',
                href: '/gestion_campo/create',
            })
        }

        items.push({
            title: 'Gestión de campo',
            href: can('Ver solicitudes en campo')
                ? '/gestion_campo'
                : can('Ver paquetes')
                    ? '/gestion_campo/package'
                    : '/gestion_campo/create',
            icon: MapPinHouse,
            children: children,
        })
    }

    if (can('Ver encuestadores') || can('Crear encuestadores')) {

        const children: NavItem[] = []

        if (can('Ver encuestadores')) {
            children.push({
                title: 'Lista de encuestadores',
                href: '/gestion_encuestadores',
            })
        }

        if (can('Crear encuestadores')) {
            children.push({
                title: 'Registro de encuestadores',
                href: '/gestion_encuestadores/create',
            })
        }

        items.push({
            title: 'Gestión encuestadores',
            href: can('Ver encuestadores') ? '/gestion_encuestadores' : '/gestion_encuestadores/create',
            icon: BriefcaseBusiness,
            children: children,
        })
    }

    if (can('Ver solicitudes en calidad')) {
        items.push({
            title: 'Gestión de calidad',
            href: '/gestion_calidad',
            icon: Building2,
        })
    }

    if (can('Ver reportes')) {
        items.push({
            title: 'Reportes',
            href: '/gestion_reportes',
            icon: ChartNoAxesCombined,
        })
    }

    if (can('Ver auditoría')) {
        items.push({
            title: 'Auditoría',
            href: '/gestion_auditoria',
            icon: ShieldCheck,
        })
    }

    if (
        can('Ver roles') || can('Crear roles') ||
        can('Ver puntos de atención') || can('Crear puntos de atención') ||
        can('Ver documentos públicos') || can('Crear documentos públicos')
    ) {

        const children: NavItem[] = []

        if (can('Ver roles')) {
            children.push({
                title: 'Gestión de roles',
                href: '/gestion_roles',
            })
        } else if (can('Crear roles')) {
            children.push({
                title: 'Registro de roles',
                href: '/gestion_roles/create',
            })
        }

        if (can('Ver puntos de atención')) {
            children.push({
                title: 'Gestión de puntos',
                href: '/gestion_puntos',
            })
        } else if (can('Crear puntos de atención')) {
            children.push({
                title: 'Registro de puntos',
                href: '/gestion_puntos/create',
            })
        }

        if (can('Ver documentos públicos')) {
            children.push({
                title: 'Gestión de documentos públicos',
                href: '/gestion_documentos_publicos',
            })
        } else if (can('Crear documentos públicos')) {
            children.push({
                title: 'Registro de documentos públicos',
                href: '/gestion_documentos_publicos/create',
            })
        }

        items.push({
            title: 'Parametrización',
            href: children[0].href,
            icon: Settings2,
            children: children,
        })
    }

    return items
}

const footerNavItems: NavItem[] = [
    {
        title: 'Acerca de',
        href: '/acerca_de',
        icon: BookOpen,
    },
]

export function AppSidebar() {

    const mainNavItems = getMainNavItems()

    return (
        <Sidebar collapsible="icon" variant="inset">

            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center px-2 py-1">
                            <AppLogo />
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>

        </Sidebar>
    )
}
