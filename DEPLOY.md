# Getting it onto the phone

The app needs to be served over HTTPS to become an installed app. A service
worker only registers in a secure context, so `file://` and a plain LAN address
both give you a web page rather than something with an icon that works offline.

GitHub Pages is the least work and is free.

## One-time setup

**1. Make a GitHub account** — <https://github.com/signup>. Free tier is fine.

**2. Log the CLI in.** In a terminal:

```
gh auth login
```

Choose *GitHub.com* → *HTTPS* → *Login with a web browser*. It prints a one-time
code, opens the browser, and you approve it there. The token is stored by `gh` on
this machine.

Do this yourself. Nobody else should be handling your credentials, and there is
no step here where a token needs to be pasted into a chat.

**3. Publish.** From this folder:

```
gh repo create eldritch-garden --public --source=. --remote=origin --push
```

**4. Turn on Pages.**

```
gh api --method POST /repos/:owner/eldritch-garden/pages -f "source[branch]=main" -f "source[path]=/"
```

Or click it: repo → Settings → Pages → Source: *Deploy from a branch* → `main` /
`(root)`.

The site appears at `https://<username>.github.io/eldritch-garden/` within a
minute or two.

**Note:** Pages on a free account requires the repo to be **public**. That
includes the four field-test screenshots, one of which shows a phone status bar.
Nothing sensitive, but if you would rather they were not public, delete them
before publishing — nothing in the app depends on them.

## Installing it

On the phone, open that URL in Chrome, then menu → **Add to Home screen**.

You should get an icon rather than a bookmark, and it should open with no browser
chrome at all. If it opens in a tab with an address bar, the service worker did
not register — see below.

## Shipping a change

```
git add -A && git commit -m "..." && git push
```

Pages redeploys in a minute. **Bump `CACHE` in `sw.js` whenever `index.html`
changes** — navigations are network-first so an online phone gets the new build
immediately, but the constant is what clears the old cached copy.

## Checking the service worker

It has never been observed installing — see BUGS.md 7.2. It parses and every
`SHELL` entry resolves, but no browser in this project's history has actually run
it, because the environment it was written in blocks service worker registration.

First run on the phone, verify it:

1. Chrome on desktop → `chrome://inspect/#devices` with the phone connected, or
   just open the site on a desktop browser.
2. DevTools → Application → Service Workers. It should say **activated and
   running**.
3. DevTools → Network → tick *Offline*, reload. The app should still come up.

If it fails, the app still works — you lose offline and the install prompt, not
the garden.

## Testing locally first

Service workers treat `http://localhost` as secure, so a plain local server is
enough to test everything except the phone itself:

```
python -m http.server 8765
```

No Python on this machine as of writing; any static server will do.
