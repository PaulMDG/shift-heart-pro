import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";
const LOGO_PATH = "/logo.png";
const PRODUCTION_URL = `https://shift-heart-pro.lovable.app${LOGO_PATH}`;
const PREVIEW_URL = `https://id-preview--6b505da8-bffd-4d1b-bb16-35dbe437ffc9.lovable.app${LOGO_PATH}`;

const AdminStatus = () => {
  const navigate = useNavigate();
  const [logoLoaded, setLogoLoaded] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setLogoLoaded(true);
    img.onerror = () => setLogoLoaded(false);
    img.src = LOGO_PATH;
  }, []);

  return (
    <MobileLayout>
      <div className="px-5 py-5 space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/settings")}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-accent-foreground" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">System Status</h2>
            <p className="text-xs text-muted-foreground">Asset health & logo verification</p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="p-4 pb-2 flex flex-row items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm">Auth Logo Asset</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Local URL</p>
              <p className="text-xs font-mono text-foreground break-all">{LOGO_PATH}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Production URL</p>
              <p className="text-xs font-mono text-foreground break-all">{PRODUCTION_URL}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Preview URL</p>
              <p className="text-xs font-mono text-foreground break-all">{PREVIEW_URL}</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {logoLoaded === null ? (
                <span className="text-xs text-muted-foreground">Checking…</span>
              ) : logoLoaded ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">Logo loads successfully in this environment</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-xs font-medium text-destructive">Logo failed to load in this environment</span>
                </>
              )}
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Rendered preview</p>
              <img
                src={LOGO_PATH}
                alt="Auth logo"
                className="h-24 w-auto object-contain"
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoLoaded(false)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
};

export default AdminStatus;
