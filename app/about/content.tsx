import {H2} from "@/app/ui/sectionHeaders";
import {CopyPageContent, ExternalLink} from "@/app/ui/copyPage";

export function AboutReese() {
    return (
        <CopyPageContent>
            <H2>About Reese</H2>
            <p>
                Reese M.E. Hyde is a Machine Learning Engineer by trade, but loves all flavors of software and many
                things far beyond it. He strives to understand how things work, and the way things might be made to
                work. His interests include economics, finance, physics, neuroscience, cognitive science, ecology,
                cooking, hiking, and much more.
            </p>
            <p>
                Reese was born and raised in Austin, Texas and is now primarily based in Brooklyn, New York.
            </p>
        </CopyPageContent>
    );
}

export function AboutSite() {
    return (
        <CopyPageContent>
            <H2>About This Site</H2>
            <p>
                This website is as much a fun exercise as it is a portfolio. Each item — every project and resume bullet
                — has a title and a short version and a long version, and scores along the dimensions that you can tune
                in the plots. That's what lets the content be dynamic, so that as you make your selection the site
                filters and sorts what you see.
            </p>
            <p>
                But it's implemented as a <ExternalLink href="https://en.wikipedia.org/wiki/Static_web_page" text="static site"/>,
                which means that it's just a pile of files your device downloads and runs itself: on the Resume page,
                it's your browser that's actually generating dynamic markup based on your selections, and then running a{" "}
                <ExternalLink href="https://en.wikipedia.org/wiki/XeTeX" text="typesetting engine"/>{" "}
                which was compiled into a{" "}
                <ExternalLink href="https://en.wikipedia.org/wiki/WebAssembly" text="web-compatible binary format"/>{" "}
                to render it into a PDF.
                I cannot stress enough that this is an objectively poor technical approach
                to such a feature — generating a dynamic PDF is exactly the kind of thing that should be done by a
                server, not your browser. But if your device can do the computation itself, then I don't have to
                pay for a server to do it, and there's less that can go wrong to bring down the site. Those
                advantages really do make for a fun technical constraint.
            </p>
            <p>
                The other thing about static sites, though, is that they're inherently open. In order for your
                browser to do all the work, it has to have all the code. Nothing is held back, the recipes are
                right there on your physical machine.
                The web was envisioned as a great equalizer, but over the
                preceding decades we've watched it consolidate into the hands of a few giants who use opaque
                algorithms to decide who sees what content. The internal workings of their platforms are kept
                secret, and modest offers of visibility or control seem to follow backlash and legal threats more than
                moral obligations. Static websites lay everything bare, and I think that's neat.
            </p>
            <p>
                The format on your device is friendlier to machines than humans, though. If you're curious for a look
                yourself, you can see all the{" "} <ExternalLink href="https://github.com/rmehyde/website" text="code"/>{" "}
                and{" "} <ExternalLink href="TODO" text="content"/>{" "}
                {/* TODO: replace "TODO" with the real content repo/path URL */}
                for the site on GitHub.
            </p>
        </CopyPageContent>
    );
}

export function Acknowledgements() {
    return (
        <CopyPageContent>
            <H2>Acknowledgements</H2>
            <p>
                This website, like all software, could not be created without the work of many others who build
                the foundations on which it stands. I am particularly grateful to{" "}
                <a href="https://dl.acm.org/doi/10.1145/3209280.3209522" target="_blank" rel="noopener noreferrer" className="underline">Elliot Wen and Gerald Weber</a>{" "}
                and the folks at the{" "}
                <a href="https://bytecodealliance.org/" target="_blank" rel="noopener noreferrer" className="underline">Bytecode Alliance</a>, the{" "}
                <a href="https://react.dev/blog/2026/02/24/the-react-foundation" target="_blank" rel="noopener noreferrer" className="underline">React Foundation</a>, and{" "}
                <a href="https://vercel.com/oss" target="_blank" rel="noopener noreferrer" className="underline">Vercel</a>, whose code is also running as you browse this site.
            </p>
        </CopyPageContent>
    );
}
