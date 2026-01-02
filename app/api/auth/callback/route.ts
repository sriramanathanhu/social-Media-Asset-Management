import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const authCode = searchParams.get("auth_code");

  try {
    if (!authCode) {
      console.error("No auth_code found in query parameters");
      return new Response("Missing auth_code", { status: 400 });
    }

    const res = await fetch(
      `${process.env.NEXT_AUTH_URL}/auth/session/exchange-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.NEXT_AUTH_CLIENT_ID,
          client_secret: process.env.AUTH_CLIENT_SECRET,
          code: authCode,
        }),
      },
    );

    const data = await res.json();

    if (res.status !== 200) {
      return new Response(data.message, { status: 500 });
    }

    const cookieStore = await cookies();

    // set cookie with the token
    cookieStore.set({
      name: "nandi_session_token",
      value: data.session_token,
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: true,
      maxAge: 60 * 60 * 24, // 1 day
    });

    // redirect to home page after successful authentication
    return Response.redirect(`${process.env.NEXT_BASE_URL}`, 302);
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
