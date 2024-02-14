import type {Metadata} from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Reese M.E. Hyde',
    description: "Reese Hyde's portfolio website",
}

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className="">
        <header className="w-full text-2xl sm:text-3xl font-sans underline box-border text-center sm:text-left sm:pl-10 pt-10 pb-0 pr-0">
            Reese Hyde: Selected Projects
        </header>
        {children}
        </body>
        </html>
    )
}
