export class RoleChangedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly oldRoleId: string | null,
    public readonly newRoleId: string,
    public readonly changedById: string,
  ) {}
}
