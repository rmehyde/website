'use client'

import ContentCards from "@/app/ui/cards/contentCards";
import {Dimension, dimensionLabels, dimensionScoresSchema, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import {useState} from "react";

export default function DynamicProjects() {
    // initialize weights to maxScore for each dimension
    const [values, setValues] = useState<Record<string,number>>(
        Dimension.options.reduce(
            (acc, dim) => ({ ...acc, [dim]: maxScore }),
            {}
        )
    );

    return (
    <main className="min-h-screen p-4 md:p-14">
        <div className="p-8">
            {/* radial selector drives the weights */}
            <RadialSelector
                dimensionLabels={dimensionLabels}
                values={values}
                levels={maxScore}
                max={maxScore}
                onChange={setValues}
                plotRadius={150}
            />

            {/* content cards re-sort based on those weights */}
            {}
            <ContentCards weights={dimensionScoresSchema.parse(values)} />
        </div>
    </main>
)
}
