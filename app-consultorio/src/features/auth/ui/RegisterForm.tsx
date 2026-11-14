// src/features/auth/ui/RegisterForm.tsx
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Mail, User } from "lucide-react";
import { useSpecialties } from "@/hooks/specialties/useSpecialties";
import type { RegisterRequest, Role } from "@/types/auth.types";

type RegisterFormProps = {
  onSubmit: (payload: RegisterRequest) => Promise<boolean> | void;
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
};

const inputStyles =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 py-2.5 px-3 transition-colors";

const labelStyles = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

const COUNTRY_CODES = [
  { value: "+52", label: "🇲🇽 +52" },
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+34", label: "🇪🇸 +34" },
  { value: "+57", label: "🇨🇴 +57" },
  { value: "+54", label: "🇦🇷 +54" },
  { value: "+56", label: "🇨🇱 +56" },
];

function getPasswordStrength(value: string) {
  if (!value) {
    return {
      score: 0,
      label: "Usa 8 o más caracteres con mayúsculas y números",
      color: "text-slate-400",
      barColor: "bg-slate-200 dark:bg-slate-700",
    };
  }
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 8 && /[A-Z]/.test(value)) score++;
  if (value.length >= 10 && /[0-9!@#$%^&*]/.test(value)) score++;

  if (score >= 3) {
    return { score: 3, label: "¡Contraseña segura y robusta!", color: "text-emerald-500", barColor: "bg-emerald-500" };
  }
  if (score === 2) {
    return { score: 2, label: "Contraseña media (agrega números y símbolos)", color: "text-amber-500", barColor: "bg-amber-500" };
  }
  return { score: 1, label: "Contraseña débil", color: "text-rose-500", barColor: "bg-rose-500" };
}

export function RegisterForm({ onSubmit, isLoading, error, isSuccess }: RegisterFormProps) {
  const [role, setRole] = useState<Role>("CLIENT");
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+52");
  const [phone, setPhone] = useState("");
  const [specialtyId, setSpecialtyId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { data: specialties, isLoading: isLoadingSpecialties } = useSpecialties();
  const strength = getPasswordStrength(password);
  const isProfessional = role === "PROFESSIONAL";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const fullPhone = `${countryCode} ${phone}`.trim();

    if (isProfessional && !specialtyId) {
      setLocalError("Selecciona una especialidad.");
      return;
    }

    if (isProfessional) {
      onSubmit({
        role: "PROFESSIONAL",
        email,
        password,
        profile: { name, lastName, phone: fullPhone, specialtyId: Number(specialtyId), description },
      });
      return;
    }

    onSubmit({
      role: "CLIENT",
      email,
      password,
      profile: { name, lastName, phone: fullPhone },
    });
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-brand-600 dark:text-teal-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          ¡Cuenta creada!
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Enviamos un correo de verificación a{" "}
          <strong className="text-slate-800 dark:text-slate-200">{email}</strong>. Revisa tu
          bandeja para activar tu cuenta.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 transition-all"
        >
          Ir a iniciar sesión
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/80 mb-4">
        <span className="text-amber-500">✨</span>
        <span>Prueba gratuita de 14 días • Sin tarjeta requerida</span>
      </div>

      {/* Título */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Crea tu cuenta
        </h1>
        <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">
          Elige cómo deseas utilizar la plataforma para personalizar tu experiencia.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de tipo de perfil */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Tipo de Perfil
          </label>
          <div role="radiogroup" aria-label="Selecciona tipo de perfil" className="grid grid-cols-2 gap-3">
            <label
              className={`relative flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                role === "CLIENT"
                  ? "border-brand-600 bg-brand-50/60 dark:bg-brand-950/30"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="account_role"
                value="CLIENT"
                checked={role === "CLIENT"}
                onChange={() => setRole("CLIENT")}
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${role === "CLIENT" ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                  <User className="w-3.5 h-3.5" />
                </span>
                <span className={`text-xs sm:text-sm font-bold ${role === "CLIENT" ? "text-brand-900 dark:text-brand-200" : "text-slate-800 dark:text-slate-200"}`}>
                  Soy Paciente
                </span>
              </div>
              <span className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                Agendar citas, ver recetas y consultas médicas
              </span>
            </label>

            <label
              className={`relative flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                isProfessional
                  ? "border-brand-600 bg-brand-50/60 dark:bg-brand-950/30"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <input
                type="radio"
                name="account_role"
                value="PROFESSIONAL"
                checked={isProfessional}
                onChange={() => setRole("PROFESSIONAL")}
                className="sr-only"
              />
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isProfessional ? "bg-brand-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} />
                  </svg>
                </span>
                <span className={`text-xs sm:text-sm font-bold ${isProfessional ? "text-brand-900 dark:text-brand-200" : "text-slate-800 dark:text-slate-200"}`}>
                  Médico / Clínica
                </span>
              </div>
              <span className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                Gestiona consultorios, agenda y expedientes
              </span>
            </label>
          </div>
        </div>

        {/* Nombre y apellido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <div>
            <label htmlFor="first_name" className={labelStyles}>
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              id="first_name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan"
              className={inputStyles}
            />
          </div>
          <div>
            <label htmlFor="last_name" className={labelStyles}>
              Apellido <span className="text-rose-500">*</span>
            </label>
            <input
              id="last_name"
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Pérez"
              className={inputStyles}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelStyles}>
            Correo electrónico <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="h-4 w-4" />
            </span>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              className={`${inputStyles} pl-9`}
            />
          </div>
        </div>

        {/* Campos de profesional */}
        {isProfessional && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <label htmlFor="specialty" className={labelStyles}>
                Especialidad <span className="text-rose-500">*</span>
              </label>
              {isLoadingSpecialties ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Cargando especialidades...</p>
              ) : (
                <select
                  id="specialty"
                  required
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value ? Number(e.target.value) : "")}
                  className={inputStyles}
                >
                  <option value="">Selecciona una especialidad</option>
                  {specialties?.map((specialty) => (
                    <option key={specialty.id} value={specialty.id}>
                      {specialty.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="description" className={labelStyles}>
                Descripción / Bio
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cuéntanos sobre tu experiencia..."
                className={`${inputStyles} resize-none`}
              />
            </div>
          </div>
        )}

        {/* Teléfono */}
        <div>
          <label htmlFor="phone" className={labelStyles}>
            Teléfono celular <span className="text-rose-500">*</span>
          </label>
          <div className="flex">
            <select
              aria-label="Código de país"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40 py-2.5 pl-2.5 pr-6"
            >
              {COUNTRY_CODES.map((code) => (
                <option key={code.value} value={code.value}>
                  {code.label}
                </option>
              ))}
            </select>
            <input
              id="phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="712 000 0000"
              className={`${inputStyles} rounded-l-none flex-1`}
            />
          </div>
        </div>

        {/* Contraseña */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className={`${labelStyles} mb-0`}>
              Contraseña <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mín. 8 caracteres"
            className={inputStyles}
          />
          <div aria-hidden="true" className="mt-2 flex items-center gap-1.5">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  level <= strength.score ? strength.barColor : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>
          <span className={`block text-[11px] mt-1 font-medium ${strength.color}`}>
            {strength.label}
          </span>
        </div>

        {/* Términos */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              id="terms"
              type="checkbox"
              required
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-50 dark:bg-slate-800"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
              Acepto los{" "}
              <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">
                Términos del Servicio
              </a>{" "}
              y la{" "}
              <a href="#" className="text-brand-600 dark:text-brand-400 hover:underline font-semibold">
                Política de Privacidad
              </a>{" "}
              de Datos Médicos (NOM-004 &amp; HIPAA compliant).
            </span>
          </label>
        </div>

        {(localError || error) && (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl px-3 py-2"
          >
            {localError ?? error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 shadow-lg shadow-brand-600/25 active:scale-[0.99] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <span>{isLoading ? "Creando cuenta..." : "Finalizar Registro"}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <p className="text-center text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-5">
        ¿Ya tienes una cuenta?{" "}
        <Link to="/login" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
