## WIP

- took a built version
- couldn't get tex server working against my distribution, so proxied to theirs
  - but cached locally, expecting it would disappear at some point
  - it did, but mine works well enough for the delta of most new files
- then modified client: DRYd up file fetch from server
  - so I can swap source server in one place
  - modified it to treat 404s the same as 301s and not require a custom header
  - now it works with a static server! I can just host the local cache
- now trying to build up an IDB-backed cache, we'll see what happens
- 