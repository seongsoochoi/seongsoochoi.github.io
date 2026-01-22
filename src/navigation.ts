import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'About',
      href: getPermalink('/about'),
    },
    {
      text: 'Resume',
      href: getPermalink('/resume'),
    },
    {
      text: 'Portfolio',
      href: getPermalink('/portfolio'),
    },
    {
      text: 'Blog',
      href: getBlogPermalink(),
    },
    {
      text: 'Contact',
      href: getPermalink('/contact'),
    },
  ],
  actions: [], // Removed Download CV button
};

export const footerData = {
  links: [
    {
      title: 'Sitemap',
      links: [
        { text: 'About', href: getPermalink('/about') },
        { text: 'Resume', href: getPermalink('/resume') },
        { text: 'Portfolio', href: getPermalink('/portfolio') },
        { text: 'Blog', href: getBlogPermalink() },
        { text: 'Contact', href: getPermalink('/contact') },
      ],
    },
    {
      title: 'Connect',
      links: [
        { text: 'GitHub', href: 'https://github.com/artrointel' },
        { text: 'Email', href: 'mailto:artrointel@gmail.com' },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'Github', icon: 'tabler:brand-github', href: 'https://github.com/artrointel' },
    { ariaLabel: 'Email', icon: 'tabler:mail', href: 'mailto:artrointel@gmail.com' },
  ],
  footNote: `
    Made by <a class="text-blue-600 underline dark:text-muted" href="https://github.com/artrointel"> Artrointel</a> · All rights reserved.
  `,
};