import { PublicHeader } from '../ui/PublicHeader';
import { PublicFooter } from '../ui/PublicFooter';
import { HomeHero } from '../ui/home/HomeHero';
import { PlatformPreviewSection } from '../ui/home/PlatformPreviewSection';
import { SpecialtiesSection } from '../ui/home/SpecialtiesSection';
import { AudienceTabsSection } from '../ui/home/AudienceTabsSection';
import { SocialProofSection } from '../ui/home/SocialProofSection';
import { HomeFinalCta } from '../ui/home/HomeFinalCta';

export function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-slate-100 font-sans antialiased transition-colors duration-300 selection:bg-brand-500 selection:text-white overflow-x-hidden">
      <PublicHeader />
      <main>
        <HomeHero />
        <PlatformPreviewSection />
        <SpecialtiesSection />
        <AudienceTabsSection />
        <SocialProofSection />
        <HomeFinalCta />
      </main>
      <PublicFooter />
    </div>
  );
}