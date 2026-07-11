import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { NavButton } from '../components/ui/NavButton';
import { PageHeader } from '../components/layout/PageHeader';

export function NotFoundPage() {
  return (
    <div className="page not-found">
      <PageHeader title="Page Not Found" subtitle="The page you're looking for doesn't exist." />
      <Card>
        <EmptyState
          icon="404"
          title="Page not found"
          description="This link may be broken or the page may have been moved."
          action={
            <NavButton to="/" size="lg">
              Back to Dashboard
            </NavButton>
          }
        />
      </Card>
    </div>
  );
}
