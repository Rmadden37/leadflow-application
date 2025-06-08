import type { UserRole, LeadStatus, DispatchType } from '@/types';

describe('Type definitions', () => {
  it('should define valid UserRole types', () => {
    const validRoles: UserRole[] = ['setter', 'closer', 'manager'];
    
    expect(validRoles).toContain('setter');
    expect(validRoles).toContain('closer');
    expect(validRoles).toContain('manager');
    expect(validRoles).toHaveLength(3);
  });

  it('should define valid LeadStatus types', () => {
    const validStatuses: LeadStatus[] = [
      'waiting_assignment',
      'in_process', 
      'sold',
      'no_sale',
      'canceled',
      'rescheduled',
      'scheduled',
      'credit_fail'
    ];
    
    expect(validStatuses).toContain('waiting_assignment');
    expect(validStatuses).toContain('sold');
    expect(validStatuses).toHaveLength(8);
  });

  it('should define valid DispatchType types', () => {
    const validTypes: DispatchType[] = ['immediate', 'scheduled'];
    
    expect(validTypes).toContain('immediate');
    expect(validTypes).toContain('scheduled');
    expect(validTypes).toHaveLength(2);
  });
});
