// src/hooks/users/useUserProfile.ts
import { useState } from "react";
import { usersApi } from "@/api/users.api";

export const useUserProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeEmail = async (currentPassword: string, newEmail: string) => {
    setLoading(true);
    setError(null);
    
    try {
      return await usersApi.changeEmail(currentPassword, newEmail);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error changing email";

      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
  ) => {
    setLoading(true);
    try {
      return await usersApi.changePassword(currentPassword, newPassword);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateAvatarHook = async (file: File) => {
    setLoading(true);
    try {
      const avatarUrl = await usersApi.updateAvatar(file);
      return avatarUrl;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: {
    name?: string;
    lastName?: string;
    phone?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      return await usersApi.updateProfile(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Error updating profile";

      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    changeEmail,
    changePassword,
    updateAvatarHook,
    updateProfile,
  };
};
