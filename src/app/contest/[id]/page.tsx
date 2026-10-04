export const dynamic = 'force-dynamic';

import ContestPageClient from './ContestPageClient';

export default function ContestPage({ params }: { params: { id: string } }) {
  return <ContestPageClient id={params?.id} />;
}
