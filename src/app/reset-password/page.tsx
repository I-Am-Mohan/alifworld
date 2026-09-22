import type { Metadata } from 'next';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = {
  title: 'Reset password | AlifWorld',
  description: 'Securely set a new password for your AlifWorld account.',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  return (
    <ResetPasswordForm
      email={typeof searchParams.email === 'string' ? searchParams.email : ''}
    />
  );
}
