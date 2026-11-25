import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { url } = usePage();

    // Solo un item abierto + fix de tipos
    const [openItem, setOpenItem] = useState<string | null>(() => {
        const found = items.find((item) =>
            item.children?.some(
                (child) =>
                    typeof child.href === 'string' &&
                    url.startsWith(child.href)
            )
        );
        return found?.title ?? null;
    });

    const toggleItem = (title: string) => {
        setOpenItem((prev) => (prev === title ? null : title));
    };

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarMenu>
                {items.map((item) =>
                    item.children && item.children.length > 0 ? (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                onClick={() => toggleItem(item.title)}
                                tooltip={{ children: item.title }}
                                className="cursor-pointer"
                            >
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                                <ChevronDown
                                    className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                                        openItem === item.title ? 'rotate-180' : ''
                                    }`}
                                />
                            </SidebarMenuButton>

                            {openItem === item.title && (
                                <SidebarMenuSub>
                                    {item.children.map((child) => (
                                        <SidebarMenuSubItem key={child.title}>
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={
                                                    typeof child.href === 'string' &&
                                                    isCurrentUrl(child.href)
                                                }
                                            >
                                                <Link href={child.href} prefetch>
                                                    {child.icon && <child.icon />}
                                                    <span>{child.title}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            )}
                        </SidebarMenuItem>
                    ) : (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={
                                    typeof item.href === 'string' &&
                                    isCurrentUrl(item.href)
                                }
                                tooltip={{ children: item.title }}
                            >
                                <Link href={item.href} prefetch>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )
                )}
            </SidebarMenu>
        </SidebarGroup>
    );
}