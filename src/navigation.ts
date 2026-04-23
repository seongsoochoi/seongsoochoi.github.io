import { getPermalink } from './utils/permalinks';

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
      text: 'Contact',
      href: getPermalink('/contact'),
    },
  ],
  actions: [],
};

export const footerData = {
  links: [
    {
      title: 'Sitemap',
      links: [
        { text: 'Home', href: getPermalink('/') },
        { text: 'About', href: getPermalink('/about') },
        { text: 'Resume', href: getPermalink('/resume') },
        { text: 'Contact', href: getPermalink('/contact') },
      ],
    },
    {
      title: 'Connect',
      links: [
        { text: 'Email', href: 'mailto:choi@metaintelligence.co.kr' },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [],
  footNote: `
    Copyright ${new Date().getFullYear()} <a class="text-blue-600 underline dark:text-muted" href="mailto:choi@metaintelligence.co.kr">Seongsoo Choi</a>. All rights reserved.
  `,
};
