import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BookmarkSimple,
  BookOpenText,
  CheckCircle,
  ChatCircleText,
  Clock,
  Heartbeat,
  ListChecks,
  Question,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react'
import { TopBar } from '../components/ui.jsx'
import MaisieLogo from '../components/MaisieLogo.jsx'
import { useStore } from '../state/store.jsx'
import { colors } from '../theme/tokens.js'
import {
  LEARN_ARTICLE_BY_SLUG,
  LEARN_ARTICLES,
  LEARN_CATEGORIES,
  LEGACY_ARTICLE_SLUGS,
  visibleLearnArticles,
} from '../content/learn/articles.js'
import { learnLogCard } from '../content/learn/logCards.js'
import { features } from '../config/features.js'

const SAVED_KEY = 'maisie.savedArticles'
const SHOW_CONTENT_REVIEW = import.meta.env.VITE_SHOW_LEARN_CONTENT_REVIEW === 'true'

function formatReviewDate(value) {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

function readSavedArticles() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')
    return [...new Set(saved.map((id) => LEGACY_ARTICLE_SLUGS[id] || id).filter(Boolean))]
  } catch {
    return []
  }
}

function useSavedArticles() {
  const [saved, setSaved] = useState(readSavedArticles)

  function toggle(slug) {
    setSaved((previous) => {
      const next = previous.includes(slug)
        ? previous.filter((item) => item !== slug)
        : [...previous, slug]
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      return next
    })
  }

  return { saved, toggle }
}

function categoryFor(id) {
  return LEARN_CATEGORIES.find((item) => item.id === id)
}

function categoryColors(categoryId) {
  const category = categoryFor(categoryId)
  return category?.tone === 'sage'
    ? { ink: colors.sage700, fill: colors.sage100 }
    : { ink: colors.plum700, fill: colors.lavender100 }
}

function ArticleIcon({ category, size = 22 }) {
  const Icon = category === 'basics'
    ? BookOpenText
    : category === 'noticing'
      ? Heartbeat
      : category === 'conditions'
        ? ShieldCheck
      : Sparkle
  return <Icon size={size} weight="duotone" />
}

function BookmarkButton({ slug, saved, onToggle }) {
  const isSaved = saved.includes(slug)
  return (
    <button
      type="button"
      onClick={() => onToggle(slug)}
      aria-label={isSaved ? 'Remove from saved articles' : 'Save article'}
      aria-pressed={isSaved}
      style={{
        width: 44,
        height: 44,
        border: 0,
        borderRadius: 12,
        background: 'transparent',
        color: isSaved ? colors.plum700 : colors.textMuted,
        display: 'grid',
        placeItems: 'center',
        flex: '0 0 auto',
      }}
    >
      <BookmarkSimple size={21} weight={isSaved ? 'fill' : 'regular'} />
    </button>
  )
}

function ArticleCard({ article, saved, onToggle, compact = false }) {
  const tone = categoryColors(article.category)
  return (
    <article style={{
      display: 'grid',
      gridTemplateColumns: compact ? '42px minmax(0, 1fr) 44px' : '48px minmax(0, 1fr) 44px',
      alignItems: 'start',
      gap: 10,
      padding: compact ? 13 : 15,
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: 14,
      boxShadow: '0 7px 20px rgba(63, 8, 36, 0.05)',
    }}>
      <div aria-hidden="true" style={{
        width: compact ? 42 : 48,
        height: compact ? 42 : 48,
        borderRadius: 12,
        background: tone.fill,
        color: tone.ink,
        display: 'grid',
        placeItems: 'center',
      }}>
        <ArticleIcon category={article.category} />
      </div>
      <Link to={`/learn/${article.slug}`} style={{ color: 'inherit', textDecoration: 'none', minWidth: 0 }}>
        <div style={{
          color: tone.ink,
          fontSize: 10.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 5,
        }}>
          {categoryFor(article.category)?.title}
        </div>
        <h3 style={{ margin: 0, fontSize: compact ? 15 : 16, lineHeight: 1.3, color: colors.plum900 }}>
          {article.title}
        </h3>
        {!compact && <p style={{ margin: '6px 0 9px', fontSize: 13, lineHeight: 1.45, color: colors.textSecondary }}>{article.summary}</p>}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: colors.textMuted }}>
          <Clock size={14} /> {article.readMinutes} min
        </span>
      </Link>
      <BookmarkButton slug={article.slug} saved={saved} onToggle={onToggle} />
    </article>
  )
}

