// Password strength scoring for auth forms

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string; // tailwind bg class
  textColor: string;
  hints: string[];
}

export function getPasswordStrength(password: string): PasswordStrength {
  const hints: string[] = [];
  if (password.length === 0) {
    return { score: 0, label: '', color: '', textColor: '', hints: [] };
  }

  let score = 0;
  if (password.length >= 8) score++;
  else hints.push('minimal 8 karakter');
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  else hints.push('huruf besar & kecil');
  if (/\d/.test(password)) score++;
  else hints.push('angka');
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else hints.push('simbol (!@#$...)');

  const labels = ['Sangat Lemah', 'Lemah', 'Sedang', 'Kuat', 'Sangat Kuat'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];
  const textColors = [
    'text-red-600 dark:text-red-400',
    'text-orange-600 dark:text-orange-400',
    'text-yellow-600 dark:text-yellow-400',
    'text-lime-600 dark:text-lime-400',
    'text-green-600 dark:text-green-400',
  ];

  return {
    score: score as PasswordStrength['score'],
    label: labels[score],
    color: colors[score],
    textColor: textColors[score],
    hints,
  };
}
