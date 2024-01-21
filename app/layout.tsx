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
        <header className="h-20 w-full text-3xl font-sans underline box-border pt-10 pl-10 pb-0 pr-0">
            Reese Hyde: Selected Projects
        </header>
        {children}
        </body>
        </html>
    )
}
