# Pixel Trick

**See how a screen can use tiny red, green, and blue light components to draw the edge of a letter.** Pixel Trick is an interactive browser simulation of RGB subpixel text rendering.

[Open the live experiment](https://etiserm.github.io/pixel-trick/)

## Try the experiment

1. Select **Try the experiment** and enter a word, or keep the example. The offset controls are disabled while the field is empty.
2. Compare the same letter edge in the two magnified views. Select a pixel in the microscope to see the R, G, and B values and the grayscale average calculated from them.
3. Select **Set offset to +0.33 px**. This sets the offset to about one subpixel width from zero. The outlined model pixel and its coordinates stay in place, so you can compare the values before and after the move.
4. Use the shift button next to the microscope to compare the two positions. Tap a cell or use the arrow keys with the grid focused to explore. **Find an edge** recentres both the microscope and the magnified previews.
5. Open **Display settings** to swap the subpixel order from RGB to BGR or to show grayscale in both previews.

Each microscope cell represents one model pixel. Its three vertical bars represent its subpixels. Brighter bars mean that more of the letter covers that strip.

## What the simulation calculates

The browser's Canvas 2D API draws the text into an alpha mask for a fixed 480 × 128 model grid. The mask is 12 times wider and 4 times taller than the grid. Each model pixel has three vertical strips. The renderer averages a 4 × 4 block of mask samples for each strip to estimate its coverage. Long words shrink to fit the model grid, which stays the same size at every screen width.

For each strip, using 8-bit mask alpha values:

```text
coverage = sum of 16 alpha values / (16 × 255)
```

Pixel Trick maps the three coverage values to red, green, and blue in the selected order. The subpixel preview writes those values as three separate channel intensities. The grayscale preview averages them and writes the same intensity to all three channels. Both previews, the microscope, and the channel breakdown use the same computed map. Moving the selection or changing the preview mode uses the existing map.

The Canvas API supplies the letter shape. Pixel Trick implements the sampling, channel mapping, grayscale comparison, and RGB output in the browser. The calculation uses no network service or API key.

## Scope and limitations

This is an educational model of text coverage on a display with horizontally arranged RGB or BGR subpixels. It is not a complete implementation of ClearType or a replacement for the operating system's text renderer. The simulation does not measure the physical layout of your screen, model every display type, or add physical pixels. Real displays and rendering systems can use different subpixel layouts and additional filtering, so their results may differ from this experiment.

## Built with

- React for the interface
- Canvas 2D API for drawing the glyph mask and displaying computed pixels
- Vite for development and production builds

## Run locally

Use Node.js 22.13 or newer within the Node.js 22 release line, and npm. Clone your repository or extract the source ZIP, then run these commands from the project folder:

```bash
npm ci
npm run dev
```

To check the source, build the site, and serve that build locally:

```bash
npm run lint
npm run build
npm run preview
```

## Publish on GitHub Pages

Publish this project in a public GitHub repository named `pixel-trick`. In **Settings → Pages**, set the source to **GitHub Actions**. In **Actions**, run **Deploy PIXEL TRICK** if it has not started. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes the site. The default address is `https://YOUR-GITHUB-LOGIN.github.io/pixel-trick/`.

## Hackathon

Pixel Trick was built for the **Global Virtual Hackathon 2026**, under the theme **Unveiling Technology**.

## License

The original Pixel Trick source code is available under the [MIT License](LICENSE).
