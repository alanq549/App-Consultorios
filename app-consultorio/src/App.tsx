import AppRouter from "./routes/AppRouter"
import { useAuthInit } from '@/hooks/auth/useAuthInit'

function App() {
  useAuthInit()
  return <AppRouter />
}

export default App