export function LearnHome() {
  const { state } = useStore()
  const { saved, toggle } = useSavedArticles()
  const [filter, setFilter] = useState('all')
  const articles = useMemo(() => visibleLearnArticles(state), [state])
  const featured = LEARN_ARTICLE_BY_SLUG['period-101']
  const filters = [
    { id: 'all', label: 'All' },
    ...LEARN_CATEGORIES.map((item) => ({ id: item.id, label: item.title })),
    { id: 'saved', label: `Saved${saved.length ? ` (${saved.length})` : ''}` },
  ]
  const filtered = filter === 'all'
    ? articles
    : filter === 'saved'
      ? articles.filter((item) => saved.includes(item.slug))
      : articles.filter((item) => item.category === filter)

  return (
    <div className="screen screen--pad-bottom">
      <TopBar title="Learn" onBack={false} />
      <p style={{ margin: '2px 0 18px', color: colors.textSecondary, fontSize: 14, lineHeight: 1.5 }}>
        Clear health information for understanding changes and asking better questions.
      </p>

      {features.routeSummary && (
        <Link to="/route/talk" className="learn-route-entry">
          <ChatCircleText size={21} weight="duotone" />
          <span><strong>Getting ready to talk to someone?</strong><small>Turn what you learned into questions for a visit.</small></span>
          <ArrowRight size={18} />
        </Link>
      )}

      <Link to={`/learn/${featured.slug}`} style={{ display: 'block', flex: '0 0 auto', textDecoration: 'none', color: 'inherit' }}>
        <section style={{
          padding: 18,
          borderRadius: 14,
          background: colors.sage100,
          border: `1px solid ${colors.sage400}`,
          marginBottom: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: colors.sage700, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            <Sparkle size={16} weight="fill" /> Start here
          </div>
          <h2 style={{ margin: '10px 0 6px', color: colors.plum900, fontSize: 22 }}>{featured.title}</h2>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14, lineHeight: 1.5 }}>{featured.summary}</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, color: colors.plum700, fontSize: 13, fontWeight: 700 }}>
            Read the guide <ArrowRight size={16} />
          </span>
        </section>
      </Link>

      <div
        aria-label="Learn topics"
        style={{
          display: 'flex',
          flex: '0 0 auto',
          alignItems: 'center',
          minHeight: 58,
          overflowX: 'auto',
          overflowY: 'hidden',
          gap: 8,
          padding: '4px 0 10px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {filters.map((item) => {
          const selected = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={selected}
              style={{
                minHeight: 44,
                flex: '0 0 auto',
                padding: '9px 14px',
                borderRadius: 999,
                border: `1.5px solid ${selected ? colors.plum700 : colors.borderStrong}`,
                background: selected ? colors.plum700 : colors.surface,
                color: selected ? '#fff' : colors.plum900,
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {filter === 'all' ? (
        <div style={{ display: 'grid', gap: 24, marginTop: 8 }}>
          {LEARN_CATEGORIES.map((category) => {
            const categoryArticles = articles.filter((item) => item.category === category.id)
            if (!categoryArticles.length) return null
            const tone = categoryColors(category.id)
            return (
              <section key={category.id}>
                <div style={{ display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div>
                    <div style={{ color: tone.ink, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{category.title}</div>
                    <p style={{ margin: '3px 0 0', color: colors.textMuted, fontSize: 12.5 }}>{category.description}</p>
                  </div>
                  <Link to={`/learn/c/${category.id}`} style={{ color: colors.plum700, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>See all</Link>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {categoryArticles.slice(0, 3).map((item) => (
                    <ArticleCard key={item.slug} article={item} saved={saved} onToggle={toggle} compact />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : filtered.length > 0 ? (
        <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
          {filtered.map((item) => <ArticleCard key={item.slug} article={item} saved={saved} onToggle={toggle} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <MaisieLogo size={64} style={{ margin: '0 auto', opacity: 0.6 }} />
          <h2 style={{ margin: '12px 0 6px', fontSize: 18 }}>Nothing saved yet</h2>
          <p style={{ margin: 0, color: colors.textMuted, fontSize: 14 }}>Use the bookmark button to keep a guide here.</p>
        </div>
      )}
    </div>
  )
}

export function LearnCategory() {
  const { category: categoryId } = useParams()
  const { state } = useStore()
  const { saved, toggle } = useSavedArticles()
  const category = categoryFor(categoryId)
  if (!category) return <Navigate to="/learn" replace />
  const articles = visibleLearnArticles(state).filter((item) => item.category === categoryId)
  const tone = categoryColors(categoryId)

  return (
    <div className="screen screen--pad-bottom">
      <TopBar title={category.title} />
      <div style={{ padding: 14, borderRadius: 14, background: tone.fill, color: tone.ink, margin: '6px 0 16px', fontSize: 14, lineHeight: 1.5 }}>
        {category.description}
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {articles.map((item) => <ArticleCard key={item.slug} article={item} saved={saved} onToggle={toggle} />)}
      </div>
    </div>
  )
}

function ArticleBlock({ block }) {
  if (block.type === 'p') return <p style={{ margin: 0, color: colors.textSecondary, fontSize: 15, lineHeight: 1.7 }}>{block.text}</p>
  if (block.type === 'h2') return <h2 style={{ margin: '8px 0 -2px', color: colors.plum900, fontSize: 20, lineHeight: 1.3 }}>{block.text}</h2>
  if (block.type === 'list') return (
    <ul style={{ margin: 0, paddingLeft: 21, display: 'grid', gap: 8, color: colors.textSecondary, fontSize: 15, lineHeight: 1.55 }}>
      {block.items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
  if (block.type === 'callout') {
    const sage = block.kind === 'good-to-know'
    return (
      <aside style={{ padding: 15, borderRadius: 14, background: sage ? colors.sage100 : colors.lavender100, borderLeft: `3px solid ${sage ? colors.sage700 : colors.plum700}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6, color: sage ? colors.sage700 : colors.plum700, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {sage ? <CheckCircle size={16} weight="fill" /> : <Sparkle size={16} weight="fill" />}
          {sage ? 'Good to know' : 'Real talk'}
        </div>
        <p style={{ margin: 0, color: colors.plum900, fontSize: 14.5, lineHeight: 1.6 }}>{block.text}</p>
      </aside>
    )
  }
  if (block.type === 'compare') return (
    <div style={{ display: 'grid', gap: 10 }}>
      {[block.left, block.right].map((side, index) => (
        <div key={side.title} style={{ padding: 15, borderRadius: 14, background: index === 0 ? colors.sage100 : colors.lavender100 }}>
          <strong style={{ color: index === 0 ? colors.sage700 : colors.plum700, fontSize: 14 }}>{side.title}</strong>
          <ul style={{ margin: '9px 0 0', paddingLeft: 19, display: 'grid', gap: 7, color: colors.textSecondary, fontSize: 14, lineHeight: 1.5 }}>
            {side.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ))}
    </div>
  )
  if (block.type === 'askDoctor') return (
    <section style={{ padding: 16, borderRadius: 14, border: `1.5px dashed ${colors.plum700}`, background: colors.surface }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.plum700, fontSize: 14, fontWeight: 700 }}>
        <Question size={19} weight="duotone" /> Ask a doctor
      </div>
      <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 8, color: colors.textSecondary, fontSize: 14, lineHeight: 1.5 }}>
        {block.questions.map((item) => <li key={item}>{item}</li>)}
      </ul>
      {features.routeSummary && <Link to="/route/talk" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, color: colors.plum700, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Prepare for the conversation <ArrowRight size={16} /></Link>}
    </section>
  )
  if (block.type === 'tracked') return (
    <section style={{ padding: 16, borderRadius: 14, background: colors.lavender50, border: `1px solid ${colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.plum700, fontSize: 14, fontWeight: 700 }}>
        <ListChecks size={19} weight="duotone" /> What Maisie tracks
      </div>
      <p style={{ margin: '8px 0 0', color: colors.textSecondary, fontSize: 14, lineHeight: 1.55 }}>{block.fields.join(', ')}.</p>
    </section>
  )
  return null
}

export function LearnArticle() {
  const { slug: rawSlug } = useParams()
  const navigate = useNavigate()
  const { state } = useStore()
  const { saved, toggle } = useSavedArticles()
  const slug = LEGACY_ARTICLE_SLUGS[rawSlug] || rawSlug
  const article = LEARN_ARTICLE_BY_SLUG[slug]
  const visibleArticles = useMemo(() => visibleLearnArticles(state), [state])
  const logCard = article ? learnLogCard(article.slug, state) : null

  useEffect(() => {
    if (!article || import.meta.env.PROD) return
    if (new Date(article.nextReviewAt) < new Date()) {
      console.warn(`Learn article needs review: ${article.slug}`)
    }
  }, [article])

  if (!article || !article.launch || !visibleArticles.some((item) => item.slug === article.slug)) {
    return <Navigate to="/learn" replace />
  }
  if (rawSlug !== slug) return <Navigate to={`/learn/${slug}`} replace />

  const category = categoryFor(article.category)
  const tone = categoryColors(article.category)
  const related = article.related
    .map((relatedSlug) => LEARN_ARTICLE_BY_SLUG[relatedSlug])
    .filter((item) => item?.launch && visibleArticles.some((visible) => visible.slug === item.slug))
  const reviewedAt = formatReviewDate(article.reviewedAt)
  const nextReviewAt = formatReviewDate(article.nextReviewAt)

  return (
    <div className="screen screen--pad-bottom">
      <TopBar
        onBack={() => navigate(-1)}
        right={<BookmarkButton slug={article.slug} saved={saved} onToggle={toggle} />}
      />
      <div style={{ color: tone.ink, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{category.title}</div>
      <h1 style={{ margin: '8px 0 7px', color: colors.plum900, fontSize: 28, lineHeight: 1.18 }}>{article.title}</h1>
      <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14.5, lineHeight: 1.5 }}>{article.subtitle}</p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, color: colors.textMuted, fontSize: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Clock size={14} /> {article.readMinutes} min</span>
      </div>

      {logCard && (
        <aside style={{ marginTop: 18, padding: 16, borderRadius: 14, background: colors.lavender100, border: `1px solid ${colors.lavender}` }}>
          <div style={{ color: colors.plum700, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{logCard.title}</div>
          <p style={{ margin: '7px 0 0', color: colors.plum900, fontSize: 14.5, lineHeight: 1.55 }}>{logCard.text}</p>
        </aside>
      )}

      <div style={{ display: 'grid', gap: 18, marginTop: 22 }}>
        {article.blocks.map((block, index) => <ArticleBlock key={`${block.type}-${index}`} block={block} />)}
      </div>

      {related.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 11px', color: colors.plum900, fontSize: 19 }}>Related guides</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {related.map((item) => <ArticleCard key={item.slug} article={item} saved={saved} onToggle={toggle} compact />)}
          </div>
        </section>
      )}

      <section style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${colors.border}` }}>
        <h2 style={{ margin: 0, color: colors.plum900, fontSize: 18 }}>Sources</h2>
        <ol style={{ margin: '11px 0 0', paddingLeft: 20, display: 'grid', gap: 10 }}>
          {article.sources.map((source) => (
            <li key={source.id} style={{ color: colors.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
              <a href={source.url} target="_blank" rel="noreferrer" style={{ color: colors.plum700 }}>{source.org}: {source.title}</a>. Accessed {source.accessed}.
            </li>
          ))}
        </ol>
        {SHOW_CONTENT_REVIEW && article.reviewedBy && reviewedAt && nextReviewAt && (
          <p style={{ margin: '16px 0 0', color: colors.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
            Content review: {article.reviewedBy}, {reviewedAt}. Next review: {nextReviewAt}.
          </p>
        )}
        <p style={{ margin: '14px 0 0', color: colors.textSecondary, fontSize: 13, lineHeight: 1.55 }}>
          Maisie shares information to help you ask better questions. It is not medical advice or a diagnosis. Talk to a doctor or nurse about your health.
        </p>
      </section>
    </div>
  )
}

export function LegacyLearnRedirect() {
  const { slug } = useParams()
  const target = LEGACY_ARTICLE_SLUGS[slug] || slug
  return <Navigate to={target ? `/learn/${target}` : '/learn'} replace />
}

export default LearnHome
