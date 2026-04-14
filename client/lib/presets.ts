export type CropShape = "rect" | "round";

export type SafeZone = {
  width: number;
  height: number;
  label: string;
};

export type CropPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  shape?: CropShape;
  safeZone?: SafeZone;
};

export type PlatformPresetGroup = {
  id: string;
  label: string;
  presets: CropPreset[];
};

const BASIC_ASPECT_RATIO_PRESETS: CropPreset[] = [
  { id: "ratio-1-1", label: "1:1 (Square)", width: 1080, height: 1080 },
  {
    id: "ratio-4-3",
    label: "4:3 (Standard Landscape)",
    width: 1600,
    height: 1200,
  },
  {
    id: "ratio-3-2",
    label: "3:2 (Classic Landscape)",
    width: 1800,
    height: 1200,
  },
  {
    id: "ratio-5-4",
    label: "5:4 (Large Format)",
    width: 1500,
    height: 1200,
  },
  {
    id: "ratio-16-9",
    label: "16:9 (Widescreen)",
    width: 1920,
    height: 1080,
  },
  {
    id: "ratio-16-10",
    label: "16:10 (Desktop)",
    width: 1920,
    height: 1200,
  },
  {
    id: "ratio-21-9",
    label: "21:9 (Ultrawide)",
    width: 2520,
    height: 1080,
  },
  { id: "ratio-2-1", label: "2:1 (Panorama)", width: 2000, height: 1000 },
  {
    id: "ratio-3-4",
    label: "3:4 (Standard Portrait)",
    width: 1200,
    height: 1600,
  },
  {
    id: "ratio-2-3",
    label: "2:3 (Classic Portrait)",
    width: 1200,
    height: 1800,
  },
  {
    id: "ratio-4-5",
    label: "4:5 (Social Portrait)",
    width: 1080,
    height: 1350,
  },
  {
    id: "ratio-9-16",
    label: "9:16 (Vertical)",
    width: 1080,
    height: 1920,
  },
];

