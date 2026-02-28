import { useState } from "react";
import { useProfileData } from "@/hooks/useProfileData";
import { updateProfessionalProfileWithFiles } from "@/features/professionals/professional.api";
import type { ProfessionalProfile, User } from "@/features/professionals/types"; // asume que tienes tipo para profesionales

const allowedSocials = [
  "portfolio",
  "whatsApp",
  "Instagram",
  "Facebook",
  "Telegram",
  "TikTok",
] as const;

type SocialKey = (typeof allowedSocials)[number];

export const useEditProfile = (onClose: () => void) => {
  const { profile } = useProfileData() as {
    profile: (ProfessionalProfile & { user: User & { phone?: string } }) | undefined;
  };

  const [name, setName] = useState(profile?.user?.name ?? "");
  const [lastName, setLastName] = useState(profile?.user?.lastName ?? "");
  const [phone, setPhone] = useState(profile?.user?.phone ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [description, setDescription] = useState(profile?.description ?? "");
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    profile?.socialLinks ?? {}
  );
  const [certificates, setCertificates] = useState<string[]>(profile?.certificates ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [newSocialKey, setNewSocialKey] = useState<SocialKey>("portfolio");
  const [newSocialUrl, setNewSocialUrl] = useState("");

  const handleAddSocial = () => {
    if (!newSocialUrl.trim()) return;
    if (socialLinks[newSocialKey]) {
      alert(`Ya tienes un link para ${newSocialKey}`);
      return;
    }
    setSocialLinks({ ...socialLinks, [newSocialKey]: newSocialUrl.trim() });
    setNewSocialUrl("");
  };

  const handleRemoveSocial = (key: string) => {
    const updated = { ...socialLinks };
    delete updated[key];
    setSocialLinks(updated);
  };

  const handleRemoveCertificate = (url: string) => {
    setCertificates(certificates.filter((c) => c !== url));
  };

  const handleNewFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewFiles(Array.from(e.target.files));
    }
  };

  const handleSave = async () => {
    try {
      const formData = new FormData();

      // Campos de user
      formData.append("name", name);
      formData.append("lastName", lastName);
      formData.append("phone", phone);
      if (avatarFile) formData.append("avatar", avatarFile);

      formData.append("description", description);
      formData.append("socialLinks", JSON.stringify(socialLinks));
      formData.append("certificates", JSON.stringify(certificates));
      newFiles.forEach((file) => formData.append("certificates", file));
      await updateProfessionalProfileWithFiles(formData);
      onClose();
    } catch (err) {
      console.error("Error al actualizar:", err);
    }
  };

  return {
    setName,
    name,
    setLastName,
    lastName,
    setPhone,
    avatarFile,
    setAvatarFile,
    phone,
    description,
    setDescription,
    socialLinks,
    setSocialLinks,
    certificates,
    setCertificates,
    newFiles,
    setNewFiles,
    newSocialKey,
    setNewSocialKey,
    newSocialUrl,
    setNewSocialUrl,
    handleAddSocial,
    handleRemoveSocial,
    handleRemoveCertificate,
    handleNewFilesChange,
    handleSave,
    allowedSocials,
  };
}
