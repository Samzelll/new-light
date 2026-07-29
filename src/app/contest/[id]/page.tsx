export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import ContestPageClient from './ContestPageClient';
import { createClient } from '@supabase/supabase-js';

interface Props {
  params: { id: string };
}

/** Generate dynamic OG meta tags per contest */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params?.id;
  if (!id) return { title: 'Contest — Opinion Net' };

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('contests')
      .select('title, description, type, status')
      .eq('id', id)
      .single();

    if (!data) return { title: 'Contest — Opinion Net' };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://opinion-net.app';
    const ogImage = `${baseUrl}/api/og/${id}`;

    return {
      title: `${data.title} — Opinion Net`,
      description: data.description || `Vote in this ${data.type} contest on Opinion Net`,
      openGraph: {
        title: data.title,
        description: data.description || `A ${data.type} contest on Opinion Net`,
        url: `${baseUrl}/contest/${id}`,
        siteName: 'Opinion Net',
        images: [{ url: ogImage, width: 1200, height: 630, alt: data.title }],
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: data.title,
        description: data.description || `Vote now on Opinion Net`,
        images: [ogImage],
      },
    };
  } catch {
    return { title: 'Contest — Opinion Net' };
  }
}

export default function ContestPage({ params }: Props) {
  return <ContestPageClient id={params?.id} />;
}
