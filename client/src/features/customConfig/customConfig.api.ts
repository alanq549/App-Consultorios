import axios from "@/services/axios";

export const getConfig = async () => {
  const { data } = await axios.get("/config");
  return data;
};

export const updateConfig = async (payload: Partial<{ layout: string; theme: string }>) => {
  const { data } = await axios.patch("/config", payload);
  return data;
};
