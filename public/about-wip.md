## About Me

Reese Matthew Earle Hyde is a machine learning engineer by trade

strives to understand how things work, and the way things might be made to work



finance, economics,
cooking, hiking,
neuroscience, cognitive science, philosphy of mind,


I believe strongly the separation of interfaces and implementation.

He was born and raised in Austin, Texas and is now primarily based in Brooklyn, NY.



## About This Site

This website is as much a fun exercise as it is a product. It's implemented a _static site_, which means that it's just 
a pile of files that your device downloads and runs itself. Of course, the _functionality_ of the site is dynamic: you 
can interact with the dimensions and profiles to see different projects or resumes. Typically a server would compute 
that kind of dynamic content and then deliver it to you, but in this case your browser is actually doing all of the work 
itself.

On the Resume page, your browser is actually generating dynamic resume markup based on your selections, and then running 
a [typesetting engine](https://en.wikipedia.org/wiki/XeTeX) which was compiled into a [web-focused binary 
format](https://en.wikipedia.org/wiki/WebAssembly) to render it into a PDF.

I cannot stress enough that this is an objectively _terrible_ technical approach to such a feature.

The web was envisioned as a great equalizer. But over the preceding decades we've watched it consolidate into the hands of 
a few giants, who use opaque algorithms to decide who sees what content. The internal workings of their platforms are kept 
highly secret, ...

TODO talk about dynamic content and schema.

Implementing this as a static site reduces my costs — I would have to pay for compute on a server, but don't if it happens in 
your browser — but also serves as proof that highly dynamic websites don't always need to pull their content generation away 
from users. We simply send your browser instructions on how to run the site, and it does all the work itself. No secrets here, 
you can even read the source code yourself [here](TODO) or browse the raw content backing the Projects and Resume page [here](TODO).


## Acknowledgements

This website, like all software, could not be provided without 