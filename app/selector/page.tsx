'use client';

import { RadialSelector } from '@/components/ui/radial';
import { useState } from 'react';
import {Dimension, dimensionLabels, dimensionScoresSchema} from "@/app/lib/content/scoring";

export default function RadialSelectorDemoPage() {
    // initialize each value to 0
    const [values, setValues] = useState<Record<string, number>>(
        Dimension.options.reduce((acc, dim) => ({ ...acc, [dim]: 0 }), {})
    );

    // update state and log whenever a handle moves
    const handleChange = (updated: Record<string, number>) => {
        setValues(updated);
        console.log('radial selector values:', updated);
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl mb-4">radial selector demo</h1>
            <RadialSelector
                dimensionLabels={dimensionLabels}
                values={values}
                levels={5}
                max={5}
                onChange={handleChange}
                plotRadius={150}
            />
        </div>
    );
}
