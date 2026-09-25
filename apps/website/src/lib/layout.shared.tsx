import { uiTranslations } from 'fumadocs-ui/i18n'
import { docsI18n } from './docs-i18n'
import { localePath } from './i18n'
import { appName, docsRoute, gitConfig } from './shared'
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'

export const translations = docsI18n
  .translations()
  .extend(uiTranslations())
  .add({
    en: { displayName: 'English' },
    zh: {
      'displayName': '简体中文',
      'Search(search dialog)': '搜索文档',
      'Search(search trigger)': '搜索',
      'No results found(search dialog)': '没有找到相关内容',
      'On this page(table of contents)': '本页目录',
      'Table of Contents(inline table of contents)': '目录',
      'Edit on GitHub(edit page)': '在 GitHub 上编辑',
      'Last updated on(page footer)': '最后更新于',
      'Previous Page(pagination)': '上一页',
      'Next Page(pagination)': '下一页',
      'Page Not Found(404 not found page)': '页面不存在',
      'Back to Home(404 not found page)': '返回首页',
      'Choose a language(language switcher)': '选择语言',
    },
  })

// Nav labels are not page content, so they stay here next to the other UI
// strings rather than going through the message catalogue.
const NAV_LABELS: Record<string, { docs: string }> = {
  en: { docs: 'Documentation' },
  zh: { docs: '文档' },
}

export function baseOptions(locale: string): BaseLayoutProps {
  const labels = NAV_LABELS[locale] ?? NAV_LABELS.en!

  return {
    nav: { title: appName, url: localePath('/', locale) },
    links: [
      {
        text: labels.docs,
        url: localePath(docsRoute, locale),
        active: 'nested-url',
      },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    // No search index is built for the static export yet; a dead trigger is
    // worse than no trigger.
    searchToggle: { enabled: false },
  }
}
