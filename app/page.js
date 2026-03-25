import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { LandingNavbar } from '@/components/landing/LandingNavbar.js';
import { FadeIn } from '@/components/landing/FadeIn.js';
import { HeroSection } from '@/components/landing/HeroSection.js';
import { CampusSection } from '@/components/landing/CampusSection.js';
import { VibeCodingSection } from '@/components/landing/VibeCodingSection.js';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection.js';
import { TransparencySection } from '@/components/landing/TransparencySection.js';
import { VideoSection } from '@/components/landing/VideoSection.js';
import { HousesSection } from '@/components/landing/HousesSection.js';
import { CommunitySection } from '@/components/landing/CommunitySection.js';
import { CTASection } from '@/components/landing/CTASection.js';
import { LandingFooter } from '@/components/landing/LandingFooter.js';
import { DisclaimerModal } from '@/components/landing/DisclaimerModal.js';

export const dynamic = 'force-dynamic';

export const metadata = {
  metadataBase: new URL('https://sass.vibecoding.ar'),
  title: 'Campus San Andrés — Vibe Coding San Andrés',
  description:
    'Plataforma de fundraising gamificado del St. Andrew\'s Scots School. Creá juegos con IA, competí por tu House y construí el campus del futuro.',
  openGraph: {
    title: 'Campus San Andrés — Vibe Coding San Andrés',
    description:
      'Plataforma de fundraising gamificado del St. Andrew\'s Scots School. Creá juegos con IA, competí por tu House y construí el campus del futuro.',
    locale: 'es_AR',
    type: 'website',
    url: 'https://sass.vibecoding.ar',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus San Andrés — Vibe Coding San Andrés',
    description:
      'Plataforma de fundraising gamificado del St. Andrew\'s Scots School. Creá juegos con IA, competí por tu House y construí el campus del futuro.',
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect('/dashboard');
  }
  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-white font-sans text-[#0f172a] antialiased">
      <LandingNavbar isLoggedIn={isLoggedIn} />
      <main>
        <HeroSection isLoggedIn={isLoggedIn} />
        <FadeIn>
          <CampusSection />
        </FadeIn>
        <FadeIn>
          <VibeCodingSection />
        </FadeIn>
        <FadeIn>
          <HowItWorksSection />
        </FadeIn>
        <FadeIn>
          <TransparencySection />
        </FadeIn>
        <FadeIn>
          <VideoSection />
        </FadeIn>
        <FadeIn>
          <HousesSection />
        </FadeIn>
        <FadeIn>
          <CommunitySection />
        </FadeIn>
        <FadeIn>
          <CTASection isLoggedIn={isLoggedIn} />
        </FadeIn>
      </main>
      <LandingFooter />
      <DisclaimerModal />
    </div>
  );
}
