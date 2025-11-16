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

    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const userEmail = session.user.email;

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;
        const client = { controller, organizationId: "" };
        sseBroadcaster.addInvitationClient(userEmail, client);

        const sendInvitations = async () => {
          try {
            const invitations = await prisma.invitation.findMany({
              where: {
                email: userEmail,
                status: "pending",
                expiresAt: {
                  gt: new Date(),
                },
              },
              include: {
                organization: true,
                inviter: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            });

            const data = JSON.stringify(invitations);
            if (!closed) {
              try {
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              } catch (enqueueError) {
                closed = true;
              }
            }
          } catch (error) {
            console.error("Error fetching invitations:", error);
          }
        };

        await sendInvitations();

        const intervalId = setInterval(sendInvitations, 5000);

        request.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(intervalId);
          sseBroadcaster.removeInvitationClient(userEmail, client);
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
