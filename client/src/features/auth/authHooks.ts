// src/features/auth/authHooks.ts
import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { login, register } from "./authSlice";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { SocialLinks } from "../../types/auth/index";

export const useLogin = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await dispatch(login({ email, password })).unwrap();
      const role = response.user.role;
      const redirectParam = searchParams.get("redirect");

      if (redirectParam && role === "CLIENT") {
        // Si existe redirect y el rol es CLIENT
        navigate(redirectParam, { replace: true });
        return;
      }

      // Si no hay redirect, usamos el flujo normal por rol
      switch (role) {
        case "ADMIN":
          navigate("/admin/dashboard");
          break;
        case "PROFESSIONAL":
          navigate("/professional/dashboard");
          break;
        case "CLIENT":
          navigate("/client/dashboard");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    error,
    handleLogin,
  };
};


export const useRegister = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [form, setForm] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    avatar: null as File | null,
    isProfessional: false,
  });

  const [profile, setProfile] = useState({
    specialtyId: 0,
    description: "",
    certificates: [] as File[],
    socialLinks: {} as SocialLinks,
  });

  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false }, []);

  const handleChangeProfile = (
    field: keyof typeof profile,
    value: unknown
  ) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  console.log("loading redux:", loading);


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (key === "avatar" && value) formData.append("avatar", value as File);
      else formData.append(key, String(value));
    });

    if (form.isProfessional) {
      formData.append("professionalProfile", JSON.stringify({
        specialtyId: profile.specialtyId,
        description: profile.description,
        socialLinks: profile.socialLinks,
      }));
      profile.certificates.forEach(cert => formData.append("certificates", cert));
    }

      console.log("handleRegister llamado"); // <-- ver si se dispara


    try {
      await dispatch(register(formData)).unwrap();

      // Ya no redirige a ninguna ruta
      if (isMounted.current) {
        console.log("Registro exitoso");
      }
    } catch (err) {
      if (isMounted.current) console.error("Register failed:", err);
    }
  };

  return {
    form,
    setForm,
    profile,
    setProfile,
    handleChangeProfile,
    handleRegister,
    loading,
    error,
  };
};

