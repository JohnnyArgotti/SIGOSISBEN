import { usePage } from '@inertiajs/react';

export function can() {
    const { props } = usePage() as any;

    const permissions: string[] = props.auth?.permissions ?? [];

    const can = (permission: string): boolean => {
        return permissions.includes(permission);
    };

    return { can };
}