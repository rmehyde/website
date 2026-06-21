"use client"
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {pages} from "@/app/lib/nav";

export function NavigationHeader() {
    const pathname = usePathname()

    if (pathname === '/') return null

    return (
        <header className="flex flex-wrap justify-between items-center pb-12 md:pt-6">
            <Link href="/" className="invisible md:visible md:text-2xl">Reese Hyde</Link>
            {/* TODO: this is a "line break only on small screens" as an alternative to hiding the header as above*/}
            {/*<span className="block w-full md:hidden" aria-hidden />*/}
            <nav className="flex gap-4">
                {pages.map(page => {
                    const href = `/${page.toLowerCase()}`
                    const isActive = pathname === href
                    return (
                        <Link
                            key={page}
                            href={href}
                            className={'text-sm md:text-2xl ' + (isActive ? 'underline' : '')}
                        >
                            {page}
                        </Link>
                    )
                })}
            </nav>
        </header>
    )
}
