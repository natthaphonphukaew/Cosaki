import Button from './Button';

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <span className="text-5xl mb-4">⚠️</span>
      <p className="text-sm font-semibold text-gray-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4 w-40" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