export const PLATFORM_PRESET_GROUPS: PlatformPresetGroup[] = [
  {
    id: "ratios",
    label: "Aspect Ratios",
    presets: BASIC_ASPECT_RATIO_PRESETS,
  },
  {
    id: "youtube",
    label: "YouTube",
    presets: [
      {
        id: "youtube-banner",
        label: "Channel Banner",
        width: 2560,
        height: 1440,
        safeZone: {
          width: 1546,
          height: 423,
          label: "Visible safe zone",
        },
      },
      { id: "youtube-thumbnail", label: "Thumbnail", width: 1280, height: 720 },
      {
        id: "youtube-profile",
        label: "Profile Picture",
        width: 800,
        height: 800,
        shape: "round",
      },
    ],
  },
  {
    id: "instagram",
    label: "Instagram",
    presets: [
      {
        id: "instagram-profile",
        label: "Profile Picture",
        width: 320,
        height: 320,
        shape: "round",
      },
      {
        id: "instagram-square",
        label: "Square Post",
        width: 1080,
        height: 1080,
      },
      {
        id: "instagram-portrait",
        label: "Portrait Post",
        width: 1080,
        height: 1350,
      },
      {
        id: "instagram-story",
        label: "Story / Reel",
        width: 1080,
        height: 1920,
      },
    ],
  },
  {
    id: "x",
    label: "X (Twitter)",
    presets: [
      { id: "x-header", label: "Header", width: 1500, height: 500 },
      {
        id: "x-profile",
        label: "Profile Picture",
        width: 400,
        height: 400,
        shape: "round",
      },
      { id: "x-post", label: "In-Stream Post", width: 1200, height: 675 },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    presets: [
      {
        id: "linkedin-personal-cover",
        label: "Personal Cover",
        width: 1584,
        height: 396,
      },
      {
        id: "linkedin-company-cover",
        label: "Company Cover",
        width: 1128,
        height: 191,
      },
      {
        id: "linkedin-profile",
        label: "Profile Picture",
        width: 400,
        height: 400,
        shape: "round",
      },
    ],
  },
  {
    id: "facebook",
    label: "Facebook",
    presets: [
      {
        id: "facebook-profile",
        label: "Profile Picture",
        width: 320,
        height: 320,
        shape: "round",
      },
      {
        id: "facebook-cover",
        label: "Profile / Page Cover",
        width: 851,
        height: 315,
        safeZone: {
          width: 640,
          height: 315,
          label: "Core mobile-safe area",
        },
      },
      {
        id: "facebook-post-landscape",
        label: "Feed Post (Landscape)",
        width: 1200,
        height: 630,
      },
      {
        id: "facebook-post-square",
        label: "Feed Post (Square)",
        width: 1080,
        height: 1080,
      },
      {
        id: "facebook-post-vertical",
        label: "Feed Post (Vertical)",
        width: 1080,
        height: 1350,
      },
      {
        id: "facebook-story",
        label: "Story / Reel",
        width: 1080,
        height: 1920,
      },
    ],
  },
  {
    id: "tiktok",
    label: "TikTok",
    presets: [
      {
        id: "tiktok-profile",
        label: "Profile Picture",
        width: 720,
        height: 720,
        shape: "round",
      },
      { id: "tiktok-cover", label: "Video Cover", width: 1080, height: 1920 },
    ],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    presets: [
      {
        id: "pinterest-profile",
        label: "Profile Picture",
        width: 280,
        height: 280,
        shape: "round",
      },
      {
        id: "pinterest-cover",
        label: "Profile Cover",
        width: 800,
        height: 450,
      },
      { id: "pinterest-pin", label: "Standard Pin", width: 1000, height: 1500 },
      {
        id: "pinterest-square",
        label: "Square Pin",
        width: 1000,
        height: 1000,
      },
      {
        id: "pinterest-idea",
        label: "Idea / Video Pin",
        width: 1080,
        height: 1920,
      },
    ],
  },
  {
    id: "snapchat",
    label: "Snapchat",
    presets: [
      {
        id: "snapchat-profile",
        label: "Profile Picture",
        width: 320,
        height: 320,
        shape: "round",
      },
      {
        id: "snapchat-story",
        label: "Story / Spotlight",
        width: 1080,
        height: 1920,
      },
      { id: "snapchat-banner", label: "Banner", width: 375, height: 278 },
    ],
  },
  {
    id: "threads",
    label: "Threads",
    presets: [
      {
        id: "threads-profile",
        label: "Profile Picture",
        width: 640,
        height: 640,
        shape: "round",
      },
      {
        id: "threads-post-square",
        label: "Post (Square)",
        width: 1080,
        height: 1080,
      },
      {
        id: "threads-post-vertical",
        label: "Post (Vertical)",
        width: 1440,
        height: 1920,
      },
      {
        id: "threads-link-preview",
        label: "Link Preview",
        width: 1200,
        height: 600,
      },
    ],
  },
  {
    id: "reddit",
    label: "Reddit",
    presets: [
      {
        id: "reddit-avatar",
        label: "User Avatar",
        width: 256,
        height: 256,
        shape: "round",
      },
      {
        id: "reddit-user-banner",
        label: "User Banner",
        width: 1000,
        height: 300,
      },
      {
        id: "reddit-community-banner",
        label: "Community Banner",
        width: 1920,
        height: 384,
      },
      {
        id: "reddit-post-landscape",
        label: "Post (Landscape)",
        width: 1200,
        height: 628,
      },
      {
        id: "reddit-post-square",
        label: "Post (Square)",
        width: 1080,
        height: 1080,
      },
    ],
  },
  {
    id: "web",
    label: "General Web",
    presets: [
      { id: "web-og", label: "Open Graph", width: 1200, height: 630 },
      { id: "web-hero", label: "Hero Banner", width: 1920, height: 1080 },
      { id: "web-card", label: "Article Card", width: 1200, height: 800 },
    ],
  },
];

export const DEFAULT_PLATFORM_ID = "ratios";
export const DEFAULT_PRESET_ID = BASIC_ASPECT_RATIO_PRESETS[0].id;

const flatPresetMap = new Map(
  PLATFORM_PRESET_GROUPS.flatMap((group) =>
    group.presets.map((preset) => [preset.id, preset] as const),
  ),
);

export function getPresetById(presetId: string): CropPreset | undefined {
  return flatPresetMap.get(presetId);
}

export function getGroupById(groupId: string): PlatformPresetGroup | undefined {
  return PLATFORM_PRESET_GROUPS.find((group) => group.id === groupId);
}
