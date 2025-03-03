import { CrawlUrlRule } from './type';

export const crawUrlRules: CrawlUrlRule[] = [
  // github 源码解析
  {
    filterOptions: {
      enableReadability: false,
    },
    urlPattern: 'https://github.com/([^/]+)/([^/]+)/blob/([^/]+)/(.*)',
    urlTransform: 'https://github.com/$1/$2/raw/refs/heads/$3/$4',
  },
  {
    filterOptions: {
      enableReadability: false,
    },
    // GitHub discussion
    urlPattern: 'https://github.com/(.*)/discussions/(.*)',
  },

  // 所有 PDF 都用 jina
  {
    impls: ['jina'],
    urlPattern: 'https://(.*).pdf',
  },
  // arxiv PDF use jina
  {
    impls: ['jina'],
    urlPattern: 'https://arxiv.org/pdf/(.*)',
  },
  // 知乎有爬虫防护，使用 jina
  {
    impls: ['jina'],
    urlPattern: 'https://zhuanlan.zhihu.com(.*)',
  },
  {
    // Medium 文章转换为 Scribe.rip
    urlPattern: 'https://medium.com/(.*)',
    urlTransform: 'https://scribe.rip/$1',
  },

  // 体育数据网站规则
  {
    filterOptions: {
      // 对体育数据表格禁用 Readability 并且转换为纯文本
      enableReadability: false,
      pureText: true,
    },
    urlPattern: 'https://www.qiumiwu.com/standings/(.*)',
  },
];
