import { PASSWORD_POLICY } from './token-policy';

const COMMONLY_BREACHED_PASSWORDS = new Set([
  'password1!', 'password123!', 'password@123', 'password@1234', 'password#1',
  'qwerty@123', 'qwerty123!', 'qwertyuiop1!', 'admin@123', 'admin123!',
  'welcome@123', 'welcome123!', 'alifworld@2026', 'dhaka@1234', 'bangladesh@1',
  'qwerty1234!', 'abc12345!', 'abcd1234!', 'monkey123!', 'dragon123!',
  'football1!', 'princess1!', 'sunshine1!', 'trustno1!', 'master123!',
  '12345678@aa', 'letmein@123', 'iloveyou@123', 'pass@word1',
]);

export function isCommonPassword(password: string): boolean {
  return COMMONLY_BREACHED_PASSWORDS.has(password.toLowerCase().trim());
}

export function getPasswordRequirements(password: string): { key: string; met: boolean }[] {
  return [
    { key: 'required', met: password.length > 0 },
    { key: 'minLength', met: password.length >= PASSWORD_POLICY.MIN_LENGTH },
    { key: 'maxLength', met: password.length <= PASSWORD_POLICY.MAX_LENGTH },
    { key: 'uppercase', met: /[A-Z]/.test(password) },
    { key: 'lowercase', met: /[a-z]/.test(password) },
    { key: 'number', met: /\d/.test(password) },
    { key: 'special', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
    { key: 'unique', met: !isCommonPassword(password) },
  ];
}

export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] };
  }
  const messages: Record<string, string> = {
    required: 'Password is required',
    minLength: `Password must contain at least ${PASSWORD_POLICY.MIN_LENGTH} characters`,
    maxLength: `Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`,
    uppercase: 'Password must contain at least one uppercase English letter',
    lowercase: 'Password must contain at least one lowercase English letter',
    number: 'Password must contain at least one numeric digit',
    special: 'Password must contain at least one special character (!@#$%^&*...)',
    unique: 'This password appears in known data breaches or is too common. Please choose a more unique password.',
  };
  const errors = getPasswordRequirements(password)
    .filter(({ key, met }) => !met && (password.length > 0 || key === 'required'))
    .map(({ key }) => messages[key]);
  return { isValid: errors.length === 0, errors };
}