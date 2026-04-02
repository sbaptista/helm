import { AuthShell } from '@/components/auth/AuthShell';
import { CreateAccountForm } from './CreateAccountForm';

export default async function CreateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <AuthShell>
      <CreateAccountForm email={email} />
    </AuthShell>
  );
}
