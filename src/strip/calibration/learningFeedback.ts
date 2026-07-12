const THANK_YOU_KEY = 'poolBoyPro_learningThankYouShown';

export function hasShownLearningThankYou(): boolean {
  try {
    return localStorage.getItem(THANK_YOU_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markLearningThankYouShown(): void {
  try {
    localStorage.setItem(THANK_YOU_KEY, 'true');
  } catch {
    // Unavailable in test environments
  }
}
