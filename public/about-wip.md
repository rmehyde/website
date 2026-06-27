## About Reese

Reese Matthew Earle Hyde is a Machine Learning Engineer by trade, but loves all flavors of software and many things far 
beyond it. He strives to understand how things work, and the way things might be made to work. His interests include 
economics, finance, physics, neuroscience, cognitive science, philosophy of mind, ecology, cooking, hiking, and much 
more.

Reese was born and raised in Austin, Texas and is now primarily based in Brooklyn, New York.

## About This Site

This website is as much a fun exercise as it is a portfolio. It's implemented a _static site_, which means that it's just 
a pile of files that your device downloads and runs itself. Of course, the functionality of the site is dynamic: you 
can interact with the dimensions and profiles to see different projects or resumes.

On the Resume page, your browser is actually generating dynamic resume markup based on your selections, and then running 
a [typesetting engine](https://en.wikipedia.org/wiki/XeTeX) which was compiled into a [web-focused binary 
format](https://en.wikipedia.org/wiki/WebAssembly) to render it into a PDF. I cannot stress enough that this is an 
objectively poor technical approach to such a feature: generating a dynamic PDF is exactly the kind of thing that 
should be done by a server. But if your browser can do the computation itself, then I don't have to pay for a server 
to do it, and there's less that can go wrong and bring down the site. Those advantages really do make for a fun 
technical constraint.

The other thing about static sites, though, is that they're inherently open. In order for your browser to do all the 
work, it has to have all the code. Nothing is held back, the recipes are right there on your physical machine. The web 
was envisioned as a great equalizer, but over the preceding decades we've watched it consolidate into the hands 
of a few giants who use opaque algorithms to decide who sees what content. The internal workings of their platforms are 
kept highly secret, and modest offers of visibility or control seem to follow backlash and legal threats more than 
moral obligations. Static websites lay everything bare, and I think that's neat.

The content on the Projects and Resume pages exists in a structured form. Each item — every project and resume bullet 
— has a title and a short version and a long version, along with complete scores along the dimensions that you can tune 
in the plot. As you make your selection, the site filters and sorts what gets shown, and renders it in the appropriate 
format. While your device has all the content and code, it receives it in a format that's friendlier to machines 
than humans. If you're curious yourself, you can see all the [code](https://github.com/rmehyde/website) and 
[content](TODO) for the site on GitHub.

## Acknowledgements

This website, like all software, could not be created without the work of many others who build the foundations on 
which it stands. I am particularly grateful to [Elliot Wen and Gerald Weber](https://dl.acm.org/doi/10.1145/3209280.32095220) 
and the folks at the [Bytecode Alliance](https://bytecodealliance.org/), the [React Foundation](https://react.dev/blog/2026/02/24/the-react-foundation), 
and [Vercel](https://vercel.com/oss), without whose work this site would not be possible.
