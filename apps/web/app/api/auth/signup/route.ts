import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  signupSchema,
  userStore,
  hashPassword,
  signToken,
  COOKIE_NAME,
  getAuthCookieOptions,
} from '../../../../lib/server-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { name, email, password, accountNumber, cifNumber } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await userStore.findByEmail(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await userStore.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role: 'customer',
      accountNumber,
      cifNumber,
    });

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      accountNumber: user.accountNumber,
      cifNumber: user.cifNumber,
    });

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, getAuthCookieOptions());

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountNumber: user.accountNumber,
          cifNumber: user.cifNumber,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
