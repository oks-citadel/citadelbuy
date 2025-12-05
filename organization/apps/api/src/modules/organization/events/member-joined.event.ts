export class MemberJoinedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly invitedById: string,
  ) {}
}
