import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { LEARN_ARTICLE_BY_SLUG, LEARN_ARTICLES } from './articles.js'

const BLOCK_TYPES = new Set(['p', 'h2', 'list', 'compare', 'callout', 'askDoctor', 'tracked'])
const REQUIRED_LAUNCH_ARTICLES = [
  'period-101', 'your-cycle', 'whats-normal', 'painful-periods', 'heavy-periods',
  'irregular-missing-periods', 'acne-hair-hormones', 'pms-pmdd', 'pmos',
  'endometriosis', 'cycle-and-sport', 'food-and-your-cycle', 'talking-to-your-doctor',
]

test('every Learn article has valid structure, sources, and review metadata', () => {
  for (const article of LEARN_ARTICLES) {
    assert.match(article.slug, /^[a-z0-9-]+$/)
    assert.ok(article.title)
    assert.ok(article.summary)
    assert.ok(article.blocks.length > 0)
    assert.ok(article.blocks.every((block) => BLOCK_TYPES.has(block.type)))
    assert.ok(article.sources.length >= 2, `${article.slug} needs at least two sources`)
    assert.ok(article.sources.every((source) => source.org && source.title && source.url.startsWith('https://') && source.accessed))
    assert.ok(article.reviewedBy)
    assert.match(article.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.match(article.nextReviewAt, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(article.version)
    assert.ok(!JSON.stringify(article).includes('—'), `${article.slug} contains an em dash`)
    assert.ok(article.related.every((slug) => LEARN_ARTICLE_BY_SLUG[slug]), `${article.slug} has a missing related article`)
  }
})

test('all P2 launch articles are enabled', () => {
  for (const slug of REQUIRED_LAUNCH_ARTICLES) {
    assert.equal(LEARN_ARTICLE_BY_SLUG[slug]?.launch, true, `${slug} is not launch-ready in the content model`)
  }
})

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(fullPath)
    return /\.(js|jsx)$/.test(entry.name) ? [fullPath] : []
  })
}

function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

test('diagnostic and clinical condition labels stay inside Learn UI copy', () => {
  const srcRoot = path.resolve(process.cwd(), 'src')
  const excluded = [path.join('content', 'learn'), path.join('screens', 'Learn.jsx')]
  const restricted = /\b(PMOS|PCOS|endometriosis|PMDD|adenomyosis|von Willebrand|bleeding disorder|dysmenorrhea|amenorrhea|heavy menstrual bleeding)\b/i

  for (const file of sourceFiles(srcRoot)) {
    const relative = path.relative(srcRoot, file)
    if (excluded.some((entry) => relative.startsWith(entry))) continue
    assert.doesNotMatch(withoutComments(fs.readFileSync(file, 'utf8')), restricted, `restricted health label found in ${relative}`)
  }
})
