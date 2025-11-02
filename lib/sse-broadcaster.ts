type SSEClient = {
  controller: ReadableStreamDefaultController;
  organizationId: string;
};

class SSEBroadcaster {
  private invitationClients: Map<string, Set<SSEClient>> = new Map();
  private tamagotchiClients: Map<string, Set<SSEClient>> = new Map();
  private todoClients: Map<string, Set<SSEClient>> = new Map();

  addInvitationClient(email: string, client: SSEClient) {
    if (!this.invitationClients.has(email)) {
      this.invitationClients.set(email, new Set());
    }
    this.invitationClients.get(email)?.add(client);
  }

  removeInvitationClient(email: string, client: SSEClient) {
    const emailClients = this.invitationClients.get(email);
    if (emailClients) {
      emailClients.delete(client);
      if (emailClients.size === 0) {
        this.invitationClients.delete(email);
      }
    }
  }

  addTamagotchiClient(organizationId: string, client: SSEClient) {
    if (!this.tamagotchiClients.has(organizationId)) {
      this.tamagotchiClients.set(organizationId, new Set());
    }
    this.tamagotchiClients.get(organizationId)?.add(client);
  }

  removeTamagotchiClient(organizationId: string, client: SSEClient) {
    const orgClients = this.tamagotchiClients.get(organizationId);
    if (orgClients) {
      orgClients.delete(client);
      if (orgClients.size === 0) {
        this.tamagotchiClients.delete(organizationId);
      }
    }
  }

  addTodoClient(organizationId: string, client: SSEClient) {
    if (!this.todoClients.has(organizationId)) {
      this.todoClients.set(organizationId, new Set());
    }
    this.todoClients.get(organizationId)?.add(client);
  }

  removeTodoClient(organizationId: string, client: SSEClient) {
    const orgClients = this.todoClients.get(organizationId);
    if (orgClients) {
      orgClients.delete(client);
      if (orgClients.size === 0) {
        this.todoClients.delete(organizationId);
      }
    }
  }

  notifyInvitation(email: string) {
    const emailClients = this.invitationClients.get(email);
    if (emailClients && emailClients.size > 0) {
      const encoder = new TextEncoder();
      const message = encoder.encode(
        `data: ${JSON.stringify({ type: "refresh" })}\n\n`
      );

      emailClients.forEach((client) => {
        try {
          client.controller.enqueue(message);
        } catch (error) {
          console.error("Error sending SSE message:", error);
          this.removeInvitationClient(email, client);
        }
      });
    }
  }

  notifyTamagotchi(organizationId: string) {
    const orgClients = this.tamagotchiClients.get(organizationId);
    if (orgClients && orgClients.size > 0) {
      const encoder = new TextEncoder();
      const message = encoder.encode(
        `data: ${JSON.stringify({ type: "refresh" })}\n\n`
      );

      orgClients.forEach((client) => {
        try {
          client.controller.enqueue(message);
        } catch (error) {
          console.error("Error sending SSE message:", error);
          this.removeTamagotchiClient(organizationId, client);
        }
      });
    }
  }

  notifyTodos(organizationId: string) {
    const orgClients = this.todoClients.get(organizationId);
    if (orgClients && orgClients.size > 0) {
      const encoder = new TextEncoder();
      const message = encoder.encode(
        `data: ${JSON.stringify({ type: "refresh" })}\n\n`
      );

      orgClients.forEach((client) => {
        try {
          client.controller.enqueue(message);
        } catch (error) {
          console.error("Error sending SSE message:", error);
          this.removeTodoClient(organizationId, client);
        }
      });
    }
  }

  getClientCount(): number {
    let count = 0;
    this.invitationClients.forEach((clients) => {
      count += clients.size;
    });
    this.tamagotchiClients.forEach((clients) => {
      count += clients.size;
    });
    this.todoClients.forEach((clients) => {
      count += clients.size;
    });
    return count;
  }
}

export const sseBroadcaster = new SSEBroadcaster();
