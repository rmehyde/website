import {H1} from "@/components/ui/section-headers";
import {CopyPageContent, TextLink} from "@/components/ui/copy-page";
import {scale} from "@/app/lib/typography";

// Static screenshots gallery for the Traffic Race VR project. This page is the
// destination of the project card's "screenshots" link; it isn't part of the
// dynamic content system, so the captions live here rather than in the YAML.
const APK_URL = "/assets/trafficrace.apk";

// Pre-shrunk WebP (originals were ~2360px PNGs, ~1.5 MB total). width/height are the
// intrinsic dims so the browser reserves the right box and doesn't shift on load.
const SCREENS = [
    {src: "/assets/screens/screen1.webp", caption: "The highway to cross", width: 1280, height: 745},
    {src: "/assets/screens/screen2.webp", caption: "Gameplay with a second player visible", width: 1280, height: 744},
    {src: "/assets/screens/screen3.webp", caption: "Post-game", width: 1280, height: 744},
    {src: "/assets/screens/screen4.webp", caption: "Matchmaking", width: 1280, height: 746},
] as const;

export default function TrafficRaceScreens() {
    return (
        <div className="flex flex-col items-center gap-8">
            <div className="w-full max-w-2xl space-y-4">
                <H1>Traffic Race VR</H1>
                <CopyPageContent>
                    <p>
                        A Google Cardboard mobile VR game in which players on a local network race each
                        other across a highway. You can{" "}
                        <TextLink href={APK_URL} text="download the Android APK"/> to try it, or take
                        a look at a few screenshots below.
                    </p>
                </CopyPageContent>
            </div>

            <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
                {SCREENS.map(({src, caption, width, height}) => (
                    <figure key={src} className="space-y-2">
                        <img
                            src={src}
                            alt={caption}
                            width={width}
                            height={height}
                            loading="lazy"
                            className="h-auto w-full rounded border border-border shadow-sm"
                        />
                        <figcaption className={`${scale.label} text-muted-foreground`}>
                            {caption}
                        </figcaption>
                    </figure>
                ))}
            </div>
        </div>
    );
}
