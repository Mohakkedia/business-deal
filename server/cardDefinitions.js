const PROPERTY_SETS = {
  brown: { count: 2, rents: [1, 2], color: '#8B4513' },
  lightBlue: { count: 3, rents: [1, 2, 3], color: '#87CEEB' },
  pink: { count: 3, rents: [1, 2, 4], color: '#FF69B4' },
  orange: { count: 3, rents: [1, 3, 5], color: '#FF8C00' },
  red: { count: 3, rents: [2, 3, 6], color: '#FF0000' },
  yellow: { count: 3, rents: [2, 4, 6], color: '#FFD700' },
  green: { count: 3, rents: [2, 4, 7], color: '#228B22' },
  darkBlue: { count: 2, rents: [3, 8], color: '#00008B' },
  railroad: { count: 4, rents: [1, 2, 3, 4], color: '#333333' },
  utility: { count: 2, rents: [1, 2], color: '#90EE90' }
};

function createDeck() {
  const deck = [];
  let idCounter = 1;
  const add = (card) => {
    card.id = `card_${idCounter++}`;
    deck.push(card);
  };

  // Money cards (20)
  for(let i=0; i<6; i++) add({ type: 'money', name: '1M', value: 1, color: null, colors: null, actionType: null, rentColors: null });
  for(let i=0; i<5; i++) add({ type: 'money', name: '2M', value: 2, color: null, colors: null, actionType: null, rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'money', name: '3M', value: 3, color: null, colors: null, actionType: null, rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'money', name: '4M', value: 4, color: null, colors: null, actionType: null, rentColors: null });
  for(let i=0; i<2; i++) add({ type: 'money', name: '5M', value: 5, color: null, colors: null, actionType: null, rentColors: null });
  for(let i=0; i<1; i++) add({ type: 'money', name: '10M', value: 10, color: null, colors: null, actionType: null, rentColors: null });

  // Property cards (28)
  const props = [
    { name: 'Brown Property', color: 'brown', value: 1 }, { name: 'Brown Property', color: 'brown', value: 1 },
    { name: 'Light Blue Property', color: 'lightBlue', value: 1 }, { name: 'Light Blue Property', color: 'lightBlue', value: 1 }, { name: 'Light Blue Property', color: 'lightBlue', value: 1 },
    { name: 'Pink Property', color: 'pink', value: 2 }, { name: 'Pink Property', color: 'pink', value: 2 }, { name: 'Pink Property', color: 'pink', value: 2 },
    { name: 'Orange Property', color: 'orange', value: 2 }, { name: 'Orange Property', color: 'orange', value: 2 }, { name: 'Orange Property', color: 'orange', value: 2 },
    { name: 'Red Property', color: 'red', value: 3 }, { name: 'Red Property', color: 'red', value: 3 }, { name: 'Red Property', color: 'red', value: 3 },
    { name: 'Yellow Property', color: 'yellow', value: 3 }, { name: 'Yellow Property', color: 'yellow', value: 3 }, { name: 'Yellow Property', color: 'yellow', value: 3 },
    { name: 'Green Property', color: 'green', value: 4 }, { name: 'Green Property', color: 'green', value: 4 }, { name: 'Green Property', color: 'green', value: 4 },
    { name: 'Dark Blue Property', color: 'darkBlue', value: 4 }, { name: 'Dark Blue Property', color: 'darkBlue', value: 4 },
    { name: 'Railroad', color: 'railroad', value: 2 }, { name: 'Railroad', color: 'railroad', value: 2 }, { name: 'Railroad', color: 'railroad', value: 2 }, { name: 'Railroad', color: 'railroad', value: 2 },
    { name: 'Utility', color: 'utility', value: 2 }, { name: 'Utility', color: 'utility', value: 2 }
  ];
  props.forEach(p => add({ type: 'property', name: p.name, value: p.value, color: p.color, colors: null, actionType: null, rentColors: null }));

  // Property Wild cards (11)
  add({ type: 'wild', name: 'Property Wild (Any)', value: 0, color: null, colors: Object.keys(PROPERTY_SETS), actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Any)', value: 0, color: null, colors: Object.keys(PROPERTY_SETS), actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Brown/Light Blue)', value: 1, color: null, colors: ['brown', 'lightBlue'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Pink/Orange)', value: 2, color: null, colors: ['pink', 'orange'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Red/Yellow)', value: 3, color: null, colors: ['red', 'yellow'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Green/Dark Blue)', value: 4, color: null, colors: ['green', 'darkBlue'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Railroad/Green)', value: 4, color: null, colors: ['railroad', 'green'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Railroad/Light Blue)', value: 4, color: null, colors: ['railroad', 'lightBlue'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Railroad/Utility)', value: 2, color: null, colors: ['railroad', 'utility'], actionType: null, rentColors: null });
  add({ type: 'wild', name: 'Property Wild (Dark Blue/Green)', value: 4, color: null, colors: ['darkBlue', 'green'], actionType: null, rentColors: null });

  // Rent cards (13)
  for(let i=0; i<3; i++) add({ type: 'rent', name: 'Rent (Any Color)', value: 3, color: null, colors: null, actionType: null, rentColors: Object.keys(PROPERTY_SETS) });
  for(let i=0; i<2; i++) add({ type: 'rent', name: 'Rent (Brown/Light Blue)', value: 1, color: null, colors: null, actionType: null, rentColors: ['brown', 'lightBlue'] });
  for(let i=0; i<2; i++) add({ type: 'rent', name: 'Rent (Pink/Orange)', value: 1, color: null, colors: null, actionType: null, rentColors: ['pink', 'orange'] });
  for(let i=0; i<2; i++) add({ type: 'rent', name: 'Rent (Red/Yellow)', value: 1, color: null, colors: null, actionType: null, rentColors: ['red', 'yellow'] });
  for(let i=0; i<2; i++) add({ type: 'rent', name: 'Rent (Green/Dark Blue)', value: 1, color: null, colors: null, actionType: null, rentColors: ['green', 'darkBlue'] });
  for(let i=0; i<2; i++) add({ type: 'rent', name: 'Rent (Railroad/Utility)', value: 1, color: null, colors: null, actionType: null, rentColors: ['railroad', 'utility'] });

  // Action cards (36)
  for(let i=0; i<10; i++) add({ type: 'action', name: 'Pass Go', value: 1, color: null, colors: null, actionType: 'passGo', rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'action', name: 'Just Say No', value: 4, color: null, colors: null, actionType: 'justSayNo', rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'action', name: 'Sly Deal', value: 3, color: null, colors: null, actionType: 'slyDeal', rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'action', name: 'Forced Deal', value: 3, color: null, colors: null, actionType: 'forcedDeal', rentColors: null });
  for(let i=0; i<2; i++) add({ type: 'action', name: 'Deal Breaker', value: 5, color: null, colors: null, actionType: 'dealBreaker', rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'action', name: "It's My Birthday", value: 2, color: null, colors: null, actionType: 'birthday', rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'action', name: 'Debt Collector', value: 3, color: null, colors: null, actionType: 'debtCollector', rentColors: null });
  for(let i=0; i<3; i++) add({ type: 'action', name: 'House', value: 3, color: null, colors: null, actionType: 'house', rentColors: null });
  for(let i=0; i<2; i++) add({ type: 'action', name: 'Hotel', value: 4, color: null, colors: null, actionType: 'hotel', rentColors: null });
  for(let i=0; i<2; i++) add({ type: 'action', name: 'Double Rent', value: 1, color: null, colors: null, actionType: 'doubleRent', rentColors: null });

  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getSetRequirement(color) {
  return PROPERTY_SETS[color]?.count || 0;
}

function getRentForSet(color, count, hasHouse, hasHotel) {
  const setInfo = PROPERTY_SETS[color];
  if (!setInfo || count <= 0) return 0;
  let rent = setInfo.rents[Math.min(count - 1, setInfo.rents.length - 1)];
  if (count >= setInfo.count) {
    if (hasHouse && color !== 'railroad' && color !== 'utility') rent += 3;
    if (hasHotel && color !== 'railroad' && color !== 'utility') rent += 4; // Assuming 4 additional on top of house, or 4 total over set? Rules say adds 4M to rent. We'll do +4.
  }
  return rent;
}

module.exports = {
  PROPERTY_SETS,
  createDeck,
  shuffleDeck,
  getSetRequirement,
  getRentForSet
};
