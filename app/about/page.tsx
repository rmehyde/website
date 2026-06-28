"use client";

import {CopyPageBody} from "@/app/ui/copyPage";
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
