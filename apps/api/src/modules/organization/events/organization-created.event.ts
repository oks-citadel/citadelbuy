export class OrganizationCreatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly ownerId: string,
  ) {}
}
