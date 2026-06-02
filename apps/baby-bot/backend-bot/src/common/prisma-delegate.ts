/** Minimal structural type for a Prisma detail-model delegate, used when the
 * model is selected dynamically by event type (so it isn't statically known). */
export interface DetailDelegate {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<unknown>;
}

/** Access a Prisma model delegate by name without resorting to `any`. */
export function detailDelegate(client: object, name: string): DetailDelegate {
  return (client as unknown as Record<string, DetailDelegate>)[name];
}
