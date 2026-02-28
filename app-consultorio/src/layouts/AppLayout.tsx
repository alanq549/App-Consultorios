// src/layouts/AppLayout.tsx
import { Outlet } from "react-router-dom";


export const AppLayout = () => {

  return (
    < div>
      <Outlet />
    </div>
  );
};
