"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface ArtisanContextType {
  artisanId: string | null;
  profileName: string;
  profilePhone: string;
  userRole: string;
  setProfileName: (name: string) => void;
  setUserRole: (role: string) => void;
  saveProfile: (newName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const ArtisanContext = createContext<ArtisanContextType | undefined>(undefined);

export function ArtisanProvider({ children }: { children: React.ReactNode }) {
  const [artisanId, setArtisanId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [userRole, setUserRole] = useState("customer");
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        if (mounted) setArtisanId(session.user.id);
        const { data } = await supabase
          .from('artisans')
          .select('full_name, phone_number, user_role')
          .eq('id', session.user.id)
          .single();
          
        if (data && mounted) {
          setProfileName(data.full_name || "New Artisan");
          setProfilePhone(data.phone_number || "");
          setUserRole(data.user_role || "customer");
        }
      }
      if (mounted) setIsLoading(false);
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (mounted) setArtisanId(session.user.id);
        const { data } = await supabase
          .from('artisans')
          .select('full_name, phone_number, user_role')
          .eq('id', session.user.id)
          .single();
        if (data && mounted) {
          setProfileName(data.full_name || "New Artisan");
          setProfilePhone(data.phone_number || "");
          setUserRole(data.user_role || "customer");
        }
      } else {
        if (mounted) {
          setArtisanId(null);
          setProfileName("");
          setProfilePhone("");
          setUserRole("customer");
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const saveProfile = async (newName: string) => {
    if (!artisanId) return false;
    
    // Call Supabase update
    const { error } = await supabase
      .from('artisans')
      .update({ full_name: newName })
      .eq('id', artisanId);
      
    if (!error) {
      setProfileName(newName);
      return true;
    } else {
      console.error("Failed to update profile", error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setArtisanId(null);
    setProfileName("");
    setProfilePhone("");
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('artisans')
        .select('full_name, phone_number, user_role')
        .eq('id', session.user.id)
        .single();
        
      if (data) {
        setProfileName(data.full_name || "New Artisan");
        setProfilePhone(data.phone_number || "");
        setUserRole(data.user_role || "customer");
      }
    }
  };

  return (
    <ArtisanContext.Provider value={{ artisanId, profileName, profilePhone, userRole, setProfileName, setUserRole, saveProfile, logout, refreshProfile, isLoading }}>
      {children}
    </ArtisanContext.Provider>
  );
}

export function useArtisan() {
  const context = useContext(ArtisanContext);
  if (context === undefined) {
    throw new Error("useArtisan must be used within an ArtisanProvider");
  }
  return context;
}
