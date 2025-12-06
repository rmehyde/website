import type {Metadata} from 'next'
import {Roboto} from 'next/font/google';
import './globals.css'
import {NavigationHeader} from "@/app/ui/header";

export const metadata: Metadata = {
    title: 'Reese M.E. Hyde',
    description: "Reese Hyde's portfolio website",
}

const roboto = Roboto({
    subsets: ['latin'],
    variable: '--font-sans',        // maps to Tailwind’s var(--font-sans)
    weight: ['300', '400', '500', '700'],
});

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${roboto.variable} font-sans`}>
            <body className="min-h-screen max-w-7xl mx-auto px-4 md:px-14">
                <header>
                    <NavigationHeader/>
                </header>
                <main className="">
                    {children}
                </main>
            </body>
        </html>
    )
}
