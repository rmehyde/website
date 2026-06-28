"use client"
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {pages} from "@/app/lib/nav";
import {scale} from "@/app/lib/typography";
import {cn} from "@/components/lib/utils";
import {House} from "lucide-react";

export function NavigationHeader() {
    const pathname = usePathname()

    if (pathname === '/') return null

    return (
        <header className="flex flex-wrap items-center justify-between">
            {/* Home link: House icon below sm (no room for the name), the full name at sm+. */}
            <Link href="/" aria-label="Home" className={cn(scale.nav, "inline-flex items-center")}>
                <House className="h-4 w-4 sm:hidden" aria-hidden="true"/>
                <span className="hidden sm:inline">Reese Hyde</span>
            </Link>
            <nav className="flex gap-2 sm:gap-5">
                {pages.map(page => {
                    const href = `/${page.toLowerCase()}`
                    const isActive = pathname === href
                    return (
                        <Link
                            key={page}
                            href={href}
                            className={cn(scale.nav, isActive ? 'underline' : '')}
                        >
                            {page}
                        </Link>
                    )
                })}
            </nav>
        </header>
    )
}
