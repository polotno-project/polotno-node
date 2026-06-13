import { defineConfig } from 'vite';

// Workaround for a mediabunny (>= 1.45.0) bug: its CPU color/alpha merger
// sizes buffers by CODED frame dimensions while copyTo() copies the VISIBLE
// rect, so transparent videos render with grey ghosting/stripes whenever the
// decoder pads the frame (e.g. VP9 1080 -> 1152). The transform below makes
// the merger use visible dimensions.
// Remove once fixed upstream (verify with the transparent-video test).
const patchMediabunnyAlphaMerger = () => ({
  name: 'patch-mediabunny-alpha-merger',
  transform(code, id) {
    if (!id.includes('mediabunny') || !code.includes('colorAlphaMergerWorkerCode')) {
      return null;
    }
    const patched = code
      .replaceAll(
        'const width = color.codedWidth;',
        'const width = (color.visibleRect ? color.visibleRect.width : color.codedWidth);',
      )
      .replaceAll(
        'const height = color.codedHeight;',
        'const height = (color.visibleRect ? color.visibleRect.height : color.codedHeight);',
      );
    if (patched === code) {
      console.warn(
        '[patch-mediabunny] CPU alpha merger pattern not found — mediabunny may have fixed it upstream; verify transparent video export and remove this plugin',
      );
      return null;
    }
    console.log('[patch-mediabunny] applied CPU alpha merger visible-rect fix');
    return { code: patched, map: null };
  },
});

export default defineConfig({
  plugins: [patchMediabunnyAlphaMerger()],
});
