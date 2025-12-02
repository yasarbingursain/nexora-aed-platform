import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Error', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-red-500/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {message && (
        <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
          {message}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>
      )}
    </div>
  );
}
