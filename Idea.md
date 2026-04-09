This is a fantastic project idea. Building a purely client-side image utility is not only excellent for user privacy (no server storage required), but it's also highly performant and costs you almost nothing to host.

To pull this off effectively, you need a stack that handles UI beautifully, manages complex state (image coordinates, zoom levels, aspect ratios), and manipulates the HTML Canvas API for high-resolution exports.

Here is the comprehensive architectural blueprint and implementation strategy for your social media image cropper.

---

### 1. The Tech Stack

- **Framework:** Next.js (App Router) - Excellent for routing and SEO (if you want people to find your tool).
- **Styling & Theme:** Tailwind CSS + **Shadcn UI**. Shadcn is perfect here; it gives you beautiful, accessible components (sliders, dropdowns, buttons) and native dark/light mode support without heavy bundle sizes.
- **State Management:** **Zustand**. You will have a lot of moving parts (uploaded image, crop coordinates, selected platform, zoom level). Zustand is much lighter than Redux and easier to set up.
- **Core Cropping Engine:** **`react-easy-crop`**. This is the industry standard for React. It handles the touch/mouse interactions for panning, zooming, and outputting pixel-perfect crop percentages.
- **Image Processing:** Native HTML5 `<canvas>` API. Since you want in-browser processing, we will draw the cropped area to an invisible canvas and export it.
- **Icons:** `lucide-react`.

---

### 2. The Comprehensive Platform Blueprint

You need a robust configuration file to drive your UI. Here is the extensive list of scenarios and dimensions you should support:

**YouTube**

- **Banner:** 2560 x 1440px _(Crucial Edge Case: You must overlay a "Safe Zone" guide of 1546 x 423px in the center, as this is the only part visible on mobile/desktop)._
- **Profile Picture:** 800 x 800px _(Needs a circular preview mask)._
- **Thumbnail:** 1280 x 720px.

**Twitter / X**

- **Header:** 1500 x 500px.
- **Profile:** 400 x 400px _(Circular mask)._
- **In-Stream Post:** 1200 x 675px.

**Instagram**

- **Profile:** 320 x 320px _(Circular mask)._
- **Square Post:** 1080 x 1080px.
- **Portrait Post:** 1080 x 1350px.
- **Story / Reel:** 1080 x 1920px.

**LinkedIn**

- **Personal Cover:** 1584 x 396px.
- **Company Cover:** 1128 x 191px.
- **Profile:** 400 x 400px.

**General Web**

- **Open Graph (OG) Image:** 1200 x 630px.

---

### 3. Application Architecture

#### A. Global State (Zustand)

Your state needs to track the image and the tool's current settings.

```javascript
import { create } from "zustand";

export const useCropStore = create((set) => ({
  imageSrc: null, // The base64 or object URL of the uploaded image
  setImageSrc: (src) => set({ imageSrc: src }),

  // Crop settings
  crop: { x: 0, y: 0 },
  setCrop: (crop) => set({ crop }),
  zoom: 1,
  setZoom: (zoom) => set({ zoom }),
  rotation: 0,
  setRotation: (rotation) => set({ rotation }),

  // Platform selection
  selectedPlatform: "youtube",
  selectedPreset: "banner", // e.g., 2560x1440
  aspectRatio: 16 / 9,
  setPreset: (platform, preset, aspect) =>
    set({
      selectedPlatform: platform,
      selectedPreset: preset,
      aspectRatio: aspect,
    }),

  // Final output data
  croppedAreaPixels: null,
  setCroppedAreaPixels: (pixels) => set({ croppedAreaPixels: pixels }),
}));
```

#### B. The UI Layout

1.  **Sidebar/Top Bar:** Platform selection (Dropdowns or Tabs for YouTube, Twitter, etc.).
2.  **Main Stage:** The `react-easy-crop` component. If the user selects a circular profile picture, pass `cropShape="round"` to the component.
3.  **Control Panel:** Sliders for Zoom (1x to 3x) and Rotation (0 to 360 degrees).
4.  **Preview Pane (Optional but highly recommended):** A smaller window showing the final cropped result in real-time.

#### C. The Heavy Lifting: High-Quality Canvas Extraction

This is where most purely client-side apps fail. They export the image at the _screen's_ resolution, resulting in pixelated banners. You must export at the _target template's_ resolution.

When the user clicks "Download", you run this logic:

1.  Create an off-screen `Image` object from the user's uploaded file.
2.  Create an off-screen `<canvas>`.
3.  Set the canvas `width` and `height` to the **exact dimensions of the chosen platform** (e.g., 2560 and 1440 for a YT banner), _not_ the size of the crop box on the screen.
4.  Use `ctx.drawImage()` to map the `croppedAreaPixels` from `react-easy-crop` to your high-res canvas.
5.  Export using `canvas.toBlob()` or `canvas.toDataURL()`.

