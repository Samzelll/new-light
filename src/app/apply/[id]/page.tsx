export const dynamic = 'force-dynamic';

import ApplyClient from './ApplyClient';

export default function ApplyPage({ params }: { params: { id: string } }) {
  return <ApplyClient id={params?.id} />;
}
