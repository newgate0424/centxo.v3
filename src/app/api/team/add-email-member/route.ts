/**
 * POST /api/team/add-email-member
 * Add a team member by email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, name } = await request.json();

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if email already exists in team
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        memberEmail: email,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'This email is already in your team' },
        { status: 400 }
      );
    }

    // Create team member
    const teamMember = await prisma.teamMember.create({
      data: {
        userId: session.user.id,
        memberType: 'email',
        memberEmail: email,
        memberName: name,
        role: 'MEMBER',
      },
    });

    return NextResponse.json({
      success: true,
      member: {
        id: teamMember.id,
        memberType: teamMember.memberType,
        memberEmail: teamMember.memberEmail,
        memberName: teamMember.memberName,
        role: teamMember.role,
        addedAt: teamMember.addedAt,
      },
    });
  } catch (error) {
    console.error('Error adding email team member:', error);
    return NextResponse.json(
      { error: 'Failed to add team member' },
      { status: 500 }
    );
  }
}
