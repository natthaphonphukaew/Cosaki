const styles = {
  pending:         'bg-amber-100 text-amber-700',
  escrowed:        'bg-purple-100 text-purple-700',
  shipped:         'bg-blue-100 text-blue-700',
  returned:        'bg-indigo-100 text-indigo-700',
  completed:       'bg-green-100 text-green-700',
  disputed:        'bg-red-100 text-red-700',
  cancelled:       'bg-gray-100 text-gray-500',
  verified:        'bg-green-100 text-green-700',
  frozen:          'bg-red-100 text-red-700',
  awaiting:        'bg-amber-100 text-amber-700',
  confirmed:       'bg-purple-100 text-purple-700',
};

export default function Badge({ status, label, className = '' }) {
  const style = styles[status] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}>
      {label || status}
    </span>
  );
}
