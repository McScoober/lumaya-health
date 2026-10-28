export const LOCAL_TEST_PROFILES = Object.freeze([
  {
    id: 'typical',
    label: 'Typical tracking profile',
    name: 'Maisie Test',
    defaultEmail: 'local-test@maisiehealth.com',
  },
  {
    id: 'flagged-heavy-flow',
    label: 'Flagged heavy-flow profile',
    name: 'Avery Test',
    defaultEmail: 'local-heavy-flow@maisiehealth.com',
  },
])

export function localTestProfile(id = 'typical') {
  return LOCAL_TEST_PROFILES.find((profile) => profile.id === id) || LOCAL_TEST_PROFILES[0]
}

