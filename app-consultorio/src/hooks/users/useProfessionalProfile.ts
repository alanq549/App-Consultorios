// src/hooks/users/useProfessionalProfile.ts
import { useState } from "react";
import { professionalApi } from "@/api/professional.api";
import { useAppDispatch } from "@/hooks/auth/useRedux";
import { updateProfile } from "@/store/auth/authSlice";
import { usersApi } from "@/api/users.api";


export const useProfessionalProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // --- Social Links ---
  const addSocialLink = async (data: { type: string; url: string }) => {
    setLoading(true);
    setError(null);
    try {
      return await professionalApi.createSocialLink(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creando social link");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editSocialLink = async (id: number, data: { type?: string; url?: string }) => {
    setLoading(true);
    setError(null);
    try {
      return await professionalApi.updateSocialLink(id, data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error actualizando social link");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeSocialLink = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      return await professionalApi.deleteSocialLink(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error eliminando social link");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Certificates ---

const addCertificate = async (
  file: File,
  name: string,
  issuedBy: string,
  issuedDate: string
) => {

  setLoading(true);
  setError(null);

  try {
    return await professionalApi.uploadCertificate(
      file,
      name,
      issuedBy,
      issuedDate
    );
  } catch (err: unknown) {

    setError(
      err instanceof Error
        ? err.message
        : "Error subiendo certificado"
    );

    throw err;

  } finally {
    setLoading(false);
  }
};

  const removeCertificate = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      return await professionalApi.deleteCertificate(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error eliminando certificado");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // --- Profile updates en Redux ---
 const updateProfessionalProfile = async (data: {
  name?: string;
  lastName?: string;
  phone?: string;
  description?: string;
}) => {
  setLoading(true);
  setError(null);

  try {
    const updatedUser = await usersApi.updateProfile(data);

    dispatch(updateProfile(updatedUser));

    return updatedUser;
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Error actualizando perfil");
    throw err;
  } finally {
    setLoading(false);
  }
};

  return {
    loading,
    error,
    addSocialLink,
    editSocialLink,
    removeSocialLink,
    addCertificate,
    removeCertificate,
    updateProfessionalProfile,
  };
};