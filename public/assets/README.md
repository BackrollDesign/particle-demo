# PNG assets for star glares in cards

To use your own PNG images instead of CSS-drawn stars, place files here and reference them in the markup:

- **glare-cross.png** — cross (Resources and Section 3 cards)
- **glare-x.png** — diagonal cross (Rare Policy card)

In `index.html`, inside `.alcyone-card-glare`, add a tag, for example:

```html
<img src="/assets/glare-cross.png" alt="" />
```

Then the built-in star drawing is hidden and the image is used instead.
