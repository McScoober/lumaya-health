// Library.jsx — Educational Library & Articles Screen
// Bite-sized, engaging, teen-focused guides on cycle phases, pain relief, mood, and body literacy.

import { useState, useMemo } from 'react'
import { TopBar, Card, Chip } from '../components/ui.jsx'
import {
  MagnifyingGlass,
  BookmarkSimple,
  Clock,
  Sparkle,
  Heart,
  ShareNetwork,
  X,
  CheckCircle,
} from '@phosphor-icons/react'

// Curated Educational Articles
const ARTICLES = [
  {
    id: 'art-cramps-101',
    title: 'Why Day 1 Cramps Hurt So Much (And What Actually Works)',
    category: 'Cramp Relief',
    readTime: '3 min',
    featured: true,
    emoji: '⚡',
    gradient: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
    tagColor: '#BE123C',
    snippet: 'Prostaglandins trigger muscle contractions in your uterus. Here is the science behind warmth, magnesium, and anti-inflammatories.',
    content: [
      'When your period starts, your body produces chemicals called prostaglandins. These signal the muscles of your uterus to gently squeeze and shed its lining. Higher levels of prostaglandins mean stronger contractions — which we feel as cramps.',
      '🔥 Heat Therapy Works: Applying a heating pad or hot water bottle at 104°F (40°C) increases blood circulation and relaxes uterine muscles as effectively as standard ibuprofen.',
      '💊 Timing Matters: Taking an NSAID (like ibuprofen or naproxen) at the first whisper of cramps — or even the night before — blocks prostaglandin production before it peaks.',
      '🥑 Magnesium & Water: Magnesium relaxes muscle tissue, while staying hydrated reduces bloating that can worsen pelvic pressure.',
    ],
    takeaway: 'Don’t wait until pain hits an 8/10. Early warmth + hydration makes a dramatic difference.',
  },
  {
    id: 'art-4-phases',
    title: 'The 4 Phases of Your Cycle (Without the Boring Biology)',
    category: 'Cycle 101',
    readTime: '4 min',
    featured: false,
    emoji: '🌸',
    gradient: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
    tagColor: '#7E22CE',
    snippet: 'Your cycle is so much more than just your period. Discover how your energy and mood change across all 4 phases.',
    content: [
      '1. Menstrual Phase (Days 1–5): Estrogen and progesterone are at their lowest. Your body is working hard. Permission to rest and recharge.',
      '2. Follicular Phase (Days 6–13): Estrogen begins to climb. Brain fog lifts, energy rises, and focus naturally sharpens. Great time to start projects.',
      '3. Ovulatory Phase (Days 14–16): Peak estrogen and testosterone. You might feel most sociable, confident, and physically energized.',
      '4. Luteal Phase (Days 17–28): Progesterone takes center stage. Energy slowly winds down, and your body turns inward. Comfort foods and gentle movement feel best.',
    ],
    takeaway: 'You’re not supposed to feel 100% the same every day. Riding your body’s natural rhythm beats fighting it.',
  },
  {
    id: 'art-pms-pmdd',
    title: 'When Period Mood Swings Feel Too Big',
    category: 'Mood & Sleep',
    readTime: '4 min',
    featured: false,
    emoji: '🌙',
    gradient: 'linear-gradient(135deg, #E0E7FF 0%, #C7D2FE 100%)',
    tagColor: '#4338CA',
    snippet: 'Mild irritability before your period is common, but feeling completely overwhelmed or hopeless is worth tracking and talking about.',
    content: [
      'Most teens experience PMS (Premenstrual Syndrome): mild mood swings, tender breasts, or craving salty snacks a few days before bleeding starts.',
      'Sometimes mood changes are intense enough to affect school, relationships, sleep, or feeling safe in your own body.',
      'Track when the mood shift starts, whether it repeats before bleeding, and whether it lifts shortly after your period begins.',
      'If you notice your emotions impacting relationships or school attendance every single month in days 20–28, log it and bring your summary to a doctor.',
    ],
    takeaway: 'Big repeat mood shifts are not a personal failure. Logged timing and impact can help a clinician take you seriously.',
  },
  {
    id: 'art-cycle-workouts',
    title: 'Cycle-Syncing Workouts: When to Push & When to Rest',
    category: 'Nutrition & Movement',
    readTime: '3 min',
    featured: false,
    emoji: '🏃‍♀️',
    gradient: 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)',
    tagColor: '#15803D',
    snippet: 'Why crushing HIIT workouts during your period feels impossible — and why heavy lifts feel easiest during your follicular phase.',
    content: [
      'During your menstrual phase, joints and ligaments are more flexible due to low hormones, but your core energy is conserved. Gentle walks, yoga, and mobility drills feel best.',
      'In your follicular and ovulatory phases, your body is primed for strength gains and high-intensity interval training.',
      'In your luteal phase, metabolic rate is slightly higher (meaning you burn more calories at rest!), but endurance decreases. Switch to moderate weights, pilates, and steady-state cardio.',
    ],
    takeaway: 'Adjusting your workout intensity with your cycle prevents burnout, injuries, and missed practices.',
  },
  {
    id: 'art-doctor-talk',
    title: 'How to Talk to a Doctor So They Actually Listen',
    category: 'Doctor Visits',
    readTime: '3 min',
    featured: false,
    emoji: '🩺',
    gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    tagColor: '#B45309',
    snippet: 'Too many teens hear "cramps are normal." Here’s the exact script and numbers to use so doctors take your pain seriously.',
    content: [
      'Use Objective Impact: Saying "my cramps hurt a lot" is easy for a busy doctor to dismiss. Saying "my cramps reached an 8/10 and caused me to miss 3 school days last month" gets immediate attention.',
      'Show Your Log: Pull out your Maisie Patterns view. Handing over 30–60 days of recorded symptoms proves your pain isn’t an exaggeration.',
      'Ask Direct Questions: "Is this pain level or bleeding pattern outside the usual range for my age? What are my options if regular ibuprofen is not enough?"',
    ],
    takeaway: 'Data is your superpower. When you bring logged numbers, doctors treat you like a partner.',
  },
  {
    id: 'art-blood-colors',
    title: 'Red, Brown, or Pink? What Period Blood Colors Mean',
    category: 'Cycle 101',
    readTime: '2 min',
    featured: false,
    emoji: '🎨',
    gradient: 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)',
    tagColor: '#991B1B',
    snippet: 'Seeing dark brown or light pink blood can feel alarming, but color changes are usually just about oxygen exposure.',
    content: [
      'Bright Red: Fresh blood that is flowing quickly. Most common on Days 1–3 of your period.',
      'Dark Brown or Black: Blood that took longer to leave the uterus and had time to oxidize (react with oxygen). Very normal at the start or tail-end of your period.',
      'Light Pink: Blood diluted with cervical fluid or vaginal discharge. Often seen as spotting right before your period or during ovulation.',
    ],
    takeaway: 'Color changes throughout your cycle are completely normal. Only sudden foul odors or severe pain warrant concern.',
  },
  {
    id: 'art-sleep-pain',
    title: 'The Surprising Link Between Sleep & Pain Tolerance',
    category: 'Mood & Sleep',
    readTime: '3 min',
    featured: false,
    emoji: '😴',
    gradient: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
    tagColor: '#334155',
    snippet: 'Losing just 90 minutes of sleep reduces pain thresholds by up to 30%. How to sleep better when cramps strike.',
    content: [
      'Sleep deprivation dampens the brain’s natural pain-relief pathways (the pain-inhibiting mechanisms in the central nervous system).',
      'Sleeping in the fetal position naturally relaxes abdominal muscles around the uterus, taking pressure off painful cramps.',
      'Place a pillow between your knees if you sleep on your side to keep your hips aligned and reduce lower back tension.',
    ],
    takeaway: 'Prioritizing an extra hour of rest before your period starts gives your body a stronger shield against cramps.',
  },
]

