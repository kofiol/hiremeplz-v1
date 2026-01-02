export const siteConfig = {
  name: "hireMePlz",
  getStartedUrl:
    process.env.NEXT_PUBLIC_HIREMEPLZ_SITE_MODE === "full" ? "/login" : "#waitlist",
  links: {
    github: "https://github.com",
  },
};
