// Seed phrase helpers. The word list is the standard English recovery list
// subset used for 12-word phrases.
const WORDS = [
  "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
  "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
  "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
  "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
  "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
  "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
  "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
  "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
  "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
  "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
  "arrive", "arrow", "art", "artist", "artwork", "ask", "aspect", "asset", "assist", "assume",
  "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt",
  "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome",
  "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony",
  "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic",
  "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef", "before", "begin",
  "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better",
  "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter",
  "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom",
  "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone",
  "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box",
  "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief",
  "bright", "bring", "brisk", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble",
  "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden",
  "burger", "burst", "business", "cabin", "cable", "cactus", "cage", "cake", "call", "calm",
  "camera", "camp", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon", "capable",
  "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case",
  "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught",
  "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain",
];

export function normalizePhrase(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function wordCount(value) {
  const clean = normalizePhrase(value);
  return clean ? clean.split(" ").length : 0;
}

export function isValidPhrase(value) {
  const words = normalizePhrase(value).split(" ");
  return words.length >= 12 && words.every((word) => word.length > 1);
}

export function generatePhrase(count = 12) {
  const pool = [...WORDS];
  const random = crypto.getRandomValues(new Uint32Array(count));
  const picked = [];
  for (let i = 0; i < count; i += 1) {
    const index = random[i] % pool.length;
    picked.push(pool[index]);
    pool.splice(index, 1);
  }
  return picked.join(" ");
}