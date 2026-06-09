"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface LANContextType {
  lanIp: string;
  setLanIp: (ip: string) => void;
  isLanMode: boolean;
  setIsLanMode: (mode: boolean) => void;
}

const LANContext = createContext<LANContextType | undefined>(undefined);

export function LANProvider({ children }: { children: React.ReactNode }) {
  const [lanIp, setLanIpState] = useState("");
  const [isLanMode, setIsLanModeState] = useState(false);

  useEffect(() => {
    // Load initial state from localStorage
    const savedIp = localStorage.getItem("lanIp");
    const savedMode = localStorage.getItem("isLanMode");
    if (savedIp) setLanIpState(savedIp);
    if (savedMode === "true") setIsLanModeState(true);
  }, []);

  const setLanIp = (ip: string) => {
    setLanIpState(ip);
    localStorage.setItem("lanIp", ip);
  };

  const setIsLanMode = (mode: boolean) => {
    setIsLanModeState(mode);
    localStorage.setItem("isLanMode", mode.toString());
  };

  return (
    <LANContext.Provider value={{ lanIp, setLanIp, isLanMode, setIsLanMode }}>
      {children}
    </LANContext.Provider>
  );
}

export function useLAN() {
  const context = useContext(LANContext);
  if (!context) {
    throw new Error("useLAN must be used within a LANProvider");
  }
  return context;
}
