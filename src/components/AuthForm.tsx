import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
}

export const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          to: userEmail,
          subject: "Benvenuto in Metodi Res Builder! 🚀",
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Benvenuto in Metodi Res Builder</h1>
              </div>
              <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333;">Ciao <strong>${userName || ""}!</strong></p>
                <p style="font-size: 15px; color: #555; line-height: 1.6;">
                  Grazie per esserti registrato! La tua piattaforma per avviare l'attività di reseller energia elettrica in Italia è pronta.
                </p>
                <h3 style="color: #1a1a2e; margin-top: 24px;">Cosa puoi fare ora:</h3>
                <ul style="font-size: 14px; color: #555; line-height: 2;">
                  <li>📋 Creare il tuo primo progetto</li>
                  <li>📊 Simulare ricavi e costi</li>
                  <li>✅ Seguire il processo guidato step-by-step</li>
                  <li>📄 Generare il plico contrattuale</li>
                </ul>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="${window.location.origin}/app" style="background: #3b82f6; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
                    Accedi alla piattaforma →
                  </a>
                </div>
                <p style="font-size: 13px; color: #999; margin-top: 30px; text-align: center;">
                  Hai bisogno di aiuto? Rispondi a questa email o consulta le FAQ nella piattaforma.
                </p>
              </div>
              <div style="background: #f8f9fa; padding: 16px; text-align: center; border-radius: 0 0 8px 8px;">
                <p style="font-size: 12px; color: #999; margin: 0;">© ${new Date().getFullYear()} Metodi Res Builder — metodi.pro</p>
              </div>
            </div>
          `,
        },
      });
    } catch (err) {
      console.error("Errore invio email di benvenuto:", err);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Email inviata",
        description: "Controlla la tua casella di posta per il link di reset password.",
        duration: 8000,
      });
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Accesso effettuato",
          description: "Benvenuto in Metodi Res Builder!",
        });
        onSuccess();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: fullName,
            },
          },
        });

        if (error) throw error;

        sendWelcomeEmail(email, fullName);

        toast({
          title: "Registrazione completata",
          description: "Ti abbiamo inviato un'email di verifica. Controlla la tua casella di posta e clicca sul link per attivare il tuo account.",
          duration: 10000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (mode === "forgot") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3 justify-center">
              <img src="/favicon.png" alt="Metodi Res Builder" className="h-10 w-10 rounded-lg" />
              <CardTitle className="text-2xl">Reset Password</CardTitle>
            </div>
            <CardDescription>
              Inserisci la tua email per ricevere un link di reset password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Invio in corso..." : "Invia link di reset"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode("login")}
              >
                Torna al login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3 justify-center">
            <img src="/favicon.png" alt="Metodi Res Builder" className="h-10 w-10 rounded-lg" />
            <div>
              <CardTitle className="text-2xl">Metodi Res Builder</CardTitle>
            </div>
          </div>
          <CardDescription>
            {mode === "login" ? "Accedi al tuo account" : "Crea un nuovo account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Mario Rossi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={mode === "register"}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@esempio.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setMode("forgot")}
                  >
                    Password dimenticata?
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Caricamento..." : mode === "login" ? "Accedi" : "Registrati"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
