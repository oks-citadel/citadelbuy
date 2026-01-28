export class MemberRemovedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly removedById: string,
  ) {}
}
