export const dynamic = 'force-dynamic';

import ParticipantClient from './ParticipantClient';

export default function ParticipantPage({ params }: { params: { id: string } }) {
  return <ParticipantClient params={params} />;
}
