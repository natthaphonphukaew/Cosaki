export default function Spinner({ size = 'md', color = 'purple' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const colors = { purple: 'border-brand-purple', white: 'border-white' };
  return (
    <div className={`animate-spin rounded-full border-2 border-t-transparent ${sizes[size]} ${colors[color]}`} />
  );
}
