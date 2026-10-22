export const SYMPTOM_CLUSTERS = Object.freeze([
  {
    id: 'period-bleeding',
    label: 'Period and bleeding',
    description: 'Flow, spotting, leaking, soaking, clots, and timing.',
    symptoms: ['Spotting'],
  },
  {
    id: 'pain-cramps',
    label: 'Pain and cramps',
    description: 'Cramps, pain timing, back pain, and what helped.',
    symptoms: ['Cramps', 'Back pain'],
  },
  {
    id: 'mood-energy',
    label: 'Mood and energy',
    description: 'Mood changes, energy, and tiredness.',
    symptoms: ['Mood changes', 'Fatigue'],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    description: 'Sleep trouble and how rested you feel.',
    symptoms: ['Sleep trouble'],
  },
  {
    id: 'skin-hair-body',
    label: 'Skin, hair and body',
    description: 'Skin, hair, breast, and other body changes.',
    symptoms: ['Skin breakout', 'Breast tenderness'],
  },
  {
    id: 'tummy-other',
    label: 'Tummy and other',
    description: 'Bloating, nausea, headaches, dizziness, and anything else.',
    symptoms: ['Bloating', 'Nausea', 'Headache', 'Dizziness', 'Discharge changes'],
  },
  {
    id: 'food-fuel',
    label: 'Food and fuel',
    description: 'Meals, appetite, energy after eating, and iron foods.',
    symptoms: [],
    module: 'food',
  },
])

export const FALLBACK_SYMPTOM_CLUSTER_ID = 'tummy-other'

const clusterById = new Map(SYMPTOM_CLUSTERS.map((cluster) => [cluster.id, cluster]))
const symptomToCluster = new Map(
  SYMPTOM_CLUSTERS.flatMap((cluster) => cluster.symptoms.map((symptom) => [symptom, cluster.id])),
)

export function symptomClusterFor(symptom) {
  return clusterById.get(symptomToCluster.get(symptom) || FALLBACK_SYMPTOM_CLUSTER_ID)
}

export function groupSymptomOptions(symptoms = []) {
  const grouped = new Map()
  for (const symptom of symptoms) {
    const cluster = symptomClusterFor(symptom)
    if (!grouped.has(cluster.id)) grouped.set(cluster.id, [])
    grouped.get(cluster.id).push(symptom)
  }
  return SYMPTOM_CLUSTERS
    .filter((cluster) => grouped.has(cluster.id))
    .map((cluster) => ({ ...cluster, symptoms: grouped.get(cluster.id) }))
}

export function groupLoggedSymptoms(logs = []) {
  const countsByCluster = new Map()
  for (const { symptoms = [] } of logs) {
    for (const symptom of new Set(symptoms)) {
      const cluster = symptomClusterFor(symptom)
      if (!countsByCluster.has(cluster.id)) countsByCluster.set(cluster.id, new Map())
      const symptomCounts = countsByCluster.get(cluster.id)
      symptomCounts.set(symptom, (symptomCounts.get(symptom) || 0) + 1)
    }
  }
  return SYMPTOM_CLUSTERS
    .filter((cluster) => countsByCluster.has(cluster.id))
    .map((cluster) => ({
      id: cluster.id,
      label: cluster.label,
      symptoms: [...countsByCluster.get(cluster.id).entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([name, count]) => ({ name, count })),
    }))
}

