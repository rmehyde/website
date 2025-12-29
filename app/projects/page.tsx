'use client'

import ContentCards from "@/app/ui/cards/contentCards";
import {Dimension, dimensionLabels, dimensionScoresSchema, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState} from "react";
import {useBreakpointUp} from "@/app/lib/tailwind/responsive";



export default function DynamicProjects() {
    const isMdUp = useBreakpointUp("md")

    // initialize weights to maxScore for each dimension
    const [values, setValues] = useState<Record<string,number>>(
        Dimension.options.reduce(
            (acc, dim) => ({ ...acc, [dim]: maxScore }),
            {}
        )
    );

    return (
        <div>
            <div className="flex flex-col justify-evenly md:flex-row">
            {/*<div className="flex flex-col gap-24 justify-center md:flex-row">*/}
                <div className="flex items-center justify-center text-3xl">
                    What kind of projects do you want to see?
                </div>
                {/* radial selector drives the weights */}
                <RadialSelector
                    dimensionLabels={dimensionLabels}
                    values={values}
                    levels={maxScore}
                    max={maxScore}
                    onChange={setValues}
                    plotRadius={isMdUp ? 100 : 75}
                    labelDistance={isMdUp ? 25 :  20}
                    labelTextClass={isMdUp ? "text-sm" : "text-xs"}
                />
            </div>
            {/* content cards re-sort based on those weights */}
            {}
            <ContentCards weights={dimensionScoresSchema.parse(values)} />
        </div>
    )
}
