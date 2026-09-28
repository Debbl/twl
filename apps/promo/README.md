# @apps/promo

A 15-second promo for twl, and the brand assets it shares with the docs site.
Written in TypeScript with three.js; every frame is a pure function of time,
with a soundtrack synthesised from the same score.

```sh
pnpm dev                                   # preview at http://localhost:5199
pnpm render --samples auto --shutter 0.2   # out/twl-promo.mp4
pnpm brand                                 # logo, favicon, OG card
```

- [docs/TREATMENT.md](docs/TREATMENT.md): the idea, the edit, the style.
- [docs/ENGINE.md](docs/ENGINE.md): how it renders, and the commands.

Rendering drives the installed Google Chrome. The fonts (Archivo, IBM Plex
Mono) are SIL OFL; their licenses are in `public/fonts/`.
