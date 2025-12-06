"use client"
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {pages} from "@/app/lib/nav";

export function NavigationHeader() {
    const pathname = usePathname()

    if (pathname === '/') return null

    return (
        <header className="flex justify-between items-center p-4 md:py-6">
            <Link href="/" className="text-xl">Reese Hyde</Link>
            <nav className="flex gap-4">
                {pages.map(page => {
                    const href = `/${page.toLowerCase()}`
                    const isActive = pathname === href
                    return (
                        <Link
                            key={page}
                            href={href}
                            className={isActive ? 'underline' : ''}
                        >
                            {page}
                        </Link>
                    )
                })}
            </nav>
        </header>
    )
}
