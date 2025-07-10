"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/supabase-auth-provider";
import { supabase } from "@/lib/supabase";

export default function AdminSetupPage() {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const { user } = useAuth();
  const router = useRouter();

  const addLog = (message: string) => {
    setOutput((prev) => [...prev, message]);
  };

  const setupAdmin = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);
    addLog(`Starting admin setup for user ID: ${user.id}...`);

    try {
      // Step 1: Check if the profiles table exists
      addLog("Checking profiles table...");
      const { error: tableCheckError } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

      if (tableCheckError) {
        addLog("❌ Error: profiles table doesn't exist or is not accessible!");
        toast.error("Profiles table not found");
        setLoading(false);
        return;
      }

      addLog("✅ Profiles table exists!");

      // Step 2: Try to update the user's role to check if the column exists
      addLog("Checking if role column exists...");
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin" })
        .eq("id", user.id);

      if (updateError) {
        // Likely the column doesn't exist
        if (updateError.message.includes("column") && updateError.message.includes("does not exist")) {
          addLog("❌ Role column doesn't exist. Adding it now...");
          
          // For security reasons, we'll use the API route to add the column
          addLog("Using API to add role column...");
          const response = await fetch("/api/setup-admin-schema");
          
          if (!response.ok) {
            const error = await response.json();
            addLog(`❌ API Error: ${error.error}`);
            addLog("Please add the role column manually through Supabase dashboard.");
            addLog(`
              1. Go to your Supabase dashboard
              2. Navigate to "Table Editor" 
              3. Select the "profiles" table
              4. Click "Edit table"
              5. Add a new column:
                 - Name: 'role'
                 - Type: 'text'
                 - Default Value: 'user'
              6. Save the changes
              7. Then run the following SQL in the SQL Editor:
                 UPDATE profiles SET role = 'admin' WHERE id = '${user.id}';
            `);
            toast.error("Failed to add role column");
            setLoading(false);
            return;
          }
          
          const result = await response.json();
          if (result.success) {
            addLog("✅ Role column added successfully!");
            addLog("✅ Your account has been set as admin!");
          } else {
            addLog(`❌ API Error: ${result.error}`);
            return;
          }
        } else {
          addLog(`❌ Unexpected error: ${updateError.message}`);
          toast.error("Unexpected error");
          setLoading(false);
          return;
        }
      } else {
        addLog("✅ Role column exists and your account has been set as admin!");
      }

      addLog("✅ Setup completed successfully!");
      addLog("You can now use the admin features.");
      addLog("Please go to the admin content page to verify.");
      
      toast.success("Admin setup completed!");

    } catch (error) {
      console.error("Setup error:", error);
      addLog(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      toast.error("Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Setup</h1>
      
      <div className="bg-card border rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
        <p className="mb-4">
          This page will help you set up admin privileges by adding the necessary column to your database.
        </p>
        <p className="mb-4">
          Current user ID: <code className="bg-muted px-2 py-1 rounded">{user?.id || "Not logged in"}</code>
        </p>
        <Button 
          onClick={setupAdmin} 
          disabled={loading || !user}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : (
            "Set up admin role"
          )}
        </Button>
      </div>
      
      {output.length > 0 && (
        <div className="bg-black text-green-400 rounded-lg p-4 font-mono text-sm">
          <div className="mb-2 font-bold text-white">Setup Log:</div>
          {output.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap mb-1">
              {line}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to Home
        </Button>
        <Button onClick={() => router.push("/admin/content")}>
          Go to Admin Content
        </Button>
      </div>
    </div>
  );
} 