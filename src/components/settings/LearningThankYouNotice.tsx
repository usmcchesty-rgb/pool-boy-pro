import { useEffect, useState } from 'react';

interface LearningThankYouNoticeProps {
  visible: boolean;
  onDismiss: () => void;
}

export function LearningThankYouNotice({ visible, onDismiss }: LearningThankYouNoticeProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (!visible) return;

    const timer = window.setTimeout(() => {
      setShow(false);
      onDismiss();
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!show) return null;

  return (
    <div className="learning-thank-you" role="status" aria-live="polite">
      <p className="learning-thank-you__title">✓ Thanks!</p>
      <p>Pool Boy Pro learned from this scan.</p>
      <p className="learning-thank-you__sub">Future scans will become more accurate.</p>
    </div>
  );
}