```javascript
// High-level conceptual function for the download button
export default async function getCroppedImg(
  imageSrc,
  pixelCrop,
  targetWidth,
  targetHeight,
  format = "image/jpeg",
) {
  const image = await createImage(imageSrc); // Helper to load image
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Set canvas size to the exact high-res target dimensions
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  // Draw the cropped area to fill the high-res canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0, // draw at x=0 on canvas
    0, // draw at y=0 on canvas
    targetWidth,
    targetHeight,
  );

  // Return the blob for downloading
  return new Promise((resolve) => {
    canvas.toBlob(
      (file) => {
        resolve(URL.createObjectURL(file));
      },
      format,
      1.0,
    ); // 1.0 = maximum quality
  });
}
```

---

### 4. Edge Cases & Polish to Consider

- **File Size Limits:** Browser memory can crash if a user uploads a 50MB RAW image. You should implement a lightweight check to reject or downscale images over ~15-20MB before feeding them to the canvas.
- **The "Safe Zone" Overlay:** For YouTube Banners, you'll need to create an absolutely positioned `div` with a dashed border that sits _on top_ of the cropper, showing the user exactly what will be visible on mobile devices.
- **Transparency:** If the user selects "PNG" output, and they rotate the image, the empty corners should remain transparent. Ensure you don't fill the canvas context with a white background by default if a PNG is requested.

This is a very clean architecture that will scale well as you add more platforms.

To help us narrow down the first steps, would you like to focus on designing the Shadcn UI layout first, or dive deeper into the exact Canvas API math needed to ensure the downloads are perfectly crisp?

**Here’s a comprehensive list of additional famous platforms** (and their most up-to-date 2026 image dimensions) that aren’t in your current blueprint. I pulled these from the latest official/reliable guides (Hootsuite April 2026, Buffer 2025/26, platform docs, and cross-verified sources) to keep everything current.

I focused only on **major, widely-used platforms** where creators frequently need image cropping (social profiles, covers, posts, stories, etc.). I skipped minor or niche ones (Bluesky, Mastodon, etc.) unless they’re exploding in popularity.

### Facebook (Meta)

- **Profile Picture**: 320 × 320 px (circular mask; displays at ~176–196 px)
- **Cover Photo** (Profiles & Pages): 851 × 315 px (recommended; displays 820 × 312 px desktop / 640 × 360 px mobile; safe zone in the center to avoid profile pic overlap)
- **Group Cover**: 1640 × 856 px
- **Event Cover**: 1920 × 1005 px
- **Feed Post**:
  - Landscape: 1200 × 630 px (or 1080 × 566 px)
  - Square: 1080 × 1080 px
  - Vertical (best reach): 1080 × 1350 px
- **Stories / Reels**: 1080 × 1920 px (9:16)

**Note**: Link previews often fall back to the OG size you already have (1200 × 630 px).

### TikTok

- **Profile Picture**: 200 × 200 px (circular; upload 720 × 720 px for crisp quality)
- **Video / Story / Spotlight / Cover Thumbnail**: 1080 × 1920 px (9:16 vertical — this is the dominant format)

**Note**: TikTok is video-first, but creators still crop static images for profile + video covers.

### Pinterest

- **Profile Picture**: 165 × 165 px (circular; some guides recommend uploading 280 × 280 px for future-proofing)
- **Profile Cover / Banner**: 800 × 450 px minimum (16:9 horizontal)
- **Standard Pin (recommended)**: 1000 × 1500 px (2:3 vertical — performs best)
- **Square Pin**: 1000 × 1000 px (1:1)
- **Idea/Video Pin**: 1080 × 1920 px (9:16) or 1000 × 1500 px

**Safe zone note**: Keep key elements within top ~270 px and avoid the outer 65 px left / 195 px right for best visibility.

### Snapchat

- **Profile Picture**: 320 × 320 px (circular)
- **Snap / Story / Spotlight**: 1080 × 1920 px (9:16 vertical)
- **Banner (less common)**: 375 × 278 px

**Note**: Everything is mobile-first and full-screen vertical.

### Threads (Meta)

- **Profile Picture**: 320 × 320 px (or up to 640 × 640 px; circular)
- **Post Image**: Any ratio works, but recommended 1440 × 1920 px (vertical) or 1080 × 1080 px for best feed display
- **Link Preview**: 1200 × 600 px

### Reddit

- **User Avatar / Profile Picture**: 256 × 256 px (circular)
- **User Banner**: 1000 × 300 px
- **Subreddit / Community Banner (Header)**: 1920 × 384 px (common recommendation; some older communities use 2560 × 1440 px — test for your use case)
- **Post Images**: Flexible (most common: 1200 × 628 px landscape or 1080 × 1080 px square)

These are the biggest gaps in your current list. Adding them will cover ~95 % of what most creators actually need beyond what you already have.

### Quick Recommendations for Your App

1. **Add these to your Zustand config** (just extend the `setPreset` options):
   - `facebook-profile`, `facebook-cover`, `facebook-post-landscape`, etc.
   - `tiktok-profile`, `tiktok-video`
   - `pinterest-pin`, `pinterest-profile`
   - `snapchat-story`, etc.

2. **Circular masks** for all profile pictures (you already do this with `cropShape="round"` in react-easy-crop — just map the platform type).

3. **Safe zones** you might want to overlay (like your YouTube banner safe zone):
   - Facebook cover: center safe area (profile pic overlaps left side on mobile/desktop)
   - Pinterest pins: top 270 px safe zone
