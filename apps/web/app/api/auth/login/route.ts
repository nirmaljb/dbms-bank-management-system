import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  loginSchema,
  userStore,
  comparePassword,
  signToken,
  COOKIE_NAME,
  getAuthCookieOptions,
} from '../../../../lib/server-auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid email or password' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await userStore.findByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
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
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
