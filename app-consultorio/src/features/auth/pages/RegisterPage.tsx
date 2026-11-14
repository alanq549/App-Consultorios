// src/features/auth/pages/RegisterPage.tsx
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { AuthLayout } from "../ui/AuthLayout";
import { RegisterForm } from "../ui/RegisterForm";
import { RegisterHeroPanel } from "../ui/RegisterHeroPanel";
import { useRegister } from "../application/useRegister";

export function RegisterPage() {
  const { register, isLoading, error, isSuccess } = useRegister();

  return (
    <AuthLayout
      aside={<RegisterHeroPanel />}
      headerAction={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-teal-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <span className="hidden sm:inline">Ya tengo cuenta</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      }
    >
      <RegisterForm
        onSubmit={register}
        isLoading={isLoading}
        error={error}
        isSuccess={isSuccess}
      />
    </AuthLayout>
  );
}
