import Application from "@/components/application";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "login",
      "register",
      "overview",
      "workspace",
      "library",
      "upload",
      "rag",
      "detector",
      "verification",
      "correction",
      "history",
      "reports",
      "analytics",
      "audit",
      "settings",
      "profile",
    ].includes(section)
  )
    notFound();
  return <Application section={section} />;
}
