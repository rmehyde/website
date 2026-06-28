# Reese Hyde's Personal Site

As a software engineer I obviously overengineered this thing, as is a rite of passage for personal sites.
It used to be a list of projects captured as manually-written HTML+CSS. That was great, the code 
was totally readable and the complexity of the implementation nicely matched the actual project.

Now it's a statically built NextJS site and every snippet of content fits into a schema with a title and short version 
and long version and list of links and a score along ten dimensions and there's a spider graph so you can decide how 
much of each dimension you want to see and the content also includes my whole job history which a WASM-compiled TeX 
engine will build for you into a dynamic resume. It's a bit silly, and you can read more about it on [the About page](https://rmehyde.com/about).

## Building
- `pnpm install`
- `pnpm run build`

Output will be in `out/` which can be served statically. Note that it must be hosted on a proper webserver, 
e.g. `cd out; python3 -m http.server 3000`
