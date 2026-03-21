import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const legacyDir = path.join(rootDir, 'tmp', '_posts');
const outputDir = path.join(rootDir, 'src', 'data', 'post');

const ensureLf = (text) => text.replace(/\r\n/g, '\n');
const stripFrontmatter = (text) => ensureLf(text).replace(/^---\n[\s\S]*?\n---\n?/, '');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const removeHeading = (body, heading) =>
  body.replace(new RegExp(`(^|\\n)##\\s+${escapeRegExp(heading)}\\s*\\n+`), '$1');

const cleanupLegacyBody = (text) => {
  let body = stripFrontmatter(text);

  body = body.replace(/https?:\/\/artrointel\.github\.io\/assets\//g, '/assets/');
  body = body.replace(/https?:\/\/artrointel\.github\.io\/(?!assets\/)([A-Za-z0-9\-_/]+)/g, '/$1');
  body = body.replace(/\{:target="_blank"\}/g, '');
  body = body.replace(/\{:\s*\.center-image\s*\}/g, '');
  body = body.replace(/[ \t]*<br\s*\/?>[ \t]*/g, '\n');
  body = body.replace(/\n-{20,}\n/g, '\n\n---\n\n');
  body = body.replace(/[ \t]+\n/g, '\n');
  body = body.replace(/^\s+$/gm, '');
  body = body.replace(/\n{3,}/g, '\n\n');
  body = body.replace(/^---\n+/, '');

  return body.trim() + '\n';
};

const yamlString = (value) => JSON.stringify(value);

const renderFrontmatter = (post) => {
  const lines = ['---'];
  lines.push(`publishDate: ${post.publishDate}`);
  lines.push(`title: ${yamlString(post.title)}`);

  if (post.excerpt) lines.push(`excerpt: ${yamlString(post.excerpt)}`);
  if (post.author) lines.push(`author: ${yamlString(post.author)}`);
  if (post.category) lines.push(`category: ${yamlString(post.category)}`);

  if (post.tags?.length) {
    lines.push('tags:');
    for (const tag of post.tags) {
      lines.push(`  - ${yamlString(tag)}`);
    }
  }

  if (post.language) lines.push(`language: ${post.language}`);
  lines.push('---', '');
  return lines.join('\n');
};

const writePost = (filename, post) => {
  const content = `${renderFrontmatter(post)}${post.content.trim()}\n`;
  fs.writeFileSync(path.join(outputDir, filename), content, 'utf8');
  console.log(`wrote ${filename}`);
};

const readLegacy = (filename) => fs.readFileSync(path.join(legacyDir, filename), 'utf8');

const autoPosts = [
  {
    output: 'neural-network.md',
    source: '2017-08-05-neural-network.markdown',
    publishDate: '2017-09-12T13:32:20+03:00',
    title: '수학으로 이해하는 Neural Network',
    excerpt: '수학적 직관과 기본 식을 중심으로 신경망의 핵심 개념을 정리합니다.',
    author: 'Woohyun Kim',
    category: 'AI',
    tags: ['mnist', 'neural-network', 'nn', 'cnn'],
    language: 'ko',
    stripHeading: 'Neural Network based on Mathematics',
  },
  {
    output: 'mali-gpu-1.md',
    source: '2018-07-10-mali-gpu-1.markdown',
    publishDate: '2018-07-10T13:32:20+03:00',
    title: 'Mali GPU 추상 머신 1부 - 프레임 파이프라이닝',
    excerpt: 'Mali GPU의 CPU-GPU 렌더링 파이프라인을 한국어로 정리한 번역 및 해설입니다.',
    author: 'Woohyun Kim',
    category: 'Graphics',
    tags: ['mali', 'gpu', 'rendering', 'engine'],
    language: 'ko',
    stripHeading: 'Mali GPU: An Abstract Machine, Part 1 - Frame Pipelining',
    replacements: [
      ['### Contents', '### 목차'],
      ['### Summery', '### 요약'],
    ],
  },
  {
    output: 'mali-gpu-2.md',
    source: '2018-07-12-mali-gpu-2.markdown',
    publishDate: '2018-07-12T13:32:20+03:00',
    title: 'Mali GPU 추상 머신 2부 - 타일 기반 렌더링',
    excerpt: '타일 기반 렌더링 관점에서 Mali GPU의 동작과 메모리 효율을 설명합니다.',
    author: 'Woohyun Kim',
    category: 'Graphics',
    tags: ['mali', 'gpu', 'rendering', 'engine'],
    language: 'ko',
    stripHeading: 'The Mali GPU: An Abstract Machine, Part 2 - Tile-based Rendering',
    replacements: [['### Contents', '### 목차']],
  },
  {
    output: 'mali-gpu-3.md',
    source: '2018-07-13-mali-gpu-3.markdown',
    publishDate: '2018-07-13T13:32:20+03:00',
    title: 'Mali GPU 추상 머신 3부 - Midgard 셰이더 코어',
    excerpt: 'Midgard 계열 Mali GPU의 프로그래머블 셰이더 코어 구조를 한국어로 정리합니다.',
    author: 'Woohyun Kim',
    category: 'Graphics',
    tags: ['mali', 'gpu', 'rendering', 'engine'],
    language: 'ko',
    stripHeading: 'The Mali GPU: An Abstract Machine, Part 3 - The Midgard Shader Core',
    replacements: [['### Contents', '### 목차']],
  },
];

for (const post of autoPosts) {
  let body = cleanupLegacyBody(readLegacy(post.source));

  if (post.stripHeading) {
    body = removeHeading(body, post.stripHeading);
  }

  if (post.replacements) {
    for (const [from, to] of post.replacements) {
      body = body.replace(from, to);
    }
  }

  body = body.replace(/^---\n+/, '');

  writePost(post.output, {
    publishDate: post.publishDate,
    title: post.title,
    excerpt: post.excerpt,
    author: post.author,
    category: post.category,
    tags: post.tags,
    language: post.language,
    content: body,
  });
}
