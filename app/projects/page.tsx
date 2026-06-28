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
            {/* fit or stack: all three side by side or all three vertical" */}
            <div className="@container">
            <div className="flex flex-col mb-12 gap-3 md:gap-7 md:mb-16 justify-evenly @[68rem]:flex-row @[68rem]:gap-0">
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
