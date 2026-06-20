'use server';

import { query } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createMember(formData: {
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  joined_at?: string;
  notes?: string;
  status: string;
  plan_id?: string;
  custom_price?: number;
}) {
  try {
    // 1. Create profile directly
    const profileId = crypto.randomUUID();
    await query(
      'INSERT INTO profiles (id, full_name, phone, email, role) VALUES ($1, $2, $3, $4, $5)',
      [profileId, formData.full_name, formData.phone || null, formData.email || '', 'member']
    );

    // 2. Create member record
    const createdAt = formData.joined_at ? new Date(formData.joined_at).toISOString() : new Date().toISOString();
    const { rows: memberRows } = await query(
      `INSERT INTO members (profile_id, date_of_birth, gender, notes, status, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [profileId, formData.date_of_birth || null, formData.gender || null, formData.notes || null, formData.status, createdAt]
    );
    const newMemberId = memberRows[0].id;

    // 3. Assign plan + record payment if selected
    if (formData.plan_id && newMemberId) {
      const { rows: planRows } = await query(
        'SELECT price, duration_days, name FROM membership_plans WHERE id = $1 LIMIT 1',
        [formData.plan_id]
      );
      const plan = planRows[0];

      if (plan) {
        // Use joined_at as start date if provided, otherwise today
        const start = formData.joined_at ? new Date(formData.joined_at) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + plan.duration_days);

        await query(
          'INSERT INTO memberships (member_id, plan_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5)',
          [newMemberId, formData.plan_id, start.toISOString().split('T')[0], end.toISOString().split('T')[0], 'active']
        );

        const paymentAmount = formData.custom_price !== undefined ? formData.custom_price : plan.price;

        await query(
          'INSERT INTO payments (member_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5)',
          [newMemberId, paymentAmount, 'cash', start.toISOString().split('T')[0], `Initial plan: ${plan.name}`]
        );
      }
    }

    revalidatePath('/members');
    return { success: true, memberId: newMemberId };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateMember(
  memberId: string,
  profileId: string,
  formData: {
    full_name: string;
    phone: string;
    date_of_birth?: string;
    gender?: string;
    notes?: string;
    status: string;
  }
) {
  try {
    await query(
      'UPDATE profiles SET full_name = $1, phone = $2 WHERE id = $3',
      [formData.full_name, formData.phone || null, profileId]
    );

    await query(
      'UPDATE members SET date_of_birth = $1, gender = $2, notes = $3, status = $4 WHERE id = $5',
      [formData.date_of_birth || null, formData.gender || null, formData.notes || null, formData.status, memberId]
    );

    revalidatePath(`/members/${memberId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function renewMembership(
  memberId: string,
  formData: {
    plan_id: string;
    start_date: string;
    record_payment: boolean;
    payment_method: string;
    custom_price?: number;
  }
) {
  try {
    const { rows: planRows } = await query(
      'SELECT * FROM membership_plans WHERE id = $1 LIMIT 1',
      [formData.plan_id]
    );
    const plan = planRows[0];

    if (!plan) return { error: 'Plan not found' };

    const start = new Date(formData.start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.duration_days);

    // Expire old active memberships
    await query(
      "UPDATE memberships SET status = 'expired' WHERE member_id = $1 AND status = 'active'",
      [memberId]
    );

    // Create new membership
    await query(
      'INSERT INTO memberships (member_id, plan_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5)',
      [memberId, formData.plan_id, start.toISOString().split('T')[0], end.toISOString().split('T')[0], 'active']
    );

    // Update member status
    await query(
      "UPDATE members SET status = 'active' WHERE id = $1",
      [memberId]
    );

    // Record payment
    if (formData.record_payment) {
      const paymentAmount = formData.custom_price !== undefined && !isNaN(formData.custom_price)
        ? formData.custom_price 
        : plan.price;
        
      await query(
        'INSERT INTO payments (member_id, amount, payment_method, payment_date, notes) VALUES ($1, $2, $3, $4, $5)',
        [memberId, paymentAmount, formData.payment_method, start.toISOString().split('T')[0], `Subscription renewal — ${plan.name}`]
      );
    }

    revalidatePath(`/members/${memberId}`);
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteMember(memberId: string) {
  try {
    await query('DELETE FROM members WHERE id = $1', [memberId]);
    revalidatePath('/members');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function autoExpireMemberships() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { rows: expiredMemberships } = await query(
      "UPDATE memberships SET status = 'expired' WHERE status = 'active' AND end_date < $1 RETURNING member_id",
      [today]
    );

    const expiredMemberIds = Array.from(new Set(expiredMemberships.map(m => m.member_id)));

    if (expiredMemberIds.length > 0) {
      for (const memberId of expiredMemberIds) {
        await query(
          "UPDATE members SET status = 'expired' WHERE id = $1 AND status != 'expired'",
          [memberId]
        );
      }
    }
    return { success: true, count: expiredMemberIds.length };
  } catch (error: any) {
    return { error: error.message };
  }
}
