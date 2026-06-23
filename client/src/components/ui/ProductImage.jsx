// Renders a product photo, or a deterministic, attractive gradient placeholder
// (with a fandom-themed emoji) when the item has no image yet. Fully offline.

const GRADIENTS = [
  ['#7C3AED', '#EC4899'], // brand
  ['#6366F1', '#8B5CF6'],
  ['#EC4899', '#F59E0B'],
  ['#06B6D4', '#3B82F6'],
  ['#10B981', '#06B6D4'],
  ['#F43F5E', '#8B5CF6'],
  ['#8B5CF6', '#06B6D4'],
];

const EMOJI_BY_KEYWORD = [
  [/wig|hair/i,                 '💇'],
  [/armor|battle|knight|sword/i,'🛡️'],
  [/dress|gown|maid/i,          '👗'],
  [/cyber|punk|neon|tech/i,     '🤖'],
  [/genshin|fantasy|magic|mage/i,'✨'],
  [/cat|neko|animal/i,          '🐾'],
  [/school|uniform/i,           '🎒'],
  [/demon|slayer|ninja|samurai/i,'⚔️'],
];

const hash = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

const pickEmoji = (item) => {
  const hay = `${item?.name || ''} ${item?.fandom || ''} ${item?.character || ''}`;
  for (const [re, emoji] of EMOJI_BY_KEYWORD) if (re.test(hay)) return emoji;
  return '🎭';
};

export default function ProductImage({ item, className = '', emojiClassName = 'text-5xl', alt }) {
  const src = item?.image_urls?.[0];
  if (src) {
    return <img src={src} alt={alt || item?.name || ''} className={`h-full w-full object-cover ${className}`} />;
  }
  const [from, to] = GRADIENTS[hash(item?.id || item?.name || '') % GRADIENTS.length];
  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className={`drop-shadow ${emojiClassName}`}>{pickEmoji(item)}</span>
    </div>
  );
}
