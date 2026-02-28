// // src/hooks/useSyncLanguage.ts
// import { useEffect } from "react";
// import { useAppSelector } from "@/hooks/redux";
// import i18n from "@/i18n";

// export function useSyncLanguage() {
//   const language = useAppSelector(
//     (state) => state.auth.user?.config?.language || "es"
//   );

//   useEffect(() => {
//     if (i18n.language !== language) {
//       i18n.changeLanguage(language);
//     }
//   }, [language]);
// }
