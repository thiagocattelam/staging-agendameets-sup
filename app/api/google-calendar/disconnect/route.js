import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.atendenteId) {
    return Response.json({ ok: false }, { status: 401 });
  }

  await prisma.$transaction([
    prisma.googleCredencial.deleteMany({ where: { atendenteId: session.atendenteId } }),
    prisma.atendente.update({
      where: { id: session.atendenteId },
      data: { googleCalendarConectado: false },
    }),
  ]);

  return Response.json({ ok: true });
}
