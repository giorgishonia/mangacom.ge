"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/supabase-auth-provider";
import { Loader2 } from "lucide-react";

/**
 * Component that runs maintenance tasks in the background on app startup.
 * It doesn't render anything visible to the user.
 */
export function MaintenanceRunner() {
  // Run maintenance only for admins to avoid unnecessary load & potential errors
  const { isAdmin } = useAuth();

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip if not admin or already executed
    if (!isAdmin || isRunning || result) return;
    
    const runMaintenance = async () => {
      setIsRunning(true);
      try {
        // Run the maintenance endpoint
        console.log("Running database maintenance tasks...");
        const response = await fetch("/api/setup/maintenance");
        
        if (!response.ok) {
          throw new Error(`Maintenance failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Maintenance completed:", data);
        setResult(data);
        
        // Log any failed operations
        if (data.operations) {
          const failedOps = data.operations.filter((op: any) => !op.success);
          if (failedOps.length > 0) {
            console.warn("Some maintenance operations failed:", failedOps);
          }
        }
      } catch (err) {
        console.error("Error running maintenance:", err);
        setError(String(err));
      } finally {
        setIsRunning(false);
      }
    };
    
    // Run after a short delay to prioritize app rendering
    const timer = setTimeout(() => {
      runMaintenance();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isAdmin, isRunning, result]);

  // This component doesn't render anything visible
  return null;
} 