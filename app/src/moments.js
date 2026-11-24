// The reaction catalogue the prototype draws from.
// PLACEHOLDER TEXT: check every explanation against your food-science source
// before testing with participants, and keep explanations qualitative.
//
// label    – the glance label pinned to the food
// sub      – second line under the label
// why      – the card shown when the cook says "why?"
// more     – the deeper card for "more"
// headsUp  – the warning shown before a change is about to happen

export const moments = [
  {
    id: 'onions-golden',
    label: 'Onions are turning golden',
    sub: 'Browning has started',
    why: 'As the water cooks off, the sugars in the onion start to brown. That is where the sweet, deeper flavour comes from.',
    more: 'This browning is a mix of caramelisation and the Maillard reaction. Lower heat gives it time to happen evenly before the edges burn.',
    headsUp: 'Onions will start browning soon',
  },
  {
    id: 'garlic-added',
    label: 'Garlic is cooking fast',
    sub: 'It browns quicker than onion',
    why: 'Garlic pieces are small and low in water, so they heat through quickly. A minute is often enough.',
    more: 'Once garlic goes past golden it turns bitter. Adding it after the onions keeps it from burning.',
    headsUp: 'Garlic will be ready in under a minute',
  },
  {
    id: 'egg-setting',
    label: 'The egg white is setting',
    sub: 'Turning from clear to white',
    why: 'Heat makes the proteins in the white unfold and link together, which turns it solid and opaque.',
    more: 'The white sets at a lower temperature than the yolk thickens, which is why you can have a set white and a runny yolk.',
    headsUp: 'The white is about to set',
  },
  {
    id: 'sauce-splitting',
    label: 'The sauce is starting to split',
    sub: 'Fat is separating out',
    why: 'Too much heat breaks the mix of fat and water apart, so the fat pools on top.',
    more: 'Taking it off the heat and whisking in a splash of cold liquid can bring it back together.',
    headsUp: 'Sauce may split if it gets hotter',
  },
]

export const momentById = (id) => moments.find((m) => m.id === id)

// Video clips live in public/clips/. Add your filmed clips there.
export const clips = ['onions.mp4', 'garlic.mp4', 'egg.mp4', 'sauce.mp4']
