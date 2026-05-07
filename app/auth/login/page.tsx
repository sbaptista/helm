import { AuthShell } from '@/components/auth/AuthShell';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const hasError = params.error === 'true';
  return (
    <AuthShell>
      <LoginForm initialError={hasError} />
    </AuthShell>
  );
}
