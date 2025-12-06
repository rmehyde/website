import type {Metadata} from 'next'
import {Roboto} from 'next/font/google';
import './globals.css'
import {ConditionalHeader} from "@/app/ui/header";

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
        <body className="">
        <header>
            <ConditionalHeader/>
        </header>
        {children}
        </body>
        </html>
    )
}
