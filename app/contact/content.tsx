import Link from "next/link";

export const REVEAL_TEXT = "Reveal Contact Details"

export function ContactIntro() {
    return (
        <>
            <p>
                Please don't hesitate to get in touch — if anything here caught your interest I'm sure that I'd love to
                hear from you.
            </p>
            <p>
                Unfortunately putting my contact information on the open internet isn't tenable, but if you reach out{" "}
                <a
                    href="https://www.linkedin.com/in/reese-h-835b28175/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                >
                    on LinkedIn
                </a>{" "}
                I'll be happy to share it. Or if you have the passphrase, you can reveal it below.
            </p>
            <p>
                If you're thinking of reaching out about a role, the{" "}
                <Link href="/recruiting" className="underline">Recruiting</Link>{" "}
                page has what you need.
            </p>
        </>
    );
}
