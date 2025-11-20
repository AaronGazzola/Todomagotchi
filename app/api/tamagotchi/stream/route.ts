import { getAuthenticatedClient } from "@/lib/auth.utils";
import { sseBroadcaster } from "@/lib/sse-broadcaster";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const { session } = await getAuthenticatedClient();

    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrganizationId: true },
    });

    const activeOrganizationId = user?.activeOrganizationId;

    if (!activeOrganizationId) {
      return new Response("No active organization", { status: 400 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const client = { controller, organizationId: activeOrganizationId };
        sseBroadcaster.addTamagotchiClient(activeOrganizationId, client);

        const sendTamagotchi = async () => {
          try {
            const tamagotchi = await prisma.tamagotchi.findUnique({
              where: { organizationId: activeOrganizationId },
            });

            const data = JSON.stringify(tamagotchi);
            if (!closed) {
              try {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch (enqueueError) {
                closed = true;
              }
            }
          } catch (error) {
            console.error("Error fetching tamagotchi:", error);
          }
        };

        await sendTamagotchi();

        const intervalId = setInterval(sendTamagotchi, 5000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(intervalId);
          sseBroadcaster.removeTamagotchiClient(activeOrganizationId, client);
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        request.signal.dispatchEvent(new Event("abort"));
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("SSE error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
