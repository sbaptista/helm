import { LogsClient } from './LogsClient';

export function LogsSection({ tripId }: { tripId: string }) {
  return <LogsClient tripId={tripId} />;
}
