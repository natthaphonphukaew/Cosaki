export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-white p-4 shadow-sm ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
