export const SITE = {
  name: "Virguê",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://virgue.work").replace(/\/$/, ""),
  role: "UI Designer • Developer",
  email: "reeceleneveubusiness@gmail.com",
  /** Shown in the hero and the contact section. Set `open` to false when fully booked. */
  availability: { open: true, label: "Open for new projects" },
  profileImage: "/ayanakoji-profile-320.webp",
  heroImage: "/hero/umbrella-3840.webp",
  workImage: "/hero/gun-2560.webp",
  socials: {
    discord: "https://discord.com/users/872621837572538408",
    x: "https://x.com/Yeodene_",
  },
} as const;


