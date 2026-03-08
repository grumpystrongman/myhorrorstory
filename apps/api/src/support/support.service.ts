import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export interface SupportTicket {
  id: string;
  email: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
}

@Injectable()
export class SupportService {
  private readonly tickets: SupportTicket[] = [];

  create(input: { email: string; subject: string; message: string }): SupportTicket {
    const ticket: SupportTicket = {
      id: randomUUID(),
      email: input.email,
      subject: input.subject,
      message: input.message,
      status: 'OPEN',
      createdAt: new Date().toISOString()
    };

    this.tickets.push(ticket);
    return ticket;
  }

  list(): SupportTicket[] {
    return this.tickets;
  }
}
