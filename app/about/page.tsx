"use client";

import {CopyPageBody} from "@/components/ui/copy-page";
import {AboutReese, AboutSite, Acknowledgements} from "@/app/about/content";

export default function AboutPage() {
    return (
        <CopyPageBody>
            <AboutSite/>
            <AboutReese/>
            <Acknowledgements/>
        </CopyPageBody>
    );
}
