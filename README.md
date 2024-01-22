# Reese M.E. Hyde's Personal Site

Reese Hyde's personal website.

As a software engineer, I naturally overengineered this baby since it's my personal site.
The site used to exist with its current content and design as a manually-written HTML+CSS. That was great, the code 
was totally readable and the complexity of the implementation nicely matched the actual project.

It's now constructed in the following way:
- Statically built NextJS site
- Single page with a list of my projects
- Each Project is defined as a file in `<project>.mdx`
- These MDX files get built into MDXCard components and rendered on the page

Updating content is now _slightly_ easier because I can just plop it in a new Markdown file without touchign code. But 
I did this mostly to learn about Next, TypeScript, React, and modern frontend development in general. I do have some 
aspirations for some slick dynamic content, but who knows what the future holds.

## Building
- `npm install`
- `npm run build`

Output will be in `out/` which can be served statically. Note that it must be hosted on a proper webserver, 
e.g. `cd out; python3 -m http.server 3000`
