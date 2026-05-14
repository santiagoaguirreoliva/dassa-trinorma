import { createContext, useContext } from "react";

export interface LayoutCtx {
  openSidebar: () => void;
  closeSidebar: () => void;
  isSidebarOpen: boolean;
}

export const LayoutContext = createContext<LayoutCtx>({
  openSidebar: () => {},
  closeSidebar: () => {},
  isSidebarOpen: false,
});

export const useLayout = () => useContext(LayoutContext);
