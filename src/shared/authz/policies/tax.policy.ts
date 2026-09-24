import { ActorContext } from '../authz.types';

export class TaxPolicy {
  /**
   * Only Admin or Super Admin can create or update jurisdiction tax rules.
   */
  static canManageTaxRules(actor: ActorContext): boolean {
    return actor.roles.includes('ADMIN') || actor.roles.includes('SUPER_ADMIN');
  }

  /**
   * Anyone (authenticated or public) can execute tax calculations or read active tax rules.
   */
  static canReadTaxRules(): boolean {
    return true;
  }
}
