'use client'

import ContentCards from "@/app/ui/cards/contentCards";
import {Dimension, dimensionLabels, dimensionScoresSchema, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState} from "react";
import {scale} from "@/app/lib/typography";



export default function DynamicProjects() {
    // initialize weights to maxScore for each dimension
    const [values, setValues] = useState<Record<string,number>>(
        Dimension.options.reduce(
            (acc, dim) => ({ ...acc, [dim]: maxScore }),
            {}
        )
    );

    return (
        <div>
            {/* TODO: this needs some better spacing as it looks fucky with the project
            spacing */}
            {/* Fit-or-stack: prompt / graph / prompt sit in a ROW when the container is wide
                enough for all three, otherwise they STACK — all at once, never a partial wrap.
                Container-driven (reacts to this section's width, not the viewport). Tune the
                @[..] threshold below to the row's natural width. */}
            <div className="@container">
            <div className="flex flex-col justify-evenly @[70rem]:flex-row mb-16">
            {/*<div className="flex flex-col gap-24 justify-center md:flex-row">*/}
                {/* TODO: when page is narrow this can look weird with projects on next line we get some dont dead open inside*/}
                <div className={`flex items-center justify-center ${scale.headline} text-center whitespace-nowrap`}>
                    What kind of projects
                </div>
                {/* radial selector drives the weights */}
                <div className="self-center max-w-full">
                    <RadialSelector
                        dimensionLabels={dimensionLabels}
                        values={values}
                        levels={maxScore}
                        max={maxScore}
                        onChange={setValues}
                    />
                </div>
                {/* TODO: the right side of the graph pushes up against this text
                        when the page is pretty narrow but not quite vertical
                */}
                <div className={`flex items-center justify-center ${scale.headline} text-center whitespace-nowrap`}>
                    do you want to see?
                </div>
            </div>
            </div>
            {/* content cards re-sort based on those weights */}
            {}
            <ContentCards weights={dimensionScoresSchema.parse(values)} />
            {/* TODO: use a global footer */}
            <div className="h-20"/>
        </div>
    )
}
