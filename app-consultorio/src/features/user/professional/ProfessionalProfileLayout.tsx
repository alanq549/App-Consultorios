import { ProfileHeader } from "../components/ProfileHeader";

import { ProfessionalDescription } from "@/features/user/professional/professionalDescription";
import { ProfessionalCertificates } from "@/features/user/professional/professionalCertificates";
import { ProfessionalSocialLinks } from "@/features/user/professional/professionalSocialLinks";

import { SecuritySection } from "../views/SecuritySection";

export const ProfessionalProfileLayout = () => {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-10">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-neutral-900 shadow-2xl shadow-blue-500/5 border border-slate-100 dark:border-neutral-800">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 p-2">
          <ProfileHeader />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <aside className="lg:col-span-5 space-y-10">
          <SecuritySection />
          <ProfessionalDescription />
        </aside>
        <main className="lg:col-span-7 space-y-10">
          <ProfessionalCertificates />
          <ProfessionalSocialLinks />
        </main>
      </div>
    </div>
  );
};
