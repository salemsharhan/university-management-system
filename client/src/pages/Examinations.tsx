import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import UniversityLayout from "@/components/UniversityLayout";
import { useState } from "react";

export default function Examinations() {
  const { t, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  
  // API not yet implemented
  const items: any[] = [];
  const isLoading = false;

  if (isLoading) {
    return (
      <UniversityLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
      </UniversityLayout>
    );
  }

  return (
    <UniversityLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("examinations")}</h1>
          </div>
          <Button>
            <Plus className="w-4 h-4 me-2" />
            {t("add_new")}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <p>{t("examinations")} - {t("loading")}</p>
              <p className="text-sm mt-2">Total items: {items?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </UniversityLayout>
  );
}
