'use client'

import ContentCards from "@/app/ui/cards/contentCards";
import {Dimension, dimensionLabels, dimensionScoresSchema, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState} from "react";
import {scale} from "@/app/lib/typography";

// The Projects graph intentionally exposes a subset of the résumé's dimensions —
// Leadership and Solutions & Integration aren't useful filters for project cards.
// Hidden dimensions never appear in the graph or in `values`; dimensionScoresSchema
// defaults them to 0 on parse, so everything downstream is identical to the full set.
const PROJECT_HIDDEN_DIMENSIONS: Dimension[] = ["leadership", "solutions"];
const projectDimensionLabels = Object.fromEntries(
    Object.entries(dimensionLabels).filter(([dim]) => !PROJECT_HIDDEN_DIMENSIONS.includes(dim as Dimension))
);

export default function DynamicProjects() {
    // initialize weights to maxScore for each visible dimension
    const [values, setValues] = useState<Record<string,number>>(
        Object.keys(projectDimensionLabels).reduce(
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
            <div className="flex flex-col mb-12 mt-4 gap-3 md:gap-7 md:mt-6 md:mb-16 justify-evenly @[68rem]:flex-row @[68rem]:gap-0">
            {/*<div className="flex flex-col gap-24 justify-center md:flex-row">*/}
                {/* TODO: when page is narrow this can look weird with projects on next line we get some dont dead open inside*/}
                <div className={`flex items-center justify-center ${scale.headline} text-center whitespace-nowrap`}>
                    What kind of projects
                </div>
                {/* radial selector drives the weights */}
                <div className="self-center max-w-full">
                    <RadialSelector
                        dimensionLabels={projectDimensionLabels}
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
