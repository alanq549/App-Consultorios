import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { staticbackend } from "@/config/variables";
import { updateAvatar, updateProfile } from "@/store/auth/authSlice";
import { useUserProfile } from "@/hooks/users/useUserProfile";
import { Camera, Pencil, Check, X, Phone, Mail,  Loader2 } from "lucide-react";
import type { RootState } from "@/store";

type EditableField = "name" | "lastName" | "phone" | null;

export const ProfileHeader = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { updateAvatarHook, updateProfile: updateProfileHook } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [savingField, setSavingField] = useState<EditableField>(null);
  const [previewTemp, setPreviewTemp] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<EditableField>(null);
  const [form, setForm] = useState({ name: "", lastName: "", phone: "" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.profile?.name || "",
      lastName: user.profile?.lastName || "",
      phone: user.profile?.phone || "",
    });
  }, [user?.profile]);

  useEffect(() => {
    if (activeField) inputRef.current?.focus();
  }, [activeField]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveField = async (field: EditableField) => {
    if (!field) return;
    setSavingField(field);
    try {
      const updated = await updateProfileHook(form);
      dispatch(updateProfile(updated));
      setActiveField(null);
    } finally {
      setSavingField(null);
    }
  };

  const handleCancelField = (field: keyof typeof form) => {
    setForm(prev => ({
      ...prev,
      [field]: user?.profile?.[field as keyof typeof user.profile] as string || "",
    }));
    setActiveField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: EditableField) => {
    if (e.key === "Enter") handleSaveField(field);
    if (e.key === "Escape") handleCancelField(field as keyof typeof form);
  };

  const avatarSrc = previewTemp || (user?.profile?.avatar
    ? `${staticbackend}${user.profile.avatar}`
    : "/avatar-placeholder.png");

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      setPreviewTemp(reader.result as string);
      setLoading(true);
      try {
        const uploadedUrl = await updateAvatarHook(file);
        dispatch(updateAvatar(uploadedUrl));
        setPreviewTemp(null);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  // Componente inline editable reutilizable
  const InlineField = ({
    field,
    value,
    displayValue,
    placeholder = "—",
    className = "",
  }: {
    field: EditableField;
    value: string;
    displayValue?: string;
    placeholder?: string;
    className?: string;
  }) => {
    const isActive = activeField === field;
    const isSaving = savingField === field;

    return (
      <span className={`group/field inline-flex items-center gap-1.5 ${className}`}>
        {isActive ? (
          <span className="inline-flex items-center gap-1">
            <input
              ref={inputRef}
              name={field as string}
              value={value}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, field)}
              className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 outline-none text-blue-700 dark:text-blue-300 font-black text-4xl tracking-tight w-auto min-w-[80px] max-w-[200px] transition-all"
              style={{ width: `${Math.max(value.length, 4)}ch` }}
            />
            <button
              onClick={() => handleSaveField(field)}
              disabled={isSaving}
              className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => handleCancelField(field as keyof typeof form)}
              className="p-1 rounded-lg bg-slate-200 dark:bg-neutral-700 text-slate-500 hover:bg-slate-300 transition-all"
            >
              <X size={14} />
            </button>
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 cursor-pointer"
            onClick={() => setActiveField(field)}
          >
            <span>{displayValue ?? ""}{value || placeholder}</span>
            <span className="opacity-0 group-hover/field:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100 dark:hover:bg-neutral-700">
              <Pencil size={14} className="text-slate-400 dark:text-neutral-500" />
            </span>
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="flex flex-col md:flex-row items-center md:items-end gap-8 p-4 bg-white dark:bg-neutral-900 rounded-3xl border border-slate-100 dark:border-neutral-800 shadow-sm transition-all duration-300">

      {/* SECCIÓN DEL AVATAR */}
      <div className="relative group">
        <div className={`
          relative w-40 h-40 rounded-3xl p-1.5
          ring-4 ring-slate-50 dark:ring-neutral-800/50 
          transition-all duration-500 overflow-hidden
          ${loading ? "opacity-70" : "hover:ring-blue-100 dark:hover:ring-blue-900/20"}
        `}>
          <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-white dark:border-neutral-900 bg-slate-100 dark:bg-neutral-800 shadow-inner">
            <img
              src={avatarSrc}
              alt="avatar"
              className={`w-full h-full object-cover transition-transform duration-700 ${loading ? "scale-110 blur-sm" : "group-hover:scale-110"}`}
            />
          </div>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px] z-10">
              <Loader2 className="text-blue-600 animate-spin" size={32} />
            </div>
          )}
          <label className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-3 rounded-2xl cursor-pointer shadow-xl shadow-blue-500/40 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 z-20 border-2 border-white dark:border-neutral-900">
            <Camera size={20} />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
          </label>
        </div>
      </div>

      {/* SECCIÓN DE INFORMACIÓN */}
      <div className="flex-1 w-full flex flex-col items-center md:items-start pb-2">
        <div className="animate-in fade-in slide-in-from-left-4 duration-500 w-full">

          {/* Nombre + Apellido inline editables */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
            <h2 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
              <InlineField field="name" value={form.name} placeholder="Nombre" />
              {" "}
              <InlineField
                field="lastName"
                value={form.lastName}
                displayValue={undefined}
                placeholder="Apellido"
                className="text-blue-600"
              />
            </h2>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-800 w-fit">
              {user.role}
            </span>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            <div className="flex items-center gap-3 text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-800/50 p-3 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 transition-all">
              <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <Mail size={16} className="text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold opacity-50 tracking-widest">Email</span>
                <span className="text-sm font-semibold truncate">{user.email}</span>
              </div>
            </div>

            {/* Phone inline editable dentro de la card */}
            <div className="flex items-center gap-3 text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-800/50 p-3 rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-neutral-700 transition-all">
              <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm">
                <Phone size={16} className="text-emerald-500" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] uppercase font-bold opacity-50 tracking-widest">Teléfono</span>
                {activeField === "phone" ? (
                  <span className="inline-flex items-center gap-1 mt-0.5">
                    <input
                      ref={activeField === "phone" ? inputRef : undefined}
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      onKeyDown={(e) => handleKeyDown(e, "phone")}
                      className="bg-blue-50 dark:bg-blue-900/20 border-b-2 border-blue-500 outline-none text-blue-700 dark:text-blue-300 text-sm font-semibold w-32 transition-all"
                    />
                    <button
                      onClick={() => handleSaveField("phone")}
                      disabled={savingField === "phone"}
                      className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all"
                    >
                      {savingField === "phone" ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button
                      onClick={() => handleCancelField("phone")}
                      className="p-1 rounded-lg bg-slate-200 dark:bg-neutral-700 text-slate-500 hover:bg-slate-300 transition-all"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ) : (
                  <span
                    className="group/phone inline-flex items-center gap-1 cursor-pointer mt-0.5"
                    onClick={() => setActiveField("phone")}
                  >
                    <span className="text-sm font-semibold">{form.phone || user?.profile?.phone || "No registrado"}</span>
                    <Pencil size={12} className="text-slate-400 opacity-0 group-hover/phone:opacity-100 transition-opacity" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};