import { createHmac, timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { MicroCMSWebhookPayload } from "@/types/webhook";

export const dynamic = "force-dynamic";

function verifySignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(body).digest("hex");

  if (signature.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(request: Request) {
  const secret = process.env.MICROCMS_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { message: "MICROCMS_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const body = await request.text();
  const signature =
    request.headers.get("x-microcms-signature") ??
    request.headers.get("X-MICROCMS-Signature");

  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let payload: MicroCMSWebhookPayload;

  try {
    payload = JSON.parse(body) as MicroCMSWebhookPayload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (payload.api !== "blogs") {
    return NextResponse.json({ message: "Ignored API", api: payload.api });
  }

  const revalidatedPaths: string[] = [];

  revalidatePath("/");
  revalidatedPaths.push("/");

  if (payload.id) {
    revalidatePath(`/blog/${payload.id}`);
    revalidatedPaths.push(`/blog/${payload.id}`);
  }

  return NextResponse.json({
    revalidated: true,
    type: payload.type,
    paths: revalidatedPaths,
  });
}
