import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const brands = await prisma.brandMembership.findMany({
    where: { userId: session.user.id },
    include: { brand: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const brandList = brands.map((m) => m.brand);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar brands={brandList} />
      <main className="flex-1 ml-64 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
