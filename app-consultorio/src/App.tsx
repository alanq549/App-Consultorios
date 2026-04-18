import { Toaster } from "react-hot-toast"
import AppRouter from "./routes/AppRouter"
import { useAuthInit } from '@/hooks/auth/useAuthInit'

function App() {
  useAuthInit()

  return (
    <>
      <Toaster position="top-right" toastOptions={{
          success: {
            style: {
              background: "#16a34a",
              color: "#fff",
              fontWeight: 600,
              borderRadius: "12px",
              padding: "12px 16px",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#16a34a",
            },
          },
          error: {
            style: {
              background: "#dc2626",
              color: "#fff",
            },
          },

          style: {
            fontSize: "14px",
            borderRadius: "12px",
          },
        }}
      />
      <AppRouter />
    </>
  )
}

export default App