const variants = {
  primary:   'bg-brand-gradient text-white shadow-md active:opacity-90',
  secondary: 'border-2 border-brand-purple text-brand-purple bg-white active:bg-brand-light',
  ghost:     'text-brand-purple bg-transparent active:bg-brand-light',
  danger:    'bg-red-500 text-white active:opacity-90',
  google:    'border border-gray-200 bg-white text-gray-800',
  facebook:  'bg-[#1877F2] text-white',
};

export default function Button({ children, variant = 'primary', className = '', loading, icon, ...props }) {
  return (
    <button
      className={`flex items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-semibold transition-all disabled:opacity-50 ${variants[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
