'use client'

import {Dimension, dimensionLabels, maxScore} from '@/app/lib/content/scoring';
import {RadialSelector} from "@/components/ui/radial";
import React, {useState} from "react";
import GeneratePDFButton from "@/app/ui/pdf";
import {Card} from "@/components/ui/card";

export default function DynamicProjects() {
    // initialize weights to maxScore for each dimension
    const [values, setValues] = useState<Record<string, number>>(
        Dimension.options.reduce(
            (acc, dim) => ({...acc, [dim]: maxScore}),
            {}
        )
    );

    return (
        <main className="min-h-screen p-4 md:p-14">
            <Card className="p-4 bg-card text-card-foreground">
                {/* TODO: fix scroll issue on mobile */}
                {/* radial selector drives the weights */}
                <RadialSelector
                    dimensionLabels={dimensionLabels}
                    values={values}
                    levels={maxScore}
                    max={maxScore}
                    onChange={setValues}
                    plotRadius={100}  // TODO: should be 75 on mobile
                />

                <div
                    className="relative"
                    style={{width: "fit-content", 'marginLeft': 'auto', 'marginRight': 'auto'}}
                >
                    <GeneratePDFButton/>
                </div>
            </Card>
        </main>
    )
}