const CATEGORIES = ['All', 'Cramp Relief', 'Cycle 101', 'Mood & Sleep', 'Nutrition & Movement', 'Doctor Visits', 'Saved']

export default function Library() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [savedIds, setSavedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('maisie.savedArticles') || '[]')
    } catch {
      return []
    }
  })
  const [activeArticle, setActiveArticle] = useState(null)
  const [sharedToast, setSharedToast] = useState(false)

  const toggleSave = (id, e) => {
    if (e) e.stopPropagation()
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('maisie.savedArticles', JSON.stringify(next))
      return next
    })
  }

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((art) => {
      const matchesSearch =
        search.trim() === '' ||
        art.title.toLowerCase().includes(search.toLowerCase()) ||
        art.snippet.toLowerCase().includes(search.toLowerCase()) ||
        art.category.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (selectedCategory === 'All') return true
      if (selectedCategory === 'Saved') return savedIds.includes(art.id)
      return art.category === selectedCategory
    })
  }, [search, selectedCategory, savedIds])

  const featuredArticle = useMemo(() => {
    return ARTICLES.find((a) => a.featured) || ARTICLES[0]
  }, [])

  const handleShare = (art) => {
    if (navigator.share) {
      navigator.share({
        title: art.title,
        text: art.snippet,
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(`${art.title}\n\n${art.snippet}`)
      setSharedToast(true)
      setTimeout(() => setSharedToast(false), 2500)
    }
  }

  return (
    <div className="screen screen--pad-bottom">
      <TopBar title="Library" onBack={false} />

      {/* Search Input */}
      <div style={{ position: 'relative', marginTop: 12 }}>
        <input
          id="library-search"
          type="text"
          placeholder="Search topics, cramps, symptoms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px 12px 38px',
            borderRadius: 14,
            border: '1.5px solid rgba(0,0,0,0.08)',
            background: '#fff',
            fontSize: 14,
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <MagnifyingGlass
          size={18}
          color="#888"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#888',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '12px 2px 4px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat
          const count = cat === 'Saved' ? savedIds.length : null

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '7px 14px',
                borderRadius: 20,
                border: isSelected ? '1.5px solid var(--pink-accent)' : '1px solid rgba(0,0,0,0.08)',
                background: isSelected ? 'var(--pink-accent)' : '#fff',
                color: isSelected ? '#fff' : 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat} {count !== null && count > 0 && `(${count})`}
            </button>
          )
        })}
      </div>

      {/* Featured Hero Article (shown when category is 'All' and no active search) */}
      {selectedCategory === 'All' && !search && featuredArticle && (
        <div
          onClick={() => setActiveArticle(featuredArticle)}
          style={{
            marginTop: 14,
            borderRadius: 18,
            padding: 18,
            background: featuredArticle.gradient,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(224, 76, 122, 0.12)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(255,255,255,0.85)',
                color: featuredArticle.tagColor,
                padding: '3px 9px',
                borderRadius: 12,
              }}
            >
              Featured Guide
            </span>
            <button
              type="button"
              onClick={(e) => toggleSave(featuredArticle.id, e)}
              style={{
                border: 'none',
                background: 'rgba(255,255,255,0.8)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <BookmarkSimple
                size={18}
                weight={savedIds.includes(featuredArticle.id) ? 'fill' : 'regular'}
                color={savedIds.includes(featuredArticle.id) ? 'var(--pink-accent)' : '#555'}
              />
            </button>
          </div>

          <h2
            style={{
              margin: '12px 0 6px',
              fontSize: 17,
              fontWeight: 800,
              color: '#4C0519',
              lineHeight: 1.35,
            }}
          >
            {featuredArticle.title}
          </h2>

          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#701A2E', lineHeight: 1.5 }}>
            {featuredArticle.snippet}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#881337', fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> {featuredArticle.readTime}
            </span>
            <span>•</span>
            <span>{featuredArticle.category}</span>
          </div>
        </div>
      )}

      {/* Articles Feed */}
      <div className="stack-16" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {selectedCategory === 'All' ? 'All Guides' : selectedCategory} ({filteredArticles.length})
          </p>
        </div>

        {filteredArticles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>📖</p>
            <p style={{ fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              {selectedCategory === 'Saved' ? 'No saved guides yet' : 'No guides found'}
            </p>
            <p style={{ fontSize: 13, margin: 0 }}>
              {selectedCategory === 'Saved'
                ? 'Tap the bookmark icon on any guide to save it here for quick reading.'
                : 'Try searching for something else like cramps, sleep, or phases.'}
            </p>
          </div>
        ) : (
          filteredArticles.map((art) => {
            const isSaved = savedIds.includes(art.id)

            return (
              <Card
                key={art.id}
                onClick={() => setActiveArticle(art)}
                style={{
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: art.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    {art.emoji}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: art.tagColor,
                        }}
                      >
                        {art.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => toggleSave(art.id, e)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          padding: 2,
                          cursor: 'pointer',
                          color: isSaved ? 'var(--pink-accent)' : '#999',
                        }}
                      >
                        <BookmarkSimple size={18} weight={isSaved ? 'fill' : 'regular'} />
                      </button>
                    </div>

                    <h3
                      style={{
                        margin: '4px 0 6px',
                        fontSize: 14.5,
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: 'var(--text-primary)',
                      }}
                    >
                      {art.title}
                    </h3>

                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: 12.5,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.45,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {art.snippet}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#888' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={13} /> {art.readTime}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Reader Modal / Full Article View */}
      {activeArticle && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxWidth: 500,
              width: '100%',
              height: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.2)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(0,0,0,0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: activeArticle.tagColor,
                }}
              >
                {activeArticle.category} · {activeArticle.readTime}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => toggleSave(activeArticle.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: savedIds.includes(activeArticle.id) ? 'var(--pink-accent)' : '#666',
                  }}
                >
                  <BookmarkSimple size={22} weight={savedIds.includes(activeArticle.id) ? 'fill' : 'regular'} />
                </button>
                <button
                  type="button"
                  onClick={() => handleShare(activeArticle)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#666' }}
                >
                  <ShareNetwork size={22} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  style={{
                    border: 'none',
                    background: '#f0f0f0',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Article Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <h1
                style={{
                  fontSize: 21,
                  fontWeight: 800,
                  lineHeight: 1.3,
                  margin: '0 0 14px',
                  color: 'var(--text-primary)',
                }}
              >
                {activeArticle.title}
              </h1>

              {/* Key Takeaway Pill */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #FFF5F7 0%, #FAF0F4 100%)',
                  borderLeft: '3px solid var(--pink-accent)',
                  padding: '12px 14px',
                  borderRadius: '0 12px 12px 0',
                  margin: '0 0 20px',
                  fontSize: 13,
                  color: '#7B1B40',
                  lineHeight: 1.5,
                  fontWeight: 500,
                }}
              >
                <strong>💡 Quick Takeaway:</strong> {activeArticle.takeaway}
              </div>

              {/* Article Paragraphs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {activeArticle.content.map((p, idx) => (
                  <p
                    key={idx}
                    style={{
                      margin: 0,
                      fontSize: 14.5,
                      lineHeight: 1.65,
                      color: '#333',
                    }}
                  >
                    {p}
                  </p>
                ))}
              </div>

              {/* Bottom Done Button */}
              <div style={{ marginTop: 30, paddingBottom: 20 }}>
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 14,
                    border: 'none',
                    background: 'var(--pink-accent)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Done Reading ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {sharedToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#2B211E',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            zIndex: 110,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          ✓ Summary copied to clipboard!
        </div>
      )}
    </div>
  )
}
