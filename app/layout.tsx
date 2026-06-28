import type {Metadata} from 'next'
import {Roboto} from 'next/font/google';
import './globals.css'
import {NavigationHeader} from "@/app/ui/header";
import {SiteFooter} from "@/app/ui/footer";

export const metadata: Metadata = {
    title: 'Reese M.E. Hyde',
    description: "Reese Hyde's portfolio website",
}

// TODO: on laptop without internet this becomes serif'd
//  need to investigate and ensure the fallback is sans serif
const roboto = Roboto({
    subsets: ['latin'],
    variable: '--font-sans',        // maps to Tailwind’s var(--font-sans)
    weight: ['300', '400', '500', '700'],
});

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`${roboto.variable} font-sans`}>
            <body>
                <div className="min-h-screen max-w-7xl m-auto px-4 sm:px-8 flex flex-col">
                    <header>
                        <NavigationHeader/>
                    </header>
                    <main className="grow">
                        {children}
                    </main>
                    <SiteFooter/>
                </div>
            </body>
        </html>
    )
}
